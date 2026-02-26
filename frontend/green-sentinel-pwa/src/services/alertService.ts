// Alert Service - Handles WhatsApp and SMS alerts with cooldown and configuration

interface AlertPayload {
  farmName: string;
  threatType: 'fire' | 'human' | 'animal';
  timestamp: string;
  confidence: number;
  language: 'hi' | 'mr' | 'en';
  phoneNumber: string;
}

// Configuration from environment variables
const config = {
  enabled: import.meta.env.VITE_ENABLE_WHATSAPP_ALERTS === 'true',
  confidenceThreshold: parseInt(import.meta.env.VITE_ALERT_CONFIDENCE_THRESHOLD || '75'),
  cooldownSeconds: parseInt(import.meta.env.VITE_ALERT_COOLDOWN_SECONDS || '300'),
  backendUrl: import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001',
  phoneNumber: import.meta.env.VITE_ALERT_PHONE_NUMBER || '',
};

// Track last alert time per threat type to implement cooldown
const lastAlertTime: Record<string, number> = {
  fire: 0,
  human: 0,
  animal: 0,
};

// Message templates
const messageTemplates = {
  mr: {
    fire: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 आग चा धोका!\n\nशेत: ${farmName}\nवेळ: ${timestamp}\nविश्वास: ${confidence}%\n\nतातडीने तपासा!`,
    human: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 चोर चा धोका!\n\nशेत: ${farmName}\nवेळ: ${timestamp}\nविश्वास: ${confidence}%\n\nतातडीने कारवाई करा!`,
    animal: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 जनावर चा धोका!\n\nशेत: ${farmName}\nवेळ: ${timestamp}\nविश्वास: ${confidence}%\n\nतातडीने तपासा!`,
  },
  hi: {
    fire: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 आग का खतरा!\n\nखेत: ${farmName}\nसमय: ${timestamp}\nविश्वास: ${confidence}%\n\nतुरंत जांच करें!`,
    human: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 चोर का खतरा!\n\nखेत: ${farmName}\nसमय: ${timestamp}\nविश्वास: ${confidence}%\n\nतुरंत कार्रवाई करें!`,
    animal: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 जानवर का खतरा!\n\nखेत: ${farmName}\nसमय: ${timestamp}\nविश्वास: ${confidence}%\n\nतुरंत जांच करें!`,
  },
  en: {
    fire: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 FIRE ALERT!\n\nFarm: ${farmName}\nTime: ${timestamp}\nConfidence: ${confidence}%\n\nCheck immediately!`,
    human: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 INTRUDER ALERT!\n\nFarm: ${farmName}\nTime: ${timestamp}\nConfidence: ${confidence}%\n\nTake action now!`,
    animal: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 ANIMAL ALERT!\n\nFarm: ${farmName}\nTime: ${timestamp}\nConfidence: ${confidence}%\n\nCheck immediately!`,
  },
};

/**
 * Check if alert should be sent based on cooldown and confidence threshold
 */
const shouldSendAlert = (threatType: 'fire' | 'human' | 'animal', confidence: number): boolean => {
  // Check if alerts are enabled
  if (!config.enabled) {
    console.log('WhatsApp alerts are disabled');
    return false;
  }

  // Check confidence threshold
  if (confidence < config.confidenceThreshold) {
    console.log(`Confidence ${confidence}% below threshold ${config.confidenceThreshold}%`);
    return false;
  }

  // Check cooldown
  const now = Date.now() / 1000; // Convert to seconds
  const lastTime = lastAlertTime[threatType];
  const timeSinceLastAlert = now - lastTime;

  if (timeSinceLastAlert < config.cooldownSeconds) {
    console.log(
      `Alert cooldown active for ${threatType}. Wait ${Math.ceil(config.cooldownSeconds - timeSinceLastAlert)}s`
    );
    return false;
  }

  return true;
};

/**
 * Send threat alert via WhatsApp and SMS
 */
export const sendThreatAlert = async (alert: AlertPayload): Promise<void> => {
  // Check if alert should be sent
  if (!shouldSendAlert(alert.threatType, alert.confidence)) {
    console.log('Alert skipped due to configuration or cooldown');
    return;
  }

  if (!alert.phoneNumber) {
    throw new Error('Phone number is required');
  }

  try {
    const messageTemplate = messageTemplates[alert.language][alert.threatType];
    const message = messageTemplate(alert.farmName, alert.timestamp, alert.confidence);

    // Call backend API to send alerts
    const backendUrl = config.backendUrl || 'http://localhost:3001';
    console.log('Sending alert to:', `${backendUrl}/api/send-alert`);
    const response = await fetch(`${backendUrl}/api/send-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: alert.phoneNumber,
        message: message,
        threatType: alert.threatType,
        farmName: alert.farmName,
        timestamp: alert.timestamp,
        confidence: alert.confidence,
        language: alert.language,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send alert');
    }

    // Update last alert time on success
    lastAlertTime[alert.threatType] = Date.now() / 1000;

    const data = await response.json();
    console.log('Alert sent successfully:', data);
  } catch (error) {
    console.error('Error sending alert:', error);
    throw error;
  }
};

/**
 * Get message preview
 */
export const getMessagePreview = (
  farmName: string,
  threatType: 'fire' | 'human' | 'animal',
  timestamp: string,
  confidence: number,
  language: 'hi' | 'mr' | 'en'
): string => {
  const messageTemplate = messageTemplates[language][threatType];
  return messageTemplate(farmName, timestamp, confidence);
};

/**
 * Get current alert configuration
 */
export const getAlertConfig = () => ({
  enabled: config.enabled,
  confidenceThreshold: config.confidenceThreshold,
  cooldownSeconds: config.cooldownSeconds,
  backendUrl: config.backendUrl,
});

export default {
  sendThreatAlert,
  getMessagePreview,
  getAlertConfig,
};
