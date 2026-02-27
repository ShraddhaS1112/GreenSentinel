/**
 * Green Sentinel - Free Satellite Service
 *
 * Uses AWS Open Data (Sentinel-2 COGs) and Element84 STAC API
 * for completely FREE satellite imagery and vegetation index analysis.
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  SatelliteAnalysis,
  VegetationIndices,
  IndexResult,
  SatelliteScene,
  SatelliteZone,
  BoundingBox,
  HealthCategory,
  GeoJSON,
} from '@green-sentinel/shared';
import { SATELLITE_CONFIG, THRESHOLDS } from '@green-sentinel/shared';

// =============================================================================
// STAC API CLIENT (FREE)
// =============================================================================

const STAC_API_URL = SATELLITE_CONFIG.STAC_API.URL;
const STAC_COLLECTION = SATELLITE_CONFIG.STAC_API.COLLECTION;

/**
 * Search for Sentinel-2 scenes covering a bounding box
 */
export async function searchScenes(
  bounds: BoundingBox,
  options: {
    startDate?: string;
    endDate?: string;
    maxCloudCover?: number;
    limit?: number;
  } = {}
): Promise<SatelliteScene[]> {
  const {
    startDate = getDateDaysAgo(30),
    endDate = new Date().toISOString().split('T')[0],
    maxCloudCover = SATELLITE_CONFIG.MAX_CLOUD_COVER,
    limit = 10,
  } = options;

  const bbox = [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat];

  const searchBody = {
    collections: [STAC_COLLECTION],
    bbox,
    datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
    query: {
      'eo:cloud_cover': { lt: maxCloudCover },
    },
    limit,
    sortby: [{ field: 'datetime', direction: 'desc' }],
  };

  const response = await fetch(`${STAC_API_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchBody),
  });

  if (!response.ok) {
    throw new Error(`STAC API error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  return data.features.map((feature: any) => ({
    sceneId: feature.id,
    datetime: feature.properties.datetime,
    cloudCover: feature.properties['eo:cloud_cover'],
    sunElevation: feature.properties['sun_elevation'] || 0,
    assets: {
      B02: feature.assets?.blue?.href,
      B03: feature.assets?.green?.href,
      B04: feature.assets?.red?.href,
      B08: feature.assets?.nir?.href,
      B11: feature.assets?.swir16?.href,
      B12: feature.assets?.swir22?.href,
      SCL: feature.assets?.scl?.href,
    },
    geometry: feature.geometry,
  }));
}

/**
 * Get the latest clear scene for a farm
 */
export async function getLatestScene(
  bounds: BoundingBox
): Promise<SatelliteScene | null> {
  const scenes = await searchScenes(bounds, {
    maxCloudCover: SATELLITE_CONFIG.MAX_CLOUD_COVER,
    limit: 1,
  });

  return scenes[0] || null;
}

// =============================================================================
// VEGETATION INDEX CALCULATION
// =============================================================================

/**
 * Fetch band data from Cloud Optimized GeoTIFF (partial read)
 * This is the key to making satellite data FREE - we only download what we need
 */
async function fetchBandData(
  bandUrl: string,
  bounds: BoundingBox
): Promise<number[]> {
  // For COG partial reads, we use HTTP range requests
  // This downloads only the pixels we need, not the entire image

  try {
    // Dynamic import for geotiff library
    const GeoTIFF = await import('geotiff');

    const tiff = await GeoTIFF.fromUrl(bandUrl, {
      allowFullFile: false, // Force partial reads
    });

    const image = await tiff.getImage();

    // Get image metadata
    const [originX, originY] = image.getOrigin();
    const [resX, resY] = image.getResolution();
    const width = image.getWidth();
    const height = image.getHeight();

    // Convert lat/lng bounds to pixel coordinates
    const x1 = Math.max(0, Math.floor((bounds.minLng - originX) / resX));
    const y1 = Math.max(0, Math.floor((originY - bounds.maxLat) / Math.abs(resY)));
    const x2 = Math.min(width, Math.ceil((bounds.maxLng - originX) / resX));
    const y2 = Math.min(height, Math.ceil((originY - bounds.minLat) / Math.abs(resY)));

    // Validate window
    if (x2 <= x1 || y2 <= y1) {
      console.warn('Invalid window, returning empty data');
      return [];
    }

    // Read only the window we need (NOT the entire image!)
    const window = [x1, y1, x2, y2];
    const rasters = await image.readRasters({ window });

    // Convert to number array
    const data = rasters[0] as Uint16Array | Float32Array;
    return Array.from(data);
  } catch (error) {
    console.error('Failed to fetch band data:', error);
    throw new Error(`Failed to fetch satellite band: ${(error as Error).message}`);
  }
}

/**
 * Calculate NDVI: (NIR - Red) / (NIR + Red)
 */
function calculateNDVI(nir: number[], red: number[]): IndexResult {
  const values: number[] = [];

  for (let i = 0; i < Math.min(nir.length, red.length); i++) {
    const nirVal = nir[i] || 0;
    const redVal = red[i] || 0;

    if (nirVal + redVal === 0) continue;

    const ndvi = (nirVal - redVal) / (nirVal + redVal);
    if (ndvi >= -1 && ndvi <= 1) {
      values.push(ndvi);
    }
  }

  return calculateIndexStats(values);
}

/**
 * Calculate NDWI: (Green - NIR) / (Green + NIR)
 */
function calculateNDWI(green: number[], nir: number[]): IndexResult {
  const values: number[] = [];

  for (let i = 0; i < Math.min(green.length, nir.length); i++) {
    const greenVal = green[i] || 0;
    const nirVal = nir[i] || 0;

    if (greenVal + nirVal === 0) continue;

    const ndwi = (greenVal - nirVal) / (greenVal + nirVal);
    if (ndwi >= -1 && ndwi <= 1) {
      values.push(ndwi);
    }
  }

  return calculateIndexStats(values);
}

/**
 * Calculate NDMI: (NIR - SWIR) / (NIR + SWIR)
 */
function calculateNDMI(nir: number[], swir: number[]): IndexResult {
  const values: number[] = [];

  for (let i = 0; i < Math.min(nir.length, swir.length); i++) {
    const nirVal = nir[i] || 0;
    const swirVal = swir[i] || 0;

    if (nirVal + swirVal === 0) continue;

    const ndmi = (nirVal - swirVal) / (nirVal + swirVal);
    if (ndmi >= -1 && ndmi <= 1) {
      values.push(ndmi);
    }
  }

  return calculateIndexStats(values);
}

/**
 * Calculate EVI: 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)
 */
function calculateEVI(nir: number[], red: number[], blue: number[]): IndexResult {
  const values: number[] = [];

  for (let i = 0; i < Math.min(nir.length, red.length, blue.length); i++) {
    const nirVal = (nir[i] || 0) / 10000; // Scale to reflectance
    const redVal = (red[i] || 0) / 10000;
    const blueVal = (blue[i] || 0) / 10000;

    const denominator = nirVal + 6 * redVal - 7.5 * blueVal + 1;
    if (denominator === 0) continue;

    const evi = 2.5 * (nirVal - redVal) / denominator;
    if (evi >= -1 && evi <= 1) {
      values.push(evi);
    }
  }

  return calculateIndexStats(values);
}

/**
 * Calculate statistics for an index
 */
function calculateIndexStats(values: number[]): IndexResult {
  if (values.length === 0) {
    return { mean: 0, min: 0, max: 0, stdDev: 0, histogram: new Array(10).fill(0) };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Create histogram with 10 bins from -1 to 1
  const histogram = new Array(10).fill(0);
  const binSize = 0.2;
  for (const val of values) {
    const bin = Math.min(9, Math.floor((val + 1) / binSize));
    histogram[bin]++;
  }

  return {
    mean: Math.round(mean * 1000) / 1000,
    min: Math.round(min * 1000) / 1000,
    max: Math.round(max * 1000) / 1000,
    stdDev: Math.round(stdDev * 1000) / 1000,
    histogram,
  };
}

// =============================================================================
// MAIN ANALYSIS FUNCTION
// =============================================================================

/**
 * Perform complete satellite analysis for a farm
 */
export async function analyzeFarm(
  farmId: string,
  bounds: BoundingBox
): Promise<SatelliteAnalysis> {
  const startTime = Date.now();

  // Find latest clear scene
  const scene = await getLatestScene(bounds);

  if (!scene) {
    throw new Error('No satellite imagery available for the specified area');
  }

  // Fetch all required bands in parallel
  const [blue, green, red, nir, swir] = await Promise.all([
    scene.assets.B02 ? fetchBandData(scene.assets.B02, bounds) : Promise.resolve([]),
    scene.assets.B03 ? fetchBandData(scene.assets.B03, bounds) : Promise.resolve([]),
    scene.assets.B04 ? fetchBandData(scene.assets.B04, bounds) : Promise.resolve([]),
    scene.assets.B08 ? fetchBandData(scene.assets.B08, bounds) : Promise.resolve([]),
    scene.assets.B11 ? fetchBandData(scene.assets.B11, bounds) : Promise.resolve([]),
  ]);

  // Calculate all vegetation indices
  const ndvi = calculateNDVI(nir, red);
  const ndwi = calculateNDWI(green, nir);
  const ndmi = calculateNDMI(nir, swir);
  const evi = calculateEVI(nir, red, blue);

  const indices: VegetationIndices = {
    ndvi,
    ndwi,
    ndmi,
    evi,
  };

  // Calculate overall health score
  const healthScore = calculateHealthScore(ndvi.mean, ndwi.mean, ndmi.mean);
  const healthCategory = getHealthCategory(healthScore);

  // Generate zones (simplified - divide into 4 quadrants)
  const zones = generateZones(bounds, nir, red, green, swir);

  const processingTimeMs = Date.now() - startTime;

  return {
    farmId,
    captureDate: scene.datetime,
    cloudCover: scene.cloudCover,
    indices,
    healthScore,
    healthCategory,
    zones,
    sceneId: scene.sceneId,
    processingTimeMs,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Calculate overall health score from multiple indices
 */
function calculateHealthScore(ndvi: number, ndwi: number, ndmi: number): number {
  // NDVI contribution (50% weight) - vegetation vigor
  const ndviScore = Math.max(0, Math.min(100, (ndvi + 0.1) * 90));

  // NDMI contribution (30% weight) - moisture stress
  const ndmiScore = Math.max(0, Math.min(100, (ndmi + 0.3) * 125));

  // NDWI contribution (20% weight) - water content
  // Note: for vegetation, NDWI is typically negative (positive for water bodies)
  const ndwiScore = Math.max(0, Math.min(100, (-ndwi + 0.3) * 125));

  const score = ndviScore * 0.5 + ndmiScore * 0.3 + ndwiScore * 0.2;

  return Math.round(score);
}

/**
 * Get health category from score
 */
function getHealthCategory(score: number): HealthCategory {
  if (score >= 80) return HealthCategory.EXCELLENT;
  if (score >= 70) return HealthCategory.GOOD;
  if (score >= 50) return HealthCategory.MODERATE;
  if (score >= 40) return HealthCategory.POOR;
  return HealthCategory.CRITICAL;
}

/**
 * Generate zone-based analysis
 */
function generateZones(
  bounds: BoundingBox,
  nir: number[],
  red: number[],
  green: number[],
  swir: number[]
): SatelliteZone[] {
  // Simple 2x2 grid zones
  const zones: SatelliteZone[] = [];
  const zoneNames = ['North-West', 'North-East', 'South-West', 'South-East'];

  const pixelsPerRow = Math.sqrt(nir.length) || 1;
  const halfPixels = Math.floor(pixelsPerRow / 2);

  for (let i = 0; i < 4; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;

    // Extract zone pixels (simplified)
    const startIdx = row * halfPixels * pixelsPerRow + col * halfPixels;
    const zoneNir = nir.slice(startIdx, startIdx + halfPixels * halfPixels);
    const zoneRed = red.slice(startIdx, startIdx + halfPixels * halfPixels);
    const zoneGreen = green.slice(startIdx, startIdx + halfPixels * halfPixels);
    const zoneSwir = swir.slice(startIdx, startIdx + halfPixels * halfPixels);

    const zoneNdvi = calculateNDVI(zoneNir, zoneRed);
    const zoneNdwi = calculateNDWI(zoneGreen, zoneNir);
    const zoneNdmi = calculateNDMI(zoneNir, zoneSwir);

    const zoneHealthScore = calculateHealthScore(zoneNdvi.mean, zoneNdwi.mean, zoneNdmi.mean);

    // Detect issues
    const issues: SatelliteZone['issues'] = [];

    if (zoneNdmi.mean < -0.1) {
      issues.push({
        type: 'water_stress',
        severity: zoneNdmi.mean < -0.2 ? 'high' : 'medium',
        confidence: 75,
      });
    }

    if (zoneNdvi.mean < 0.3 && zoneNdvi.stdDev > 0.15) {
      issues.push({
        type: 'nutrient_deficiency',
        severity: zoneNdvi.mean < 0.2 ? 'high' : 'medium',
        confidence: 60,
      });
    }

    zones.push({
      zoneId: `zone-${i + 1}`,
      zoneName: zoneNames[i] || `Zone ${i + 1}`,
      ndvi: zoneNdvi.mean,
      ndwi: zoneNdwi.mean,
      ndmi: zoneNdmi.mean,
      healthScore: zoneHealthScore,
      healthCategory: getHealthCategory(zoneHealthScore),
      areaHectares: calculateZoneArea(bounds) / 4,
      issues,
    });
  }

  return zones;
}

/**
 * Calculate area in hectares from bounds
 */
function calculateZoneArea(bounds: BoundingBox): number {
  // Approximate calculation using Haversine
  const latDiff = bounds.maxLat - bounds.minLat;
  const lngDiff = bounds.maxLng - bounds.minLng;

  // At equator: 1 degree ≈ 111 km
  const latKm = latDiff * 111;
  const lngKm = lngDiff * 111 * Math.cos((bounds.minLat + bounds.maxLat) / 2 * Math.PI / 180);

  const areaKm2 = latKm * lngKm;
  const areaHectares = areaKm2 * 100;

  return Math.round(areaHectares * 100) / 100;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get date string for N days ago
 */
function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0]!;
}

/**
 * Get historical satellite data for trend analysis
 */
export async function getHistoricalAnalysis(
  farmId: string,
  bounds: BoundingBox,
  days: number = 365
): Promise<{ date: string; ndvi: number; cloudCover: number }[]> {
  const scenes = await searchScenes(bounds, {
    startDate: getDateDaysAgo(days),
    maxCloudCover: 30,
    limit: 50,
  });

  const results: { date: string; ndvi: number; cloudCover: number }[] = [];

  // Process scenes in batches to avoid overwhelming the API
  for (const scene of scenes.slice(0, 20)) {
    try {
      if (!scene.assets.B04 || !scene.assets.B08) continue;

      const [red, nir] = await Promise.all([
        fetchBandData(scene.assets.B04, bounds),
        fetchBandData(scene.assets.B08, bounds),
      ]);

      const ndvi = calculateNDVI(nir, red);

      results.push({
        date: scene.datetime.split('T')[0]!,
        ndvi: ndvi.mean,
        cloudCover: scene.cloudCover,
      });
    } catch (error) {
      console.warn(`Failed to process scene ${scene.sceneId}:`, error);
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}
