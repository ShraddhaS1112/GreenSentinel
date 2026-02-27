/**
 * Green Sentinel - Alert Service Lambda Handler
 *
 * Processes threat events from SNS, translates messages to the farmer's
 * language using Bhashini, and sends WhatsApp notifications via Twilio.
 */

import { SNSEvent, SNSEventRecord, Context } from 'aws-lambda';
import {
  ThreatAlertEvent,
  Alert,
  AlertDeliveryStatus,
  ThreatType,
  Language,
  AuditEventType,
} from '@green-sentinel/shared';
import {
  generateId,
  formatThreatAlert,
  formatPhoneForWhatsApp,
  getThreatConfig,
} from '@green-sentinel/shared';
import { LIMITS } from '@green-sentinel/shared';
import {
  getUser,
  getFarm,
  saveAlert,
  updateAlertStatus,
  updateThreatAlertStatus,
  logAuditEvent,
} from '../services/dynamodb.service';
import { getFramePresignedUrl } from '../services/s3.service';
import {
  translateAlertMessage,
  synthesizeVoice,
  getAlertTemplate,
  ALERT_TEMPLATES,
} from '../services/bhashini.service';
import {
  sendThreatAlert,
  sendWhatsAppMessage,
  sendWhatsAppWithImage,
  sendWhatsAppVoiceMessage,
} from '../services/twilio.service';
import { uploadAsset, getAssetDownloadUrl } from '../services/s3.service';

// =============================================================================
// MAIN HANDLER
// =============================================================================

/**
 * Lambda handler for processing alert events from SNS
 */
export async function handler(event: SNSEvent, context: Context): Promise<void> {
  console.log(`Processing ${event.Records.length} alert events`);

  const results = await Promise.allSettled(
    event.Records.map(record => processAlertRecord(record, context))
  );

  // Log any failures
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`${failures.length} alert(s) failed processing:`, failures);
  }

  console.log(`Processed ${results.length - failures.length}/${results.length} alerts successfully`);
}

/**
 * Process a single alert record from SNS
 */
async function processAlertRecord(record: SNSEventRecord, context: Context): Promise<void> {
  const startTime = Date.now();
  let alertEvent: ThreatAlertEvent | null = null;

  try {
    // Parse the alert event from SNS message
    alertEvent = JSON.parse(record.Sns.Message) as ThreatAlertEvent;

    console.log('Processing alert event:', {
      threatId: alertEvent.threatId,
      threatType: alertEvent.threatType,
      farmId: alertEvent.farmId,
      confidence: alertEvent.confidenceScore,
    });

    // Get user and farm details
    const [user, farm] = await Promise.all([
      getUser(alertEvent.userId),
      getFarm(alertEvent.farmId),
    ]);

    if (!user) {
      throw new Error(`User not found: ${alertEvent.userId}`);
    }

    if (!farm) {
      throw new Error(`Farm not found: ${alertEvent.farmId}`);
    }

    // Determine language for alert
    const language = user.language || farm.language || Language.ENGLISH;

    // Get presigned URL for the snapshot
    const snapshotUrl = await getFramePresignedUrl(alertEvent.frameSnapshotPath, 86400); // 24 hours

    // Compose alert message
    const alertMessage = await composeAlertMessage(
      alertEvent.threatType,
      farm.name,
      alertEvent.confidenceScore,
      new Date(alertEvent.timestamp),
      language
    );

    // Create alert record
    const alert: Alert = {
      alertId: generateId('alert'),
      farmId: alertEvent.farmId,
      userId: alertEvent.userId,
      type: 'threat',
      severity: alertEvent.threatType === ThreatType.FIRE ? 'critical' : 'warning',
      title: getThreatConfig(alertEvent.threatType).alertTitle,
      message: alertMessage.english,
      translatedMessage: alertMessage.translated,
      language,
      metadata: {
        threatId: alertEvent.threatId,
        threatType: alertEvent.threatType,
        confidenceScore: alertEvent.confidenceScore,
        snapshotUrl,
      },
      deliveryStatus: AlertDeliveryStatus.PENDING,
      deliveryAttempts: 0,
      createdAt: new Date().toISOString(),
    };

    // Save alert record
    await saveAlert(alert);

    // Send WhatsApp notification
    const deliveryResult = await sendAlertNotification(
      user.phoneNumber,
      alertMessage.translated,
      snapshotUrl,
      language,
      user.alertPreferences.voiceEnabled
    );

    // Update alert status
    const finalStatus = deliveryResult.success
      ? AlertDeliveryStatus.SENT
      : AlertDeliveryStatus.FAILED;

    await updateAlertStatus(
      alert.userId,
      alert.createdAt,
      finalStatus,
      deliveryResult.success ? new Date().toISOString() : undefined
    );

    // Update threat record with alert status
    await updateThreatAlertStatus(
      alertEvent.farmId,
      alertEvent.cameraId,
      alertEvent.timestamp,
      finalStatus,
      Date.now() - startTime
    );

    // Check latency and log warnings
    const totalLatency = Date.now() - startTime;
    if (totalLatency > LIMITS.LATENCY.END_TO_END) {
      console.error(`LATENCY VIOLATION: Alert took ${totalLatency}ms (limit: ${LIMITS.LATENCY.END_TO_END}ms)`);
      await logAuditEvent(
        alertEvent.farmId,
        AuditEventType.SYSTEM_ERROR,
        {
          type: 'latency_violation',
          latencyMs: totalLatency,
          limit: LIMITS.LATENCY.END_TO_END,
          threatId: alertEvent.threatId,
        },
        'failure',
        totalLatency
      );
    } else if (totalLatency > LIMITS.LATENCY.WARNING_THRESHOLD) {
      console.warn(`LATENCY WARNING: Alert took ${totalLatency}ms (warning threshold: ${LIMITS.LATENCY.WARNING_THRESHOLD}ms)`);
    }

    // Log successful alert
    await logAuditEvent(
      alertEvent.farmId,
      AuditEventType.ALERT_SENT,
      {
        alertId: alert.alertId,
        threatId: alertEvent.threatId,
        threatType: alertEvent.threatType,
        language,
        deliveryStatus: finalStatus,
        latencyMs: totalLatency,
      },
      'success',
      totalLatency
    );

    console.log(`Alert processed successfully in ${totalLatency}ms`);

  } catch (error) {
    console.error('Error processing alert:', error);

    // Log failure
    if (alertEvent) {
      await logAuditEvent(
        alertEvent.farmId,
        AuditEventType.ALERT_FAILED,
        {
          threatId: alertEvent.threatId,
          error: (error as Error).message,
          stack: (error as Error).stack,
        },
        'failure',
        Date.now() - startTime
      );
    }

    throw error; // Re-throw for retry
  }
}

// =============================================================================
// MESSAGE COMPOSITION
// =============================================================================

/**
 * Compose alert message in English and translate to target language
 */
async function composeAlertMessage(
  threatType: ThreatType,
  farmName: string,
  confidence: number,
  timestamp: Date,
  language: Language
): Promise<{ english: string; translated: string }> {
  // Compose English message
  const english = formatThreatAlert(threatType, farmName, confidence, timestamp);

  // If language is English, no translation needed
  if (language === Language.ENGLISH) {
    return { english, translated: english };
  }

  // Try to use predefined template for faster delivery
  const templateKey = `${threatType}Detected` as keyof typeof ALERT_TEMPLATES[Language.ENGLISH];
  const template = getAlertTemplate(templateKey, language);

  // Add dynamic details to template
  const timeStr = timestamp.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const dateStr = timestamp.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  // Combine template with details
  const translated = `${template}

${getLocalizedLabel('farm', language)}: ${farmName}
${getLocalizedLabel('time', language)}: ${timeStr}, ${dateStr}
${getLocalizedLabel('confidence', language)}: ${confidence}%`;

  return { english, translated };
}

/**
 * Get localized labels for common terms
 */
function getLocalizedLabel(key: string, language: Language): string {
  const labels: Record<string, Record<Language, string>> = {
    farm: {
      [Language.ENGLISH]: 'Farm',
      [Language.HINDI]: 'खेत',
      [Language.MARATHI]: 'शेत',
      [Language.TAMIL]: 'பண்ணை',
      [Language.TELUGU]: 'పొలం',
      [Language.KANNADA]: 'ಜಮೀನು',
      [Language.BENGALI]: 'খামার',
    },
    time: {
      [Language.ENGLISH]: 'Time',
      [Language.HINDI]: 'समय',
      [Language.MARATHI]: 'वेळ',
      [Language.TAMIL]: 'நேரம்',
      [Language.TELUGU]: 'సమయం',
      [Language.KANNADA]: 'ಸಮಯ',
      [Language.BENGALI]: 'সময়',
    },
    confidence: {
      [Language.ENGLISH]: 'Confidence',
      [Language.HINDI]: 'विश्वास',
      [Language.MARATHI]: 'विश्वास',
      [Language.TAMIL]: 'நம்பிக்கை',
      [Language.TELUGU]: 'విశ్వాసం',
      [Language.KANNADA]: 'ವಿಶ್ವಾಸ',
      [Language.BENGALI]: 'বিশ্বাস',
    },
  };

  return labels[key]?.[language] || labels[key]?.[Language.ENGLISH] || key;
}

// =============================================================================
// NOTIFICATION DELIVERY
// =============================================================================

/**
 * Send alert notification via WhatsApp
 */
async function sendAlertNotification(
  phoneNumber: string,
  message: string,
  snapshotUrl: string,
  language: Language,
  voiceEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Send main alert with image
    const mainResult = await sendWhatsAppWithImage(
      phoneNumber,
      message,
      snapshotUrl
    );

    if (!mainResult.success) {
      return { success: false, error: mainResult.errorMessage };
    }

    // Send voice message if enabled
    if (voiceEnabled) {
      await sendVoiceAlert(phoneNumber, message, language);
    }

    return { success: true };

  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Generate and send voice alert
 */
async function sendVoiceAlert(
  phoneNumber: string,
  message: string,
  language: Language
): Promise<void> {
  try {
    // Synthesize voice
    const voiceResult = await synthesizeVoice(message, language);

    if (!voiceResult.success || !voiceResult.audioBase64) {
      console.warn('Voice synthesis failed, skipping voice alert');
      return;
    }

    // Upload voice file to S3
    const audioBuffer = Buffer.from(voiceResult.audioBase64, 'base64');
    const voicePath = `voice-alerts/${Date.now()}-${generateId('voice')}.wav`;

    await uploadAsset(voicePath, audioBuffer, 'audio/wav', {
      language,
      timestamp: new Date().toISOString(),
    });

    // Get presigned URL for voice file
    const voiceUrl = await getAssetDownloadUrl(voicePath, 86400);

    // Send voice message via WhatsApp
    await sendWhatsAppVoiceMessage(phoneNumber, voiceUrl);

    console.log('Voice alert sent successfully');

  } catch (error) {
    console.error('Failed to send voice alert:', error);
    // Don't throw - voice is supplementary to main alert
  }
}

// =============================================================================
// RETRY HANDLER
// =============================================================================

/**
 * Retry failed alerts (called by scheduled Lambda)
 */
export async function retryFailedAlerts(): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  // This would query DynamoDB for alerts with status FAILED or RETRYING
  // and attempt to resend them
  // Implementation depends on query patterns
  return { retried: 0, succeeded: 0, failed: 0 };
}

// =============================================================================
// HEALTH ALERT HANDLER
// =============================================================================

/**
 * Send health score change alert
 */
export async function sendHealthAlert(
  userId: string,
  farmId: string,
  currentScore: number,
  previousScore: number,
  language: Language
): Promise<void> {
  const user = await getUser(userId);
  const farm = await getFarm(farmId);

  if (!user || !farm) {
    throw new Error('User or farm not found');
  }

  const delta = currentScore - previousScore;
  const isImproving = delta > 0;

  // Get appropriate template
  const templateKey = isImproving ? 'healthImproved' : 'healthDeclined';
  const template = getAlertTemplate(templateKey, language);

  const message = `${template}

${getLocalizedLabel('farm', language)}: ${farm.name}
${isImproving ? '📈' : '📉'} ${previousScore} → ${currentScore}
${delta > 0 ? '+' : ''}${delta} points`;

  // Create and save alert
  const alert: Alert = {
    alertId: generateId('alert'),
    farmId,
    userId,
    type: 'health',
    severity: currentScore < 40 ? 'warning' : 'info',
    title: isImproving ? 'Health Improved' : 'Health Declined',
    message,
    translatedMessage: message,
    language,
    metadata: {
      healthScore: currentScore,
      healthDelta: delta,
    },
    deliveryStatus: AlertDeliveryStatus.PENDING,
    deliveryAttempts: 0,
    createdAt: new Date().toISOString(),
  };

  await saveAlert(alert);

  // Send notification
  const result = await sendWhatsAppMessage(user.phoneNumber, message);

  await updateAlertStatus(
    alert.userId,
    alert.createdAt,
    result.success ? AlertDeliveryStatus.SENT : AlertDeliveryStatus.FAILED
  );
}
