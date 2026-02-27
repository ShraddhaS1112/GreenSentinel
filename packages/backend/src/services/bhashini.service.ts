/**
 * Green Sentinel - Bhashini Service
 *
 * Handles multilingual translation and voice synthesis using
 * India's Bhashini API for regional language support.
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { AWS_RESOURCES, LIMITS, LANGUAGES } from '@green-sentinel/shared';
import { Language } from '@green-sentinel/shared';
import { retryWithBackoff } from '@green-sentinel/shared';

// =============================================================================
// TYPES
// =============================================================================

export interface BhashiniCredentials {
  userId: string;
  ulcaApiKey: string;
  inferenceApiKey: string;
  pipelineId: string;
}

export interface TranslationResult {
  success: boolean;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  latencyMs: number;
  error?: string;
}

export interface VoiceSynthesisResult {
  success: boolean;
  audioBase64?: string;
  audioFormat: string;
  latencyMs: number;
  error?: string;
}

interface BhashiniPipelineConfig {
  pipelineId: string;
  tasks: BhashiniTask[];
}

interface BhashiniPipelineResponse {
  pipelineResponseConfig?: {
    pipelineId?: string;
    pipelineInferenceAPIEndPoint?: {
      inferenceApiKey?: {
        value?: string;
      };
    };
    config?: BhashiniTask[];
  };
}

interface BhashiniTranslationResponse {
  pipelineResponse?: Array<{
    output?: Array<{
      target?: string;
    }>;
  }>;
}

interface BhashiniTTSResponse {
  pipelineResponse?: Array<{
    audio?: Array<{
      audioContent?: string;
    }>;
  }>;
}

interface BhashiniTask {
  taskType: string;
  config: {
    language: {
      sourceLanguage: string;
      targetLanguage?: string;
    };
    serviceId?: string;
    gender?: string;
    samplingRate?: number;
  };
}

// =============================================================================
// CLIENT SETUP
// =============================================================================

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

let cachedCredentials: BhashiniCredentials | null = null;
let cachedPipelineConfig: BhashiniPipelineConfig | null = null;

const BHASHINI_BASE_URL = 'https://meity-auth.ulcacontrib.org';
const BHASHINI_INFERENCE_URL = 'https://dhruva-api.bhashini.gov.in';

/**
 * Get Bhashini credentials from Secrets Manager
 */
async function getBhashiniCredentials(): Promise<BhashiniCredentials> {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const command = new GetSecretValueCommand({
    SecretId: AWS_RESOURCES.SECRETS.BHASHINI_CREDENTIALS,
  });

  const response = await secretsClient.send(command);
  if (!response.SecretString) {
    throw new Error('Bhashini credentials not found in Secrets Manager');
  }

  cachedCredentials = JSON.parse(response.SecretString) as BhashiniCredentials;
  return cachedCredentials;
}

/**
 * Get pipeline configuration for translation/TTS
 */
async function getPipelineConfig(
  sourceLanguage: string,
  targetLanguage: string,
  includeTts: boolean = false
): Promise<BhashiniPipelineConfig> {
  const credentials = await getBhashiniCredentials();

  const tasks: BhashiniTask[] = [
    {
      taskType: 'translation',
      config: {
        language: {
          sourceLanguage,
          targetLanguage,
        },
      },
    },
  ];

  if (includeTts) {
    tasks.push({
      taskType: 'tts',
      config: {
        language: {
          sourceLanguage: targetLanguage,
        },
        gender: 'female',
        samplingRate: 8000,
      },
    });
  }

  const response = await fetch(`${BHASHINI_BASE_URL}/ulca/apis/v0/model/getModelsPipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ulcaApiKey': credentials.ulcaApiKey,
      'userID': credentials.userId,
    },
    body: JSON.stringify({
      pipelineTasks: tasks,
      pipelineRequestConfig: {
        pipelineId: credentials.pipelineId,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get pipeline config: ${response.statusText}`);
  }

  const data = await response.json() as BhashiniPipelineResponse;
  return {
    pipelineId: data.pipelineResponseConfig?.pipelineId || credentials.pipelineId,
    tasks: data.pipelineResponseConfig?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value
      ? data.pipelineResponseConfig.config ?? tasks
      : tasks,
  };
}

// =============================================================================
// TRANSLATION
// =============================================================================

/**
 * Translate text from English to target language
 */
export async function translateText(
  text: string,
  targetLanguage: Language,
  sourceLanguage: Language = Language.ENGLISH
): Promise<TranslationResult> {
  const startTime = Date.now();

  // If source and target are the same, return as-is
  if (sourceLanguage === targetLanguage) {
    return {
      success: true,
      translatedText: text,
      sourceLanguage,
      targetLanguage,
      latencyMs: 0,
    };
  }

  try {
    const credentials = await getBhashiniCredentials();
    const langConfig = LANGUAGES[targetLanguage];

    if (!langConfig) {
      throw new Error(`Unsupported language: ${targetLanguage}`);
    }

    const response = await retryWithBackoff(
      async () => {
        const res = await fetch(`${BHASHINI_INFERENCE_URL}/services/inference/pipeline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': credentials.inferenceApiKey,
          },
          body: JSON.stringify({
            pipelineTasks: [
              {
                taskType: 'translation',
                config: {
                  language: {
                    sourceLanguage: LANGUAGES[sourceLanguage]?.bhashiniCode || 'en',
                    targetLanguage: langConfig.bhashiniCode,
                  },
                },
              },
            ],
            inputData: {
              input: [{ source: text }],
            },
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Translation API error: ${res.status} - ${errorText}`);
        }

        return res.json() as Promise<BhashiniTranslationResponse>;
      },
      3
    );

    const translatedText = response.pipelineResponse?.[0]?.output?.[0]?.target || text;

    return {
      success: true,
      translatedText,
      sourceLanguage,
      targetLanguage,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Translation error:', error);

    return {
      success: false,
      translatedText: text, // Return original text on failure
      sourceLanguage,
      targetLanguage,
      latencyMs: Date.now() - startTime,
      error: (error as Error).message,
    };
  }
}

/**
 * Translate alert message with context-aware handling
 */
export async function translateAlertMessage(
  message: string,
  targetLanguage: Language
): Promise<string> {
  // If English, return as-is
  if (targetLanguage === Language.ENGLISH) {
    return message;
  }

  const result = await translateText(message, targetLanguage);
  return result.translatedText;
}

// =============================================================================
// VOICE SYNTHESIS (TTS)
// =============================================================================

/**
 * Convert text to speech in the specified language
 */
export async function synthesizeVoice(
  text: string,
  language: Language
): Promise<VoiceSynthesisResult> {
  const startTime = Date.now();

  try {
    const credentials = await getBhashiniCredentials();
    const langConfig = LANGUAGES[language];

    if (!langConfig?.voiceSupported) {
      throw new Error(`Voice synthesis not supported for: ${language}`);
    }

    const response = await retryWithBackoff(
      async () => {
        const res = await fetch(`${BHASHINI_INFERENCE_URL}/services/inference/pipeline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': credentials.inferenceApiKey,
          },
          body: JSON.stringify({
            pipelineTasks: [
              {
                taskType: 'tts',
                config: {
                  language: {
                    sourceLanguage: langConfig.bhashiniCode,
                  },
                  gender: 'female',
                  samplingRate: 8000,
                },
              },
            ],
            inputData: {
              input: [{ source: text }],
            },
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`TTS API error: ${res.status} - ${errorText}`);
        }

        return res.json() as Promise<BhashiniTTSResponse>;
      },
      3
    );

    const audioBase64 = response.pipelineResponse?.[0]?.audio?.[0]?.audioContent;

    if (!audioBase64) {
      throw new Error('No audio content in response');
    }

    return {
      success: true,
      audioBase64,
      audioFormat: 'wav',
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Voice synthesis error:', error);

    return {
      success: false,
      audioFormat: 'wav',
      latencyMs: Date.now() - startTime,
      error: (error as Error).message,
    };
  }
}

/**
 * Translate and synthesize voice for an alert message
 */
export async function translateAndSynthesizeAlert(
  message: string,
  targetLanguage: Language
): Promise<{
  translatedText: string;
  audioBase64?: string;
  error?: string;
}> {
  // First translate
  const translationResult = await translateText(message, targetLanguage);

  if (!translationResult.success) {
    return {
      translatedText: message,
      error: `Translation failed: ${translationResult.error}`,
    };
  }

  // Then synthesize voice
  const voiceResult = await synthesizeVoice(translationResult.translatedText, targetLanguage);

  return {
    translatedText: translationResult.translatedText,
    audioBase64: voiceResult.audioBase64,
    error: voiceResult.error,
  };
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Translate multiple texts in batch
 */
export async function batchTranslate(
  texts: string[],
  targetLanguage: Language,
  sourceLanguage: Language = Language.ENGLISH
): Promise<TranslationResult[]> {
  const results: TranslationResult[] = [];

  // Process in batches to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(text => translateText(text, targetLanguage, sourceLanguage))
    );
    results.push(...batchResults);
  }

  return results;
}

// =============================================================================
// PREDEFINED ALERT TEMPLATES
// =============================================================================

/**
 * Get predefined alert templates in different languages
 * These are pre-translated to avoid API latency for common messages
 */
export const ALERT_TEMPLATES: Record<Language, {
  fireDetected: string;
  humanDetected: string;
  animalDetected: string;
  healthDeclined: string;
  healthImproved: string;
}> = {
  [Language.ENGLISH]: {
    fireDetected: '🔥 FIRE DETECTED at your farm! Check immediately.',
    humanDetected: '🚨 INTRUDER DETECTED at your farm! Unknown person spotted.',
    animalDetected: '🐾 ANIMAL DETECTED at your farm! Wildlife or stray animal spotted.',
    healthDeclined: '📉 Crop health has declined significantly. Inspection recommended.',
    healthImproved: '📈 Good news! Crop health has improved.',
  },
  [Language.HINDI]: {
    fireDetected: '🔥 आपके खेत में आग का पता चला! तुरंत जांचें।',
    humanDetected: '🚨 आपके खेत में घुसपैठिया! अज्ञात व्यक्ति देखा गया।',
    animalDetected: '🐾 आपके खेत में जानवर का पता चला! जंगली या आवारा जानवर।',
    healthDeclined: '📉 फसल स्वास्थ्य में काफी गिरावट। निरीक्षण की सिफारिश।',
    healthImproved: '📈 अच्छी खबर! फसल स्वास्थ्य में सुधार हुआ है।',
  },
  [Language.MARATHI]: {
    fireDetected: '🔥 तुमच्या शेतात आग लागली! लगेच तपासा.',
    humanDetected: '🚨 तुमच्या शेतात घुसखोर! अनोळखी व्यक्ती दिसली.',
    animalDetected: '🐾 तुमच्या शेतात प्राणी आढळला! वन्य किंवा भटके प्राणी.',
    healthDeclined: '📉 पिकांचे आरोग्य लक्षणीयरीत्या घसरले. तपासणी आवश्यक.',
    healthImproved: '📈 चांगली बातमी! पिकांचे आरोग्य सुधारले आहे.',
  },
  [Language.TAMIL]: {
    fireDetected: '🔥 உங்கள் பண்ணையில் தீ கண்டறியப்பட்டது! உடனடியாக சரிபார்க்கவும்.',
    humanDetected: '🚨 உங்கள் பண்ணையில் ஊடுருவல்! அறியாத நபர் கண்டறியப்பட்டார்.',
    animalDetected: '🐾 உங்கள் பண்ணையில் விலங்கு கண்டறியப்பட்டது! காட்டு அல்லது தெரு விலங்கு.',
    healthDeclined: '📉 பயிர் ஆரோக்கியம் கணிசமாக குறைந்துள்ளது. ஆய்வு பரிந்துரைக்கப்படுகிறது.',
    healthImproved: '📈 நல்ல செய்தி! பயிர் ஆரோக்கியம் மேம்பட்டுள்ளது.',
  },
  [Language.TELUGU]: {
    fireDetected: '🔥 మీ పొలంలో మంటలు గుర్తించబడ్డాయి! వెంటనే తనిఖీ చేయండి.',
    humanDetected: '🚨 మీ పొలంలో చొరబాటుదారుడు! తెలియని వ్యక్తి కనుగొనబడ్డాడు.',
    animalDetected: '🐾 మీ పొలంలో జంతువు గుర్తించబడింది! అడవి లేదా వీధి జంతువు.',
    healthDeclined: '📉 పంట ఆరోగ్యం గణనీయంగా క్షీణించింది. తనిఖీ సిఫారసు చేయబడింది.',
    healthImproved: '📈 మంచి వార్త! పంట ఆరోగ్యం మెరుగుపడింది.',
  },
  [Language.KANNADA]: {
    fireDetected: '🔥 ನಿಮ್ಮ ಜಮೀನಿನಲ್ಲಿ ಬೆಂಕಿ ಪತ್ತೆಯಾಗಿದೆ! ತಕ್ಷಣ ಪರಿಶೀಲಿಸಿ.',
    humanDetected: '🚨 ನಿಮ್ಮ ಜಮೀನಿನಲ್ಲಿ ಒಳನುಗ್ಗುವವರು! ಅಪರಿಚಿತ ವ್ಯಕ್ತಿ ಕಂಡುಬಂದಿದ್ದಾರೆ.',
    animalDetected: '🐾 ನಿಮ್ಮ ಜಮೀನಿನಲ್ಲಿ ಪ್ರಾಣಿ ಪತ್ತೆಯಾಗಿದೆ! ಕಾಡು ಅಥವಾ ಬೀದಿ ಪ್ರಾಣಿ.',
    healthDeclined: '📉 ಬೆಳೆ ಆರೋಗ್ಯ ಗಣನೀಯವಾಗಿ ಕುಸಿದಿದೆ. ತಪಾಸಣೆ ಶಿಫಾರಸು.',
    healthImproved: '📈 ಒಳ್ಳೆಯ ಸುದ್ದಿ! ಬೆಳೆ ಆರೋಗ್ಯ ಸುಧಾರಿಸಿದೆ.',
  },
  [Language.BENGALI]: {
    fireDetected: '🔥 আপনার খামারে আগুন ধরা পড়েছে! অবিলম্বে পরীক্ষা করুন।',
    humanDetected: '🚨 আপনার খামারে অনুপ্রবেশকারী! অজানা ব্যক্তি দেখা গেছে।',
    animalDetected: '🐾 আপনার খামারে পশু সনাক্ত! বন্য বা পথের পশু।',
    healthDeclined: '📉 ফসলের স্বাস্থ্য উল্লেখযোগ্যভাবে হ্রাস পেয়েছে। পরিদর্শন সুপারিশ।',
    healthImproved: '📈 সুখবর! ফসলের স্বাস্থ্যের উন্নতি হয়েছে।',
  },
};

/**
 * Get a predefined template in the specified language
 */
export function getAlertTemplate(
  templateKey: keyof typeof ALERT_TEMPLATES[Language.ENGLISH],
  language: Language
): string {
  return ALERT_TEMPLATES[language]?.[templateKey] || ALERT_TEMPLATES[Language.ENGLISH][templateKey];
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Check if Bhashini service is configured and operational
 */
export async function checkBhashiniHealth(): Promise<{
  configured: boolean;
  translationWorking: boolean;
  ttsWorking: boolean;
  error?: string;
}> {
  try {
    const credentials = await getBhashiniCredentials();

    if (!credentials.userId || !credentials.ulcaApiKey) {
      return {
        configured: false,
        translationWorking: false,
        ttsWorking: false,
        error: 'Missing Bhashini credentials',
      };
    }

    // Test translation
    const translationTest = await translateText(
      'Test',
      Language.HINDI,
      Language.ENGLISH
    );

    // Test TTS
    const ttsTest = await synthesizeVoice('टेस्ट', Language.HINDI);

    return {
      configured: true,
      translationWorking: translationTest.success,
      ttsWorking: ttsTest.success,
    };
  } catch (error) {
    return {
      configured: false,
      translationWorking: false,
      ttsWorking: false,
      error: (error as Error).message,
    };
  }
}
