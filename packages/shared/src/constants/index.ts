/**
 * Green Sentinel - Application Constants
 *
 * Centralized constants used across the application.
 * These values should match AWS infrastructure configuration.
 */

// =============================================================================
// AWS RESOURCE NAMES
// =============================================================================

export const AWS_RESOURCES = {
  // DynamoDB Tables
  TABLES: {
    THREATS: 'GreenSentinel-Threats',
    HEALTH_SCORES: 'GreenSentinel-HealthScores',
    FARMS: 'GreenSentinel-Farms',
    USERS: 'GreenSentinel-Users',
    AUDIT_LOGS: 'GreenSentinel-AuditLogs',
    ALERTS: 'GreenSentinel-Alerts',
  },

  // S3 Buckets
  BUCKETS: {
    FRAMES: 'green-sentinel-frames',
    HEATMAPS: 'green-sentinel-heatmaps',
    ASSETS: 'green-sentinel-assets',
  },

  // SQS Queues
  QUEUES: {
    FRAME_PROCESSING: 'GreenSentinel-FrameProcessing',
    THREAT_ALERTS: 'GreenSentinel-ThreatAlerts',
    HEALTH_PROCESSING: 'GreenSentinel-HealthProcessing',
    DEAD_LETTER: 'GreenSentinel-DeadLetter',
  },

  // SNS Topics
  TOPICS: {
    THREAT_NOTIFICATIONS: 'GreenSentinel-ThreatNotifications',
    SYSTEM_ALERTS: 'GreenSentinel-SystemAlerts',
  },

  // Secrets Manager
  SECRETS: {
    CAMERA_CREDENTIALS_PREFIX: 'green-sentinel/cameras/',
    API_KEYS: 'green-sentinel/api-keys',
    TWILIO_CREDENTIALS: 'green-sentinel/twilio',
    BHASHINI_CREDENTIALS: 'green-sentinel/bhashini',
  },
} as const;

// =============================================================================
// DEFAULT THRESHOLDS & LIMITS
// =============================================================================

export const THRESHOLDS = {
  // Threat detection confidence thresholds (percentage)
  THREAT_DETECTION: {
    fire: 80,
    human: 80,
    animal: 75,
  },

  // NDVI health categories
  NDVI: {
    EXCELLENT: 0.6,
    GOOD: 0.5,
    MODERATE: 0.3,
    POOR: 0.2,
  },

  // Health score change alert threshold
  HEALTH_SCORE_CHANGE: 10,

  // Cloud cover threshold for using cached data
  CLOUD_COVER_MAX: 80,
} as const;

export const LIMITS = {
  // Frame capture
  FRAME: {
    MIN_INTERVAL_SECONDS: 5,
    MAX_INTERVAL_SECONDS: 10,
    DEFAULT_INTERVAL_SECONDS: 5,
    MAX_SIZE_BYTES: 500 * 1024,  // 500KB
    TTL_HOURS: 24,
  },

  // Cameras per farm
  CAMERAS: {
    MAX_PER_FARM: 10,
  },

  // Latency budgets (milliseconds)
  LATENCY: {
    FRAME_ANALYSIS: 3000,
    ALERT_DELIVERY: 7000,
    END_TO_END: 10000,
    WARNING_THRESHOLD: 8000,
  },

  // Retry configurations
  RETRY: {
    MAX_RTSP_RETRIES: 4,
    MAX_ALERT_RETRIES: 5,
    ALERT_RETRY_WINDOW_MINUTES: 30,
    BACKOFF_BASE_MS: 1000,
    BACKOFF_MAX_MS: 8000,
  },

  // API rate limits
  API: {
    REQUESTS_PER_MINUTE: 100,
    BATCH_SIZE: 25,
  },

  // AWS Free Tier limits
  FREE_TIER: {
    LAMBDA_INVOCATIONS_MONTHLY: 1_000_000,
    S3_STORAGE_GB: 5,
    DYNAMODB_STORAGE_GB: 25,
    DYNAMODB_RCU: 25,
    DYNAMODB_WCU: 25,
  },
} as const;

// =============================================================================
// TIME CONSTANTS
// =============================================================================

export const TIME = {
  // Token expiry
  JWT_EXPIRY_SECONDS: 3600,  // 1 hour
  REFRESH_TOKEN_EXPIRY_DAYS: 7,

  // Credential rotation
  CREDENTIAL_ROTATION_DAYS: 90,

  // NDVI fetch schedule (UTC)
  NDVI_FETCH_HOUR: 6,
  NDVI_FETCH_MINUTE: 0,

  // Cache durations
  NDVI_CACHE_DAYS: 7,

  // Connection timeouts
  RTSP_CONNECTION_TIMEOUT_MS: 30000,
  API_TIMEOUT_MS: 10000,
} as const;

// =============================================================================
// LANGUAGE CONFIGURATION
// =============================================================================

export const LANGUAGES = {
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    bhashiniCode: 'hi',
    voiceSupported: true,
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    bhashiniCode: 'mr',
    voiceSupported: true,
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    bhashiniCode: 'ta',
    voiceSupported: true,
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    bhashiniCode: 'te',
    voiceSupported: true,
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    bhashiniCode: 'kn',
    voiceSupported: true,
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    bhashiniCode: 'bn',
    voiceSupported: true,
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    bhashiniCode: 'en',
    voiceSupported: true,
  },
} as const;

// =============================================================================
// THREAT TYPE CONFIGURATION
// =============================================================================

export const THREAT_CONFIG = {
  fire: {
    type: 'fire',
    emoji: '🔥',
    severity: 'critical',
    defaultThreshold: 80,
    alertTitle: 'Fire Detected',
    alertTitleHi: 'आग का पता चला',
    color: '#FF4444',
  },
  human: {
    type: 'human',
    emoji: '🚨',
    severity: 'critical',
    defaultThreshold: 80,
    alertTitle: 'Intruder Detected',
    alertTitleHi: 'घुसपैठिया पाया गया',
    color: '#FF8800',
  },
  animal: {
    type: 'animal',
    emoji: '🐾',
    severity: 'warning',
    defaultThreshold: 75,
    alertTitle: 'Animal Detected',
    alertTitleHi: 'जानवर का पता चला',
    color: '#FFBB00',
  },
} as const;

// =============================================================================
// HEALTH CATEGORY CONFIGURATION
// =============================================================================

export const HEALTH_CATEGORY_CONFIG = {
  excellent: {
    minScore: 80,
    color: '#22C55E',
    label: 'Excellent',
    labelHi: 'उत्कृष्ट',
    description: 'Crops are in peak health',
  },
  good: {
    minScore: 70,
    color: '#84CC16',
    label: 'Good',
    labelHi: 'अच्छा',
    description: 'Crops are healthy',
  },
  moderate: {
    minScore: 50,
    color: '#EAB308',
    label: 'Moderate',
    labelHi: 'मध्यम',
    description: 'Crops need attention',
  },
  poor: {
    minScore: 40,
    color: '#F97316',
    label: 'Poor',
    labelHi: 'खराब',
    description: 'Crops are stressed',
  },
  critical: {
    minScore: 0,
    color: '#EF4444',
    label: 'Critical',
    labelHi: 'गंभीर',
    description: 'Immediate intervention needed',
  },
} as const;

// =============================================================================
// AI MODEL CONFIGURATION
// =============================================================================

export const AI_CONFIG = {
  BEDROCK: {
    MODEL_ID: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    REGION: 'us-east-1',
    MAX_TOKENS: 1024,
    TEMPERATURE: 0.1,
    THREAT_ANALYSIS_PROMPT: `Analyze this farm camera frame for potential threats. You are a security system for agricultural farms in India.

Identify and score the following threats on a scale of 0-100%:
1. FIRE: Look for flames, smoke, burning, unusual orange/red glow, smoldering
2. HUMAN INTRUDERS: Look for people who appear to be trespassing, unusual human activity
3. ANIMALS: Look for cattle, wild boar, monkeys, elephants, or other animals that could damage crops

Return ONLY a JSON object in this exact format (no markdown, no explanation):
{"fire": <0-100>, "human": <0-100>, "animal": <0-100>}

Be conservative - only report high confidence when you are certain. A score of 80+ means you are highly confident the threat is present.`,
  },
} as const;

// =============================================================================
// SENTINEL HUB CONFIGURATION
// =============================================================================

export const SENTINEL_HUB_CONFIG = {
  BASE_URL: 'https://services.sentinel-hub.com',
  EVALSCRIPT_NDVI: `//VERSION=3
function setup() {
  return {
    input: [{bands: ["B04", "B08"]}],
    output: {bands: 1, sampleType: "FLOAT32"}
  };
}

function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  return [ndvi];
}`,
  DATA_COLLECTION: 'sentinel-2-l2a',
  RESOLUTION: 10,  // meters
  MAX_CLOUD_COVERAGE: 80,
} as const;

// =============================================================================
// ERROR CODES
// =============================================================================

export const ERROR_CODES = {
  // Authentication errors (1xxx)
  AUTH_INVALID_TOKEN: 'E1001',
  AUTH_EXPIRED_TOKEN: 'E1002',
  AUTH_MISSING_TOKEN: 'E1003',
  AUTH_INVALID_CREDENTIALS: 'E1004',
  AUTH_USER_NOT_FOUND: 'E1005',

  // Camera errors (2xxx)
  CAMERA_CONNECTION_FAILED: 'E2001',
  CAMERA_FRAME_CAPTURE_FAILED: 'E2002',
  CAMERA_INVALID_CREDENTIALS: 'E2003',
  CAMERA_NOT_FOUND: 'E2004',
  CAMERA_LIMIT_EXCEEDED: 'E2005',

  // Threat detection errors (3xxx)
  THREAT_ANALYSIS_FAILED: 'E3001',
  THREAT_ANALYSIS_TIMEOUT: 'E3002',
  THREAT_INVALID_FRAME: 'E3003',

  // NDVI errors (4xxx)
  NDVI_FETCH_FAILED: 'E4001',
  NDVI_CLOUD_COVER_HIGH: 'E4002',
  NDVI_INVALID_COORDINATES: 'E4003',

  // Alert errors (5xxx)
  ALERT_DELIVERY_FAILED: 'E5001',
  ALERT_TRANSLATION_FAILED: 'E5002',
  ALERT_VOICE_SYNTHESIS_FAILED: 'E5003',
  ALERT_INVALID_PHONE: 'E5004',

  // Farm errors (6xxx)
  FARM_NOT_FOUND: 'E6001',
  FARM_ACCESS_DENIED: 'E6002',
  FARM_LIMIT_EXCEEDED: 'E6003',

  // System errors (9xxx)
  SYSTEM_INTERNAL_ERROR: 'E9001',
  SYSTEM_SERVICE_UNAVAILABLE: 'E9002',
  SYSTEM_RATE_LIMITED: 'E9003',
  SYSTEM_INVALID_REQUEST: 'E9004',
} as const;
