/**
 * Green Sentinel - S3 Service
 *
 * Handles all S3 operations for frame storage, heatmaps, and assets.
 * Implements lifecycle rules for automatic cleanup.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AWS_RESOURCES, LIMITS } from '@green-sentinel/shared';
import { getFrameS3Path, getHeatmapS3Path } from '@green-sentinel/shared';

// =============================================================================
// CLIENT SETUP
// =============================================================================

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
});

// =============================================================================
// FRAME OPERATIONS
// =============================================================================

/**
 * Upload a camera frame to S3
 */
export async function uploadFrame(
  farmId: string,
  cameraId: string,
  timestamp: Date,
  frameBuffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const key = getFrameS3Path(farmId, cameraId, timestamp);

  // Validate frame size
  if (frameBuffer.length > LIMITS.FRAME.MAX_SIZE_BYTES) {
    throw new Error(`Frame size ${frameBuffer.length} exceeds limit ${LIMITS.FRAME.MAX_SIZE_BYTES}`);
  }

  const command = new PutObjectCommand({
    Bucket: AWS_RESOURCES.BUCKETS.FRAMES,
    Key: key,
    Body: frameBuffer,
    ContentType: contentType,
    Metadata: {
      farmId,
      cameraId,
      timestamp: timestamp.toISOString(),
    },
    // S3 Object Lock or Lifecycle rule handles TTL
    Tagging: `ttl=${LIMITS.FRAME.TTL_HOURS}h`,
  });

  await s3Client.send(command);
  return key;
}

/**
 * Get a frame from S3
 */
export async function getFrame(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: AWS_RESOURCES.BUCKETS.FRAMES,
    Key: key,
  });

  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error(`Frame not found: ${key}`);
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Generate a presigned URL for frame access
 */
export async function getFramePresignedUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: AWS_RESOURCES.BUCKETS.FRAMES,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Check if a frame exists
 */
export async function frameExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: AWS_RESOURCES.BUCKETS.FRAMES,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a frame from S3
 */
export async function deleteFrame(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: AWS_RESOURCES.BUCKETS.FRAMES,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * List frames for a camera on a specific date
 */
export async function listFrames(
  farmId: string,
  cameraId: string,
  date: string, // YYYY-MM-DD
  maxKeys: number = 1000
): Promise<string[]> {
  const prefix = `frames/${farmId}/${cameraId}/${date}/`;

  const command = new ListObjectsV2Command({
    Bucket: AWS_RESOURCES.BUCKETS.FRAMES,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await s3Client.send(command);
  return (response.Contents || []).map(obj => obj.Key!).filter(Boolean);
}

// =============================================================================
// HEATMAP OPERATIONS
// =============================================================================

/**
 * Upload an NDVI heatmap to S3
 */
export async function uploadHeatmap(
  farmId: string,
  date: Date,
  heatmapBuffer: Buffer,
  contentType: string = 'image/png'
): Promise<string> {
  const key = getHeatmapS3Path(farmId, date);

  const command = new PutObjectCommand({
    Bucket: AWS_RESOURCES.BUCKETS.HEATMAPS,
    Key: key,
    Body: heatmapBuffer,
    ContentType: contentType,
    Metadata: {
      farmId,
      date: date.toISOString().split('T')[0] ?? '',
    },
    CacheControl: 'max-age=86400', // Cache for 24 hours
  });

  await s3Client.send(command);
  return key;
}

/**
 * Get a heatmap from S3
 */
export async function getHeatmap(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: AWS_RESOURCES.BUCKETS.HEATMAPS,
    Key: key,
  });

  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error(`Heatmap not found: ${key}`);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Generate a presigned URL for heatmap access
 */
export async function getHeatmapPresignedUrl(
  key: string,
  expiresIn: number = 86400 // 24 hours
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: AWS_RESOURCES.BUCKETS.HEATMAPS,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * List heatmaps for a farm
 */
export async function listHeatmaps(
  farmId: string,
  maxKeys: number = 365
): Promise<string[]> {
  const prefix = `heatmaps/${farmId}/`;

  const command = new ListObjectsV2Command({
    Bucket: AWS_RESOURCES.BUCKETS.HEATMAPS,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await s3Client.send(command);
  return (response.Contents || [])
    .map(obj => obj.Key!)
    .filter(Boolean)
    .sort()
    .reverse(); // Most recent first
}

// =============================================================================
// ASSET OPERATIONS
// =============================================================================

/**
 * Upload a general asset (voice messages, etc.)
 */
export async function uploadAsset(
  path: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: AWS_RESOURCES.BUCKETS.ASSETS,
    Key: path,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata,
  });

  await s3Client.send(command);
  return path;
}

/**
 * Get a presigned URL for asset upload (for direct client uploads)
 */
export async function getAssetUploadUrl(
  path: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: AWS_RESOURCES.BUCKETS.ASSETS,
    Key: path,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get a presigned URL for asset download
 */
export async function getAssetDownloadUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: AWS_RESOURCES.BUCKETS.ASSETS,
    Key: path,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

// =============================================================================
// UTILITY OPERATIONS
// =============================================================================

/**
 * Calculate total storage used across all buckets
 * Used for Free Tier monitoring
 */
export async function calculateTotalStorage(): Promise<{
  frames: number;
  heatmaps: number;
  assets: number;
  total: number;
}> {
  const calculateBucketSize = async (bucket: string): Promise<number> => {
    let totalSize = 0;
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(command);
      totalSize += (response.Contents || []).reduce(
        (sum, obj) => sum + (obj.Size || 0),
        0
      );
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return totalSize;
  };

  const [frames, heatmaps, assets] = await Promise.all([
    calculateBucketSize(AWS_RESOURCES.BUCKETS.FRAMES),
    calculateBucketSize(AWS_RESOURCES.BUCKETS.HEATMAPS),
    calculateBucketSize(AWS_RESOURCES.BUCKETS.ASSETS),
  ]);

  return {
    frames,
    heatmaps,
    assets,
    total: frames + heatmaps + assets,
  };
}

/**
 * Clean up old frames (backup for lifecycle policy)
 */
export async function cleanupOldFrames(
  farmId: string,
  cameraId: string,
  olderThanHours: number = LIMITS.FRAME.TTL_HOURS
): Promise<number> {
  const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const prefix = `frames/${farmId}/${cameraId}/`;

  let deletedCount = 0;
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: AWS_RESOURCES.BUCKETS.FRAMES,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(listCommand);
    const oldObjects = (response.Contents || []).filter(
      obj => obj.LastModified && obj.LastModified < cutoffTime
    );

    for (const obj of oldObjects) {
      if (obj.Key) {
        await deleteFrame(obj.Key);
        deletedCount++;
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return deletedCount;
}
