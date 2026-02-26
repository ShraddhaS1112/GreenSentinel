// Twilio WhatsApp Alert Service
// This service sends WhatsApp alerts via Twilio

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  toNumber: string;
}

interface AlertMessage {
  farmName: string;
  threatType: 'fire' | 'human' | 'animal';
  timestamp: string;
  confidence: number;
  language: 'hi' | 'mr' | 'en';
}

// Twilio configuration
const TWILIO_CONFIG: TwilioConfig = {
  accountSid: 'xxx',
  authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN || '[AuthToken]',
  fromNumber: 'whatsapp:+14155238886',
  toNumber: 'whatsapp:+xxx', // Farmer's WhatsApp number
};

// Message templates in different languages
const messageTemplates = {
  hi: {
    fire: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 आग का खतरा!\n\nखेत: ${farmName}\nसमय: ${timestamp}\nविश्वास: ${confidence}%\n\nतुरंत जांच करें!`,
    human: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 चोर का खतरा!\n\nखेत: ${farmName}\nसमय: ${timestamp}\nविश्वास: ${confidence}%\n\nतुरंत कार्रवाई करें!`,
    animal: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 जानवर का खतरा!\n\nखेत: ${farmName}\nसमय: ${timestamp}\nविश्वास: ${confidence}%\n\nतुरंत जांच करें!`,
  },
  mr: {
    fire: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 आग चा धोका!\n\nशेत: ${farmName}\nवेळ: ${timestamp}\nविश्वास: ${confidence}%\n\nतातडीने तपासा!`,
    human: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 चोर चा धोका!\n\nशेत: ${farmName}\nवेळ: ${timestamp}\nविश्वास: ${confidence}%\n\nतातडीने कारवाई करा!`,
    animal: (farmName: string, timestamp: string, confidence: number) =>
      `🚨 जनावर चा धोका!\n\nशेत: ${farmName}\nवेळ: ${timestamp}\nविश्वास: ${confidence}%\n\nतातडीने तपासा!`,
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
 * Send WhatsApp alert via Twilio
 * @param alert Alert message details
 * @returns Promise with message SID
 */
export const sendWhatsAppAlert = async (alert: AlertMessage): Promise<string> => {
  try {
    // Get the appropriate message template
    const messageTemplate = messageTemplates[alert.language][alert.threatType];
    const messageBody = messageTemplate(alert.farmName, alert.timestamp, alert.confidence);

    // Call backend API to send WhatsApp message
    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: TWILIO_CONFIG.toNumber,
        message: messageBody,
        farmName: alert.farmName,
        threatType: alert.threatType,
        timestamp: alert.timestamp,
        confidence: alert.confidence,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send WhatsApp alert: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('WhatsApp alert sent:', data.messageSid);
    return data.messageSid;
  } catch (error) {
    console.error('Error sending WhatsApp alert:', error);
    // In production, log this error to monitoring service
    throw error;
  }
};

/**
 * Send alert with automatic language detection
 * @param alert Alert message details (without language)
 * @param detectedLanguage Auto-detected language
 */
export const sendLocalizedAlert = async (
  alert: Omit<AlertMessage, 'language'>,
  detectedLanguage: 'hi' | 'mr' | 'en' = 'mr'
): Promise<string> => {
  return sendWhatsAppAlert({
    ...alert,
    language: detectedLanguage,
  });
};

/**
 * Format threat type for display
 */
export const formatThreatType = (
  type: 'fire' | 'human' | 'animal',
  language: 'hi' | 'mr' | 'en' = 'mr'
): string => {
  const labels = {
    hi: { fire: 'आग', human: 'चोर', animal: 'जानवर' },
    mr: { fire: 'आग', human: 'चोर', animal: 'जनावर' },
    en: { fire: 'Fire', human: 'Intruder', animal: 'Animal' },
  };
  return labels[language][type];
};

export default {
  sendWhatsAppAlert,
  sendLocalizedAlert,
  formatThreatType,
};
