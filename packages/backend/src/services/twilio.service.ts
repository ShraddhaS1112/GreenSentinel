/**
 * Green Sentinel - Twilio Service
 *
 * Handles WhatsApp message delivery using Twilio API.
 * Supports text messages, images, and voice notes.
 */

import Twilio from 'twilio';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { AWS_RESOURCES, LIMITS } from '@green-sentinel/shared';
import { AlertDeliveryStatus } from '@green-sentinel/shared';
import { retryWithBackoff } from '@green-sentinel/shared';

// =============================================================================
// TYPES
// =============================================================================

export interface WhatsAppDeliveryResult {
  success: boolean;
  messageSid?: string;
  status: AlertDeliveryStatus;
  errorCode?: string;
  errorMessage?: string;
  deliveryTimeMs: number;
}

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
}

// =============================================================================
// CLIENT SETUP
// =============================================================================

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

let twilioClient: Twilio.Twilio | null = null;
let cachedCredentials: TwilioCredentials | null = null;

/**
 * Get Twilio credentials from Secrets Manager
 */
async function getTwilioCredentials(): Promise<TwilioCredentials> {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const command = new GetSecretValueCommand({
    SecretId: AWS_RESOURCES.SECRETS.TWILIO_CREDENTIALS,
  });

  const response = await secretsClient.send(command);
  if (!response.SecretString) {
    throw new Error('Twilio credentials not found in Secrets Manager');
  }

  cachedCredentials = JSON.parse(response.SecretString) as TwilioCredentials;
  return cachedCredentials;
}

/**
 * Get or create Twilio client
 */
async function getTwilioClient(): Promise<Twilio.Twilio> {
  if (twilioClient) {
    return twilioClient;
  }

  const credentials = await getTwilioCredentials();
  twilioClient = Twilio(credentials.accountSid, credentials.authToken);
  return twilioClient;
}

// =============================================================================
// MESSAGE DELIVERY
// =============================================================================

/**
 * Send a WhatsApp text message
 */
export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<WhatsAppDeliveryResult> {
  const startTime = Date.now();

  try {
    const client = await getTwilioClient();
    const credentials = await getTwilioCredentials();

    // Format phone number for WhatsApp
    const formattedTo = formatWhatsAppNumber(to);

    const message = await retryWithBackoff(
      async () => {
        return client.messages.create({
          from: `whatsapp:${credentials.whatsappNumber}`,
          to: formattedTo,
          body,
        });
      },
      LIMITS.RETRY.MAX_ALERT_RETRIES
    );

    return {
      success: true,
      messageSid: message.sid,
      status: mapTwilioStatus(message.status),
      deliveryTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return handleTwilioError(error, startTime);
  }
}

/**
 * Send a WhatsApp message with image attachment
 */
export async function sendWhatsAppWithImage(
  to: string,
  body: string,
  imageUrl: string
): Promise<WhatsAppDeliveryResult> {
  const startTime = Date.now();

  try {
    const client = await getTwilioClient();
    const credentials = await getTwilioCredentials();

    const formattedTo = formatWhatsAppNumber(to);

    const message = await retryWithBackoff(
      async () => {
        return client.messages.create({
          from: `whatsapp:${credentials.whatsappNumber}`,
          to: formattedTo,
          body,
          mediaUrl: [imageUrl],
        });
      },
      LIMITS.RETRY.MAX_ALERT_RETRIES
    );

    return {
      success: true,
      messageSid: message.sid,
      status: mapTwilioStatus(message.status),
      deliveryTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return handleTwilioError(error, startTime);
  }
}

/**
 * Send a WhatsApp voice message (audio file)
 */
export async function sendWhatsAppVoiceMessage(
  to: string,
  audioUrl: string,
  caption?: string
): Promise<WhatsAppDeliveryResult> {
  const startTime = Date.now();

  try {
    const client = await getTwilioClient();
    const credentials = await getTwilioCredentials();

    const formattedTo = formatWhatsAppNumber(to);

    const message = await retryWithBackoff(
      async () => {
        return client.messages.create({
          from: `whatsapp:${credentials.whatsappNumber}`,
          to: formattedTo,
          body: caption || '',
          mediaUrl: [audioUrl],
        });
      },
      LIMITS.RETRY.MAX_ALERT_RETRIES
    );

    return {
      success: true,
      messageSid: message.sid,
      status: mapTwilioStatus(message.status),
      deliveryTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return handleTwilioError(error, startTime);
  }
}

/**
 * Send a complete threat alert with text and image
 */
export async function sendThreatAlert(
  to: string,
  alertMessage: string,
  snapshotUrl: string,
  voiceMessageUrl?: string
): Promise<WhatsAppDeliveryResult[]> {
  const results: WhatsAppDeliveryResult[] = [];

  // Send main message with image
  const mainResult = await sendWhatsAppWithImage(to, alertMessage, snapshotUrl);
  results.push(mainResult);

  // Send voice message if available
  if (voiceMessageUrl && mainResult.success) {
    const voiceResult = await sendWhatsAppVoiceMessage(to, voiceMessageUrl);
    results.push(voiceResult);
  }

  return results;
}

// =============================================================================
// MESSAGE STATUS TRACKING
// =============================================================================

/**
 * Check the delivery status of a message
 */
export async function checkMessageStatus(messageSid: string): Promise<AlertDeliveryStatus> {
  try {
    const client = await getTwilioClient();
    const message = await client.messages(messageSid).fetch();
    return mapTwilioStatus(message.status);
  } catch {
    return AlertDeliveryStatus.FAILED;
  }
}

/**
 * Map Twilio status to our AlertDeliveryStatus
 */
function mapTwilioStatus(twilioStatus: string): AlertDeliveryStatus {
  switch (twilioStatus) {
    case 'queued':
    case 'sending':
    case 'accepted':
      return AlertDeliveryStatus.PENDING;
    case 'sent':
      return AlertDeliveryStatus.SENT;
    case 'delivered':
    case 'read':
      return AlertDeliveryStatus.DELIVERED;
    case 'failed':
    case 'undelivered':
      return AlertDeliveryStatus.FAILED;
    default:
      return AlertDeliveryStatus.PENDING;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format phone number for WhatsApp
 */
function formatWhatsAppNumber(phone: string): string {
  // Remove any existing whatsapp: prefix
  let cleaned = phone.replace(/^whatsapp:/, '');

  // Remove spaces and dashes
  cleaned = cleaned.replace(/[\s-]/g, '');

  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    // Assume Indian number if no country code
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }

  return `whatsapp:${cleaned}`;
}

/**
 * Handle Twilio errors
 */
function handleTwilioError(error: unknown, startTime: number): WhatsAppDeliveryResult {
  const err = error as Error & { code?: number; moreInfo?: string };

  console.error('Twilio error:', {
    message: err.message,
    code: err.code,
    moreInfo: err.moreInfo,
  });

  // Map common Twilio error codes
  let status = AlertDeliveryStatus.FAILED;
  if (err.code === 21608 || err.code === 21614) {
    // Template errors or unregistered number - retryable
    status = AlertDeliveryStatus.RETRYING;
  }

  return {
    success: false,
    status,
    errorCode: err.code?.toString(),
    errorMessage: err.message,
    deliveryTimeMs: Date.now() - startTime,
  };
}

/**
 * Validate that a phone number can receive WhatsApp messages
 */
export async function validateWhatsAppNumber(phone: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const client = await getTwilioClient();

    // Twilio doesn't have a direct WhatsApp validation endpoint,
    // but we can check if the number format is valid
    const formattedNumber = formatWhatsAppNumber(phone).replace('whatsapp:', '');

    // Use Twilio lookup to validate the number
    const lookup = await client.lookups.v2.phoneNumbers(formattedNumber).fetch();

    return {
      valid: lookup.valid ?? false,
    };
  } catch (error) {
    return {
      valid: false,
      error: (error as Error).message,
    };
  }
}

// =============================================================================
// TEMPLATE MESSAGES
// =============================================================================

/**
 * Send a template-based message (for WhatsApp Business API)
 */
export async function sendTemplateMessage(
  to: string,
  templateSid: string,
  variables: Record<string, string>
): Promise<WhatsAppDeliveryResult> {
  const startTime = Date.now();

  try {
    const client = await getTwilioClient();
    const credentials = await getTwilioCredentials();

    const formattedTo = formatWhatsAppNumber(to);

    // Build content variables for template
    const contentVariables = JSON.stringify(variables);

    const message = await retryWithBackoff(
      async () => {
        return client.messages.create({
          from: `whatsapp:${credentials.whatsappNumber}`,
          to: formattedTo,
          contentSid: templateSid,
          contentVariables,
        });
      },
      LIMITS.RETRY.MAX_ALERT_RETRIES
    );

    return {
      success: true,
      messageSid: message.sid,
      status: mapTwilioStatus(message.status),
      deliveryTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return handleTwilioError(error, startTime);
  }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Check if Twilio service is configured and operational
 */
export async function checkTwilioHealth(): Promise<{
  configured: boolean;
  operational: boolean;
  error?: string;
}> {
  try {
    const credentials = await getTwilioCredentials();

    if (!credentials.accountSid || !credentials.authToken) {
      return {
        configured: false,
        operational: false,
        error: 'Missing Twilio credentials',
      };
    }

    const client = await getTwilioClient();

    // Try to fetch account info
    const account = await client.api.accounts(credentials.accountSid).fetch();

    return {
      configured: true,
      operational: account.status === 'active',
    };
  } catch (error) {
    return {
      configured: false,
      operational: false,
      error: (error as Error).message,
    };
  }
}
