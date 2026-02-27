/**
 * Green Sentinel - Sentinel Hub Service
 *
 * Handles NDVI data retrieval from Copernicus Sentinel Hub API.
 * Calculates crop health scores and generates heatmaps.
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { AWS_RESOURCES, SENTINEL_HUB_CONFIG, THRESHOLDS } from '@green-sentinel/shared';
import {
  NDVIResult,
  HealthScore,
  HealthCategory,
  GeoLocation,
  BoundingBox,
} from '@green-sentinel/shared';
import {
  ndviToHealthScore,
  getHealthCategoryFromNdvi,
  formatDateISO,
  retryWithBackoff,
} from '@green-sentinel/shared';

// =============================================================================
// TYPES
// =============================================================================

export interface SentinelHubCredentials {
  clientId: string;
  clientSecret: string;
}

interface SentinelHubToken {
  accessToken: string;
  expiresAt: number;
}

interface ProcessingRequest {
  input: {
    bounds: {
      bbox: [number, number, number, number];
      properties: { crs: string };
    };
    data: Array<{
      type: string;
      dataFilter: {
        timeRange: { from: string; to: string };
        maxCloudCoverage: number;
      };
    }>;
  };
  output: {
    width: number;
    height: number;
    responses: Array<{
      identifier: string;
      format: { type: string };
    }>;
  };
  evalscript: string;
}

// =============================================================================
// CLIENT SETUP
// =============================================================================

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

let cachedCredentials: SentinelHubCredentials | null = null;
let cachedToken: SentinelHubToken | null = null;

const SENTINEL_HUB_AUTH_URL = 'https://services.sentinel-hub.com/oauth/token';
const SENTINEL_HUB_PROCESS_URL = 'https://services.sentinel-hub.com/api/v1/process';

/**
 * Get Sentinel Hub credentials from Secrets Manager
 */
async function getSentinelHubCredentials(): Promise<SentinelHubCredentials> {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const command = new GetSecretValueCommand({
    SecretId: `${AWS_RESOURCES.SECRETS.API_KEYS}/sentinel-hub`,
  });

  const response = await secretsClient.send(command);
  if (!response.SecretString) {
    throw new Error('Sentinel Hub credentials not found in Secrets Manager');
  }

  cachedCredentials = JSON.parse(response.SecretString) as SentinelHubCredentials;
  return cachedCredentials;
}

/**
 * Get OAuth2 access token for Sentinel Hub
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.accessToken;
  }

  const credentials = await getSentinelHubCredentials();

  const response = await fetch(SENTINEL_HUB_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Sentinel Hub token: ${response.statusText}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return cachedToken.accessToken;
}

// =============================================================================
// NDVI DATA RETRIEVAL
// =============================================================================

/**
 * Calculate bounding box from farm location
 * Creates a ~500m x 500m area around the point
 */
function calculateBoundingBox(location: GeoLocation, radiusMeters: number = 250): BoundingBox {
  // Approximate degrees per meter at given latitude
  const latDegPerMeter = 1 / 111320;
  const lngDegPerMeter = 1 / (111320 * Math.cos(location.latitude * Math.PI / 180));

  const latOffset = radiusMeters * latDegPerMeter;
  const lngOffset = radiusMeters * lngDegPerMeter;

  return {
    minLat: location.latitude - latOffset,
    maxLat: location.latitude + latOffset,
    minLng: location.longitude - lngOffset,
    maxLng: location.longitude + lngOffset,
  };
}

/**
 * Fetch NDVI data for a farm location
 */
export async function fetchNDVIData(
  farmId: string,
  location: GeoLocation,
  date?: Date
): Promise<NDVIResult> {
  const targetDate = date || new Date();
  const bbox = calculateBoundingBox(location, 500); // 1km x 1km area

  // Calculate date range (look back up to 30 days for clear images)
  const endDate = formatDateISO(targetDate);
  const startDate = formatDateISO(new Date(targetDate.getTime() - 30 * 24 * 60 * 60 * 1000));

  const accessToken = await getAccessToken();

  const request: ProcessingRequest = {
    input: {
      bounds: {
        bbox: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
      },
      data: [
        {
          type: SENTINEL_HUB_CONFIG.DATA_COLLECTION,
          dataFilter: {
            timeRange: { from: `${startDate}T00:00:00Z`, to: `${endDate}T23:59:59Z` },
            maxCloudCoverage: SENTINEL_HUB_CONFIG.MAX_CLOUD_COVERAGE,
          },
        },
      ],
    },
    output: {
      width: 100,  // 100x100 pixel grid
      height: 100,
      responses: [
        {
          identifier: 'default',
          format: { type: 'image/tiff' },
        },
      ],
    },
    evalscript: SENTINEL_HUB_CONFIG.EVALSCRIPT_NDVI,
  };

  const response = await retryWithBackoff(
    async () => {
      const res = await fetch(SENTINEL_HUB_PROCESS_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'image/tiff',
        },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Sentinel Hub API error: ${res.status} - ${errorText}`);
      }

      return res;
    },
    3
  );

  // Parse TIFF response and extract NDVI values
  const arrayBuffer = await response.arrayBuffer();
  const ndviData = parseNDVIFromTiff(arrayBuffer);

  // Get acquisition date from response headers
  const acquisitionDate = response.headers.get('x-sentinel-hub-acq-date') || endDate;

  // Calculate cloud cover from response
  const cloudCover = parseFloat(response.headers.get('x-sentinel-hub-cloud-cover') || '0');

  return {
    farmId,
    ndviValue: ndviData.averageNdvi,
    pixelData: ndviData.pixelGrid,
    boundingBox: bbox,
    acquisitionDate,
    cloudCoverPercentage: cloudCover,
    satelliteId: 'sentinel-2',
  };
}

/**
 * Parse NDVI values from TIFF data
 * Simplified parser - in production use a proper TIFF library
 */
function parseNDVIFromTiff(buffer: ArrayBuffer): {
  averageNdvi: number;
  pixelGrid: number[][];
} {
  // This is a simplified implementation
  // In production, use a library like 'geotiff' for proper parsing
  const view = new DataView(buffer);
  const pixelGrid: number[][] = [];
  let sum = 0;
  let count = 0;

  // Assuming 32-bit float NDVI values after TIFF header
  // Skip TIFF header (simplified - actual implementation needs proper TIFF parsing)
  const headerSize = 8;
  const floatSize = 4;
  const width = 100;
  const height = 100;

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const offset = headerSize + (y * width + x) * floatSize;
      if (offset + floatSize <= buffer.byteLength) {
        try {
          const value = view.getFloat32(offset, true); // Little endian
          // Clamp NDVI to valid range
          const clampedValue = Math.max(-1, Math.min(1, value));
          row.push(clampedValue);
          if (!isNaN(clampedValue)) {
            sum += clampedValue;
            count++;
          }
        } catch {
          row.push(0);
        }
      } else {
        row.push(0);
      }
    }
    pixelGrid.push(row);
  }

  const averageNdvi = count > 0 ? sum / count : 0;

  return { averageNdvi, pixelGrid };
}

// =============================================================================
// HEALTH SCORE CALCULATION
// =============================================================================

/**
 * Calculate health score from NDVI data
 */
export function calculateHealthScore(ndviResult: NDVIResult): HealthScore {
  const now = new Date();
  const healthScore = ndviToHealthScore(ndviResult.ndviValue);
  const category = getHealthCategoryFromNdvi(ndviResult.ndviValue);

  return {
    farmId: ndviResult.farmId,
    date: formatDateISO(now),
    healthScore,
    ndviValue: ndviResult.ndviValue,
    category,
    heatmapPath: '', // Will be set after heatmap generation
    satelliteDate: ndviResult.acquisitionDate,
    cloudCover: ndviResult.cloudCoverPercentage,
    isCached: false,
    createdAt: now.toISOString(),
  };
}

/**
 * Check if health score changed significantly
 */
export function hasSignificantChange(
  currentScore: number,
  previousScore: number | undefined
): boolean {
  if (previousScore === undefined) return false;
  return Math.abs(currentScore - previousScore) >= THRESHOLDS.HEALTH_SCORE_CHANGE;
}

// =============================================================================
// HEATMAP GENERATION
// =============================================================================

/**
 * Generate NDVI heatmap colors
 * Returns an array of RGBA values for each pixel
 */
export function generateHeatmapColors(pixelData: number[][]): Uint8Array {
  const height = pixelData.length;
  const width = pixelData[0]?.length || 0;
  const rgba = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ndvi = pixelData[y]?.[x] || 0;
      const color = ndviToRgb(ndvi);
      const idx = (y * width + x) * 4;
      rgba[idx] = color.r;
      rgba[idx + 1] = color.g;
      rgba[idx + 2] = color.b;
      rgba[idx + 3] = 255; // Full opacity
    }
  }

  return rgba;
}

/**
 * Convert NDVI value to RGB color
 */
function ndviToRgb(ndvi: number): { r: number; g: number; b: number } {
  // Color gradient: Red (low NDVI) -> Yellow (medium) -> Green (high)
  if (ndvi < 0.2) {
    // Critical - Red
    return { r: 239, g: 68, b: 68 };
  } else if (ndvi < 0.3) {
    // Poor - Orange-Red
    const t = (ndvi - 0.2) / 0.1;
    return {
      r: Math.round(239 + (249 - 239) * t),
      g: Math.round(68 + (115 - 68) * t),
      b: Math.round(68 + (22 - 68) * t),
    };
  } else if (ndvi < 0.5) {
    // Moderate - Orange to Yellow
    const t = (ndvi - 0.3) / 0.2;
    return {
      r: Math.round(249 + (234 - 249) * t),
      g: Math.round(115 + (179 - 115) * t),
      b: Math.round(22 + (8 - 22) * t),
    };
  } else if (ndvi < 0.6) {
    // Good - Yellow to Light Green
    const t = (ndvi - 0.5) / 0.1;
    return {
      r: Math.round(234 + (132 - 234) * t),
      g: Math.round(179 + (204 - 179) * t),
      b: Math.round(8 + (22 - 8) * t),
    };
  } else {
    // Excellent - Green
    const t = Math.min(1, (ndvi - 0.6) / 0.4);
    return {
      r: Math.round(132 + (34 - 132) * t),
      g: Math.round(204 + (197 - 204) * t),
      b: Math.round(22 + (94 - 22) * t),
    };
  }
}

// =============================================================================
// CACHED DATA HANDLING
// =============================================================================

/**
 * Create a cached health score when satellite data is unavailable
 */
export function createCachedHealthScore(
  farmId: string,
  previousScore: HealthScore
): HealthScore {
  const now = new Date();

  return {
    ...previousScore,
    farmId,
    date: formatDateISO(now),
    isCached: true,
    createdAt: now.toISOString(),
  };
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Calculate NDVI statistics from pixel data
 */
export function calculateNDVIStatistics(pixelData: number[][]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  coverage: {
    critical: number;
    poor: number;
    moderate: number;
    good: number;
    excellent: number;
  };
} {
  const values: number[] = [];
  const coverage = {
    critical: 0,
    poor: 0,
    moderate: 0,
    good: 0,
    excellent: 0,
  };

  for (const row of pixelData) {
    for (const val of row) {
      if (!isNaN(val)) {
        values.push(val);

        // Categorize coverage
        if (val < 0.2) coverage.critical++;
        else if (val < 0.3) coverage.poor++;
        else if (val < 0.5) coverage.moderate++;
        else if (val < 0.6) coverage.good++;
        else coverage.excellent++;
      }
    }
  }

  const total = values.length;
  if (total === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      coverage: { critical: 0, poor: 0, moderate: 0, good: 0, excellent: 0 },
    };
  }

  values.sort((a, b) => a - b);

  const min = values[0] || 0;
  const max = values[total - 1] || 0;
  const mean = values.reduce((a, b) => a + b, 0) / total;
  const median = total % 2 === 0
    ? ((values[total / 2 - 1] || 0) + (values[total / 2] || 0)) / 2
    : values[Math.floor(total / 2)] || 0;

  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / total;
  const stdDev = Math.sqrt(variance);

  // Convert coverage counts to percentages
  return {
    min,
    max,
    mean,
    median,
    stdDev,
    coverage: {
      critical: (coverage.critical / total) * 100,
      poor: (coverage.poor / total) * 100,
      moderate: (coverage.moderate / total) * 100,
      good: (coverage.good / total) * 100,
      excellent: (coverage.excellent / total) * 100,
    },
  };
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Check if Sentinel Hub service is operational
 */
export async function checkSentinelHubHealth(): Promise<{
  configured: boolean;
  operational: boolean;
  error?: string;
}> {
  try {
    const credentials = await getSentinelHubCredentials();

    if (!credentials.clientId || !credentials.clientSecret) {
      return {
        configured: false,
        operational: false,
        error: 'Missing Sentinel Hub credentials',
      };
    }

    // Try to get an access token
    await getAccessToken();

    return {
      configured: true,
      operational: true,
    };
  } catch (error) {
    return {
      configured: false,
      operational: false,
      error: (error as Error).message,
    };
  }
}
