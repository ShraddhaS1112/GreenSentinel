/**
 * Green Sentinel - Health Analysis Lambda Handler
 *
 * Fetches NDVI data from Sentinel Hub, calculates crop health scores,
 * generates heatmaps, and triggers alerts for significant changes.
 */

import { ScheduledEvent, Context } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import {
  HealthScore,
  Farm,
  Language,
  AuditEventType,
} from '@green-sentinel/shared';
import { AWS_RESOURCES, THRESHOLDS } from '@green-sentinel/shared';
import { formatDateISO, hasSignificantChange } from '@green-sentinel/shared';
import {
  fetchNDVIData,
  calculateHealthScore,
  createCachedHealthScore,
  generateHeatmapColors,
  calculateNDVIStatistics,
} from '../services/sentinel-hub.service';
import {
  saveHealthScore,
  getLatestHealthScore,
  getFarmsByUser,
  logAuditEvent,
} from '../services/dynamodb.service';
import { uploadHeatmap, getHeatmapPresignedUrl } from '../services/s3.service';
import { sendHealthAlert } from './alert.handler';
import sharp from 'sharp';

// =============================================================================
// SETUP
// =============================================================================

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

// =============================================================================
// MAIN HANDLER
// =============================================================================

/**
 * Lambda handler for scheduled NDVI processing
 * Triggered daily at 06:00 UTC by EventBridge
 */
export async function handler(event: ScheduledEvent, context: Context): Promise<void> {
  console.log('Starting daily health analysis');
  const startTime = Date.now();

  try {
    // Get all farms to process
    const farms = await getAllFarms();
    console.log(`Processing ${farms.length} farms`);

    // Process farms in batches to avoid rate limits
    const batchSize = 10;
    let processed = 0;
    let failed = 0;
    let alertsTriggered = 0;

    for (let i = 0; i < farms.length; i += batchSize) {
      const batch = farms.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(farm => processFarmHealth(farm))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          processed++;
          if (result.value.alertTriggered) {
            alertsTriggered++;
          }
        } else {
          failed++;
          console.error('Farm processing failed:', result.reason);
        }
      }

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < farms.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`Health analysis completed in ${totalTime}ms:`, {
      total: farms.length,
      processed,
      failed,
      alertsTriggered,
    });

  } catch (error) {
    console.error('Health analysis failed:', error);
    throw error;
  }
}

/**
 * Get all farms from DynamoDB
 * In production, this would paginate through all farms
 */
async function getAllFarms(): Promise<Farm[]> {
  // This is a simplified implementation
  // In production, scan or query all farms with pagination
  // For now, return empty array - actual implementation needs farm discovery
  console.log('Fetching all farms...');

  // TODO: Implement pagination for all farms
  // This could use a GSI or scan with pagination
  return [];
}

/**
 * Process health score for a single farm
 */
async function processFarmHealth(farm: Farm): Promise<{
  score: HealthScore;
  alertTriggered: boolean;
}> {
  const startTime = Date.now();
  console.log(`Processing farm: ${farm.farmId} (${farm.name})`);

  let healthScore: HealthScore;
  let alertTriggered = false;

  try {
    // Get previous health score for comparison
    const previousScore = await getLatestHealthScore(farm.farmId);

    // Fetch NDVI data from Sentinel Hub
    const ndviResult = await fetchNDVIData(farm.farmId, farm.location);

    // Check cloud cover
    if (ndviResult.cloudCoverPercentage > THRESHOLDS.CLOUD_COVER_MAX) {
      console.log(`High cloud cover (${ndviResult.cloudCoverPercentage}%), using cached data`);

      if (previousScore) {
        healthScore = createCachedHealthScore(farm.farmId, previousScore);
      } else {
        // No previous data available, create with placeholder
        healthScore = calculateHealthScore(ndviResult);
        healthScore.isCached = true;
      }
    } else {
      // Calculate health score from NDVI
      healthScore = calculateHealthScore(ndviResult);

      // Generate heatmap
      const heatmapPath = await generateAndUploadHeatmap(
        farm.farmId,
        ndviResult.pixelData
      );
      healthScore.heatmapPath = heatmapPath;

      // Calculate statistics
      const stats = calculateNDVIStatistics(ndviResult.pixelData);
      console.log(`Farm ${farm.farmId} stats:`, {
        healthScore: healthScore.healthScore,
        ndvi: healthScore.ndviValue.toFixed(3),
        coverage: stats.coverage,
      });
    }

    // Add comparison data
    if (previousScore) {
      healthScore.previousScore = previousScore.healthScore;
      healthScore.scoreDelta = healthScore.healthScore - previousScore.healthScore;

      // Check for significant change
      if (hasSignificantChange(healthScore.healthScore, previousScore.healthScore)) {
        console.log(`Significant health change detected: ${previousScore.healthScore} -> ${healthScore.healthScore}`);

        // Trigger health alert
        await sendHealthAlert(
          farm.userId,
          farm.farmId,
          healthScore.healthScore,
          previousScore.healthScore,
          farm.language
        );
        alertTriggered = true;
      }
    }

    // Save health score
    await saveHealthScore(healthScore);

    // Log success
    await logAuditEvent(
      farm.farmId,
      AuditEventType.HEALTH_SCORE_CALCULATED,
      {
        healthScore: healthScore.healthScore,
        ndviValue: healthScore.ndviValue,
        category: healthScore.category,
        isCached: healthScore.isCached,
        cloudCover: healthScore.cloudCover,
        alertTriggered,
      },
      'success',
      Date.now() - startTime
    );

    return { score: healthScore, alertTriggered };

  } catch (error) {
    console.error(`Failed to process farm ${farm.farmId}:`, error);

    // Log failure
    await logAuditEvent(
      farm.farmId,
      AuditEventType.API_ERROR,
      {
        service: 'sentinel-hub',
        error: (error as Error).message,
      },
      'failure',
      Date.now() - startTime
    );

    throw error;
  }
}

// =============================================================================
// HEATMAP GENERATION
// =============================================================================

/**
 * Generate heatmap image and upload to S3
 */
async function generateAndUploadHeatmap(
  farmId: string,
  pixelData: number[][]
): Promise<string> {
  const height = pixelData.length;
  const width = pixelData[0]?.length || 0;

  if (width === 0 || height === 0) {
    throw new Error('Invalid pixel data for heatmap generation');
  }

  // Generate RGBA color data
  const rgbaData = generateHeatmapColors(pixelData);

  // Use sharp to create PNG image
  const pngBuffer = await sharp(rgbaData, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .resize(512, 512, { fit: 'fill' }) // Upscale to readable size
    .png()
    .toBuffer();

  // Upload to S3
  const today = new Date();
  const heatmapPath = await uploadHeatmap(farmId, today, pngBuffer);

  console.log(`Heatmap generated and uploaded: ${heatmapPath}`);
  return heatmapPath;
}

// =============================================================================
// SINGLE FARM HANDLER (for on-demand processing)
// =============================================================================

/**
 * Process health score for a single farm on demand
 */
export async function processSingleFarm(farmId: string): Promise<HealthScore> {
  const farm = await import('../services/dynamodb.service').then(m => m.getFarm(farmId));

  if (!farm) {
    throw new Error(`Farm not found: ${farmId}`);
  }

  const result = await processFarmHealth(farm);
  return result.score;
}

// =============================================================================
// HISTORICAL DATA HANDLER
// =============================================================================

/**
 * Backfill historical NDVI data for a farm
 */
export async function backfillHistoricalData(
  farmId: string,
  days: number = 30
): Promise<HealthScore[]> {
  const farm = await import('../services/dynamodb.service').then(m => m.getFarm(farmId));

  if (!farm) {
    throw new Error(`Farm not found: ${farmId}`);
  }

  const scores: HealthScore[] = [];
  const today = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);

    try {
      const ndviResult = await fetchNDVIData(farm.farmId, farm.location, date);
      const healthScore = calculateHealthScore(ndviResult);

      // Generate heatmap
      const heatmapPath = await generateAndUploadHeatmap(farm.farmId, ndviResult.pixelData);
      healthScore.heatmapPath = heatmapPath;
      healthScore.date = formatDateISO(date);

      await saveHealthScore(healthScore);
      scores.push(healthScore);

      console.log(`Backfilled ${formatDateISO(date)}: ${healthScore.healthScore}`);

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`Failed to backfill ${formatDateISO(date)}:`, error);
    }
  }

  return scores;
}

// =============================================================================
// HEALTH TRENDS
// =============================================================================

/**
 * Calculate health trends for a farm
 */
export async function calculateHealthTrends(
  farmId: string,
  days: number = 30
): Promise<{
  scores: HealthScore[];
  average: number;
  trend: 'improving' | 'stable' | 'declining';
  forecast: number;
}> {
  const { getHealthScoreHistory } = await import('../services/dynamodb.service');
  const { calculateTrend, average } = await import('@green-sentinel/shared');

  const scores = await getHealthScoreHistory(farmId, days);

  if (scores.length === 0) {
    return {
      scores: [],
      average: 0,
      trend: 'stable',
      forecast: 0,
    };
  }

  const scoreValues = scores.map(s => s.healthScore);
  const avgScore = average(scoreValues);
  const trend = calculateTrend(scoreValues);

  // Simple linear forecast
  const recentScores = scoreValues.slice(-7);
  const recentAvg = average(recentScores);
  const olderScores = scoreValues.slice(-14, -7);
  const olderAvg = olderScores.length > 0 ? average(olderScores) : recentAvg;
  const forecast = Math.max(0, Math.min(100, recentAvg + (recentAvg - olderAvg)));

  return {
    scores,
    average: avgScore,
    trend,
    forecast,
  };
}
