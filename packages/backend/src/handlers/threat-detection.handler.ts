/**
 * Green Sentinel - Threat Detection Lambda Handler
 *
 * Processes camera frames from SQS, analyzes them for threats using
 * Claude 3.5 Sonnet via Bedrock, and triggers alerts when threats are detected.
 */

import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import {
  ThreatDetection,
  ThreatType,
  FrameEvent,
  ThreatAlertEvent,
  AlertDeliveryStatus,
  AuditEventType,
} from '@green-sentinel/shared';
import { AWS_RESOURCES, LIMITS, THRESHOLDS } from '@green-sentinel/shared';
import { generateId, detectThreats, getHighestPriorityThreat } from '@green-sentinel/shared';
import { getFrame } from '../services/s3.service';
import { analyzeFrameForThreats } from '../services/bedrock.service';
import { saveThreat, getFarm, logAuditEvent } from '../services/dynamodb.service';

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
 * Lambda handler for processing camera frames from SQS
 */
export async function handler(event: SQSEvent, context: Context): Promise<void> {
  console.log(`Processing ${event.Records.length} frame events`);

  const results = await Promise.allSettled(
    event.Records.map(record => processFrameRecord(record, context))
  );

  // Log any failures
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`${failures.length} frame(s) failed processing:`, failures);
  }

  console.log(`Processed ${results.length - failures.length}/${results.length} frames successfully`);
}

/**
 * Process a single frame record from SQS
 */
async function processFrameRecord(record: SQSRecord, context: Context): Promise<void> {
  const startTime = Date.now();
  let frameEvent: FrameEvent | null = null;

  try {
    // Parse the frame event from SQS message
    frameEvent = JSON.parse(record.body) as FrameEvent;

    console.log(`Processing frame: ${frameEvent.frameS3Path}`, {
      farmId: frameEvent.farmId,
      cameraId: frameEvent.cameraId,
      timestamp: frameEvent.timestamp,
    });

    // Get the frame from S3
    const frameBuffer = await getFrame(frameEvent.frameS3Path);

    // Check frame size
    if (frameBuffer.length > LIMITS.FRAME.MAX_SIZE_BYTES) {
      console.warn(`Frame too large (${frameBuffer.length} bytes), skipping`);
      return;
    }

    // Analyze frame for threats using Bedrock
    const analysisResult = await analyzeFrameForThreats(frameBuffer, {
      timeOfDay: isNightTime(frameEvent.timestamp) ? 'night' : 'day',
    });

    console.log('Analysis result:', {
      scores: analysisResult.scores,
      analysisTimeMs: analysisResult.metadata.analysisTimeMs,
    });

    // Get farm configuration for thresholds
    const farm = await getFarm(frameEvent.farmId);
    const thresholds = farm?.alertThresholds || THRESHOLDS.THREAT_DETECTION;

    // Check if any threats were detected
    const detectedThreats = detectThreats(analysisResult.scores, thresholds);

    if (detectedThreats.length > 0) {
      console.log(`Threats detected: ${detectedThreats.join(', ')}`);

      // Process each detected threat
      for (const threatType of detectedThreats) {
        await processThreat(
          frameEvent,
          threatType,
          analysisResult.scores[threatType],
          analysisResult,
          startTime
        );
      }
    } else {
      console.log('No threats detected in frame');
    }

    // Log successful analysis
    await logAuditEvent(
      frameEvent.farmId,
      AuditEventType.THREAT_DETECTED,
      {
        cameraId: frameEvent.cameraId,
        frameS3Path: frameEvent.frameS3Path,
        scores: analysisResult.scores,
        threatsDetected: detectedThreats,
      },
      'success',
      Date.now() - startTime
    );

  } catch (error) {
    console.error('Error processing frame:', error);

    // Log failure
    if (frameEvent) {
      await logAuditEvent(
        frameEvent.farmId,
        AuditEventType.API_ERROR,
        {
          cameraId: frameEvent.cameraId,
          error: (error as Error).message,
          stack: (error as Error).stack,
        },
        'failure',
        Date.now() - startTime
      );
    }

    throw error; // Re-throw to mark SQS message for retry
  }
}

/**
 * Process a detected threat
 */
async function processThreat(
  frameEvent: FrameEvent,
  threatType: ThreatType,
  confidenceScore: number,
  analysisResult: Awaited<ReturnType<typeof analyzeFrameForThreats>>,
  startTime: number
): Promise<void> {
  const now = new Date();

  // Create threat record
  const threat: ThreatDetection = {
    threatId: generateId('threat'),
    farmId: frameEvent.farmId,
    cameraId: frameEvent.cameraId,
    threatType,
    confidenceScore,
    frameSnapshotPath: frameEvent.frameS3Path,
    frameTimestamp: frameEvent.timestamp,
    alertSent: false,
    alertDeliveryStatus: AlertDeliveryStatus.PENDING,
    latencyMs: Date.now() - startTime,
    analysisMetadata: analysisResult.metadata,
    createdAt: now.toISOString(),
  };

  // Save threat to DynamoDB
  await saveThreat(threat);

  // Get farm and user info for alert
  const farm = await getFarm(frameEvent.farmId);
  if (!farm) {
    console.error(`Farm not found: ${frameEvent.farmId}`);
    return;
  }

  // Publish alert event to SNS for the alert service
  const alertEvent: ThreatAlertEvent = {
    eventId: generateId('alert'),
    threatId: threat.threatId,
    farmId: frameEvent.farmId,
    cameraId: frameEvent.cameraId,
    threatType,
    confidenceScore,
    frameSnapshotPath: frameEvent.frameS3Path,
    timestamp: now.toISOString(),
    userId: farm.userId,
    phoneNumber: '', // Will be populated by alert service from user record
    language: farm.language,
  };

  await publishAlertEvent(alertEvent);

  console.log(`Threat processed and alert triggered: ${threat.threatId}`);
}

/**
 * Publish alert event to SNS
 */
async function publishAlertEvent(alertEvent: ThreatAlertEvent): Promise<void> {
  const command = new PublishCommand({
    TopicArn: process.env.THREAT_NOTIFICATIONS_TOPIC_ARN ||
              `arn:aws:sns:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:${AWS_RESOURCES.TOPICS.THREAT_NOTIFICATIONS}`,
    Message: JSON.stringify(alertEvent),
    MessageAttributes: {
      eventType: {
        DataType: 'String',
        StringValue: 'THREAT_DETECTED',
      },
      threatType: {
        DataType: 'String',
        StringValue: alertEvent.threatType,
      },
      farmId: {
        DataType: 'String',
        StringValue: alertEvent.farmId,
      },
    },
  });

  await snsClient.send(command);
}

/**
 * Determine if timestamp is during night time (6 PM - 6 AM)
 */
function isNightTime(timestamp: string): boolean {
  const date = new Date(timestamp);
  const hour = date.getHours();
  return hour < 6 || hour >= 18;
}

// =============================================================================
// BATCH PROCESSING (for backlog processing)
// =============================================================================

/**
 * Process multiple frames in batch (for catching up on backlog)
 */
export async function batchProcessFrames(
  frames: FrameEvent[],
  concurrency: number = 5
): Promise<{
  processed: number;
  failed: number;
  threats: number;
}> {
  let processed = 0;
  let failed = 0;
  let threats = 0;

  // Process in batches
  for (let i = 0; i < frames.length; i += concurrency) {
    const batch = frames.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (frame) => {
        const mockRecord: SQSRecord = {
          messageId: frame.eventId,
          receiptHandle: '',
          body: JSON.stringify(frame),
          attributes: {} as SQSRecord['attributes'],
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: '',
          awsRegion: process.env.AWS_REGION || 'ap-south-1',
        };

        await processFrameRecord(mockRecord, {} as Context);
        return true;
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        processed++;
      } else {
        failed++;
      }
    }
  }

  return { processed, failed, threats };
}
