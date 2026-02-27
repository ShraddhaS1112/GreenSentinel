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
// FREE SATELLITE DATA CONFIGURATION (AWS Open Data)
// =============================================================================

export const SATELLITE_CONFIG = {
  // AWS Open Data - Sentinel-2 Cloud Optimized GeoTIFFs (FREE)
  AWS_OPEN_DATA: {
    BUCKET: 'sentinel-cogs',
    PREFIX: 'sentinel-s2-l2a-cogs',
    REGION: 'us-west-2',
  },

  // Element84 STAC API for scene search (FREE)
  STAC_API: {
    URL: 'https://earth-search.aws.element84.com/v1',
    COLLECTION: 'sentinel-2-l2a',
  },

  // Sentinel-2 Band Configuration
  BANDS: {
    B02: { name: 'blue', resolution: 10, wavelength: '490nm' },
    B03: { name: 'green', resolution: 10, wavelength: '560nm' },
    B04: { name: 'red', resolution: 10, wavelength: '665nm' },
    B08: { name: 'nir', resolution: 10, wavelength: '842nm' },
    B11: { name: 'swir1', resolution: 20, wavelength: '1610nm' },
    B12: { name: 'swir2', resolution: 20, wavelength: '2190nm' },
    SCL: { name: 'scene_classification', resolution: 20 },
  },

  // Vegetation Index Formulas
  INDICES: {
    NDVI: {
      name: 'Normalized Difference Vegetation Index',
      formula: '(B08 - B04) / (B08 + B04)',
      range: [-1, 1],
      description: 'Measures vegetation health and density',
    },
    NDWI: {
      name: 'Normalized Difference Water Index',
      formula: '(B03 - B08) / (B03 + B08)',
      range: [-1, 1],
      description: 'Detects water stress in vegetation',
    },
    NDMI: {
      name: 'Normalized Difference Moisture Index',
      formula: '(B08 - B11) / (B08 + B11)',
      range: [-1, 1],
      description: 'Measures canopy moisture content',
    },
    EVI: {
      name: 'Enhanced Vegetation Index',
      formula: '2.5 * (B08 - B04) / (B08 + 6*B04 - 7.5*B02 + 1)',
      range: [-1, 1],
      description: 'Better accuracy in dense vegetation',
    },
    SAVI: {
      name: 'Soil Adjusted Vegetation Index',
      formula: '((B08 - B04) / (B08 + B04 + L)) * (1 + L)',
      range: [-1, 1],
      description: 'Reduces soil brightness effects',
      soilFactor: 0.5, // L value
    },
  },

  // Processing Configuration
  MAX_CLOUD_COVER: 20,
  REVISIT_DAYS: 5,
  RESOLUTION_METERS: 10,
  CACHE_DURATION_HOURS: 24,
} as const;

// =============================================================================
// SENTINEL HUB CONFIGURATION (Paid Alternative - Legacy)
// =============================================================================

export const SENTINEL_HUB_CONFIG = {
  // API Configuration
  DATA_COLLECTION: 'sentinel-2-l2a',
  MAX_CLOUD_COVERAGE: 30,

  // NDVI Evalscript
  EVALSCRIPT_NDVI: `
//VERSION=3
function setup() {
  return {
    input: ["B04", "B08"],
    output: { bands: 1, sampleType: "FLOAT32" }
  };
}
function evaluatePixel(sample) {
  const ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  return [ndvi];
}
`,
} as const;

// =============================================================================
// FREE WEATHER API CONFIGURATION (Open-Meteo)
// =============================================================================

export const WEATHER_CONFIG = {
  // Open-Meteo API (100% FREE, no API key required)
  OPEN_METEO: {
    FORECAST_URL: 'https://api.open-meteo.com/v1/forecast',
    HISTORICAL_URL: 'https://archive-api.open-meteo.com/v1/archive',
    ELEVATION_URL: 'https://api.open-meteo.com/v1/elevation',
  },

  // Forecast Configuration
  FORECAST_DAYS: 14,
  HOURLY_HOURS: 48,
  TIMEZONE: 'Asia/Kolkata',

  // Weather Code Descriptions
  WEATHER_DESCRIPTIONS: {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  },

  // Alert Thresholds
  ALERTS: {
    FROST: { tempThreshold: 4 },
    HEAT_WAVE: { tempThreshold: 40, consecutiveDays: 3 },
    HEAVY_RAIN: { precipitationThreshold: 50 }, // mm/day
    DROUGHT: { noRainDays: 14 },
    STRONG_WIND: { windSpeedThreshold: 50 }, // km/h
    HAIL: { weatherCodes: [96, 99] },
  },

  // Agricultural Metrics Calculation
  AGRICULTURE: {
    GDD_BASE_TEMP: 10,      // Base temperature for Growing Degree Days
    CHILL_HOURS_MAX: 7.2,   // Max temp for chill hour accumulation
    CHILL_HOURS_MIN: 0,     // Min temp for chill hour accumulation
    ET0_DEFAULT: 5,         // Default ET0 if not available (mm/day)
  },
} as const;

// =============================================================================
// DISEASE & PEST CONFIGURATION
// =============================================================================

export const DISEASE_CONFIG = {
  // Common Diseases in Indian Agriculture
  DISEASES: {
    LATE_BLIGHT: {
      id: 'late_blight',
      name: 'Late Blight',
      nameHi: 'झुलसा रोग',
      crops: ['potato', 'tomato'],
      triggers: {
        humidity: { min: 80 },
        temperature: { min: 15, max: 25 },
        precipitation: { min: 5 },
      },
      weight: { humidity: 0.35, temperature: 0.30, precipitation: 0.25, history: 0.10 },
    },
    EARLY_BLIGHT: {
      id: 'early_blight',
      name: 'Early Blight',
      nameHi: 'अगेती झुलसा',
      crops: ['potato', 'tomato'],
      triggers: {
        humidity: { min: 60 },
        temperature: { min: 24, max: 29 },
      },
      weight: { humidity: 0.40, temperature: 0.35, stress: 0.25 },
    },
    POWDERY_MILDEW: {
      id: 'powdery_mildew',
      name: 'Powdery Mildew',
      nameHi: 'चूर्णिल आसिता',
      crops: ['wheat', 'grapes', 'cucurbits', 'peas'],
      triggers: {
        humidity: { min: 50, max: 80 },
        temperature: { min: 20, max: 30 },
        precipitation: { max: 5 }, // Dry conditions favor it
      },
      weight: { humidity: 0.35, temperature: 0.35, dryness: 0.30 },
    },
    DOWNY_MILDEW: {
      id: 'downy_mildew',
      name: 'Downy Mildew',
      nameHi: 'मृदुरोमिल आसिता',
      crops: ['grapes', 'cucurbits', 'onion'],
      triggers: {
        humidity: { min: 85 },
        temperature: { min: 10, max: 25 },
        precipitation: { min: 10 },
      },
      weight: { humidity: 0.40, temperature: 0.30, moisture: 0.30 },
    },
    RUST: {
      id: 'rust',
      name: 'Rust',
      nameHi: 'गेरुआ रोग',
      crops: ['wheat', 'pulses', 'soybean'],
      triggers: {
        humidity: { min: 60 },
        temperature: { min: 15, max: 30 },
      },
      weight: { humidity: 0.40, temperature: 0.35, dew: 0.25 },
    },
    BACTERIAL_WILT: {
      id: 'bacterial_wilt',
      name: 'Bacterial Wilt',
      nameHi: 'जीवाणु म्लानि',
      crops: ['tomato', 'potato', 'brinjal', 'chilli'],
      triggers: {
        humidity: { min: 70 },
        temperature: { min: 25, max: 35 },
        precipitation: { min: 20 },
      },
      weight: { humidity: 0.30, temperature: 0.35, wetness: 0.35 },
    },
    ANTHRACNOSE: {
      id: 'anthracnose',
      name: 'Anthracnose',
      nameHi: 'श्याम वर्ण रोग',
      crops: ['mango', 'chilli', 'beans', 'papaya'],
      triggers: {
        humidity: { min: 80 },
        temperature: { min: 20, max: 30 },
        precipitation: { min: 10 },
      },
      weight: { humidity: 0.40, temperature: 0.30, splash: 0.30 },
    },
  },

  // Common Pests in Indian Agriculture
  PESTS: {
    FALL_ARMYWORM: {
      id: 'fall_armyworm',
      name: 'Fall Armyworm',
      nameHi: 'फॉल आर्मीवर्म',
      crops: ['maize', 'sorghum', 'rice', 'sugarcane'],
      triggers: {
        temperature: { min: 25, max: 35 },
        humidity: { min: 60 },
      },
      weight: { temperature: 0.40, humidity: 0.30, history: 0.30 },
    },
    APHIDS: {
      id: 'aphids',
      name: 'Aphids',
      nameHi: 'माहू',
      crops: ['wheat', 'mustard', 'vegetables', 'cotton'],
      triggers: {
        temperature: { min: 15, max: 25 },
        humidity: { min: 40, max: 70 },
      },
      weight: { temperature: 0.35, humidity: 0.35, newGrowth: 0.30 },
    },
    WHITEFLY: {
      id: 'whitefly',
      name: 'Whitefly',
      nameHi: 'सफेद मक्खी',
      crops: ['cotton', 'tomato', 'brinjal', 'okra'],
      triggers: {
        temperature: { min: 28, max: 38 },
        humidity: { max: 60 },
      },
      weight: { temperature: 0.40, dryness: 0.35, host: 0.25 },
    },
    THRIPS: {
      id: 'thrips',
      name: 'Thrips',
      nameHi: 'थ्रिप्स',
      crops: ['onion', 'chilli', 'cotton', 'grapes'],
      triggers: {
        temperature: { min: 25, max: 35 },
        humidity: { max: 50 },
      },
      weight: { temperature: 0.35, dryness: 0.40, flowering: 0.25 },
    },
    STEM_BORER: {
      id: 'stem_borer',
      name: 'Stem Borer',
      nameHi: 'तना छेदक',
      crops: ['rice', 'sugarcane', 'maize'],
      triggers: {
        temperature: { min: 25, max: 32 },
        humidity: { min: 70 },
      },
      weight: { temperature: 0.35, humidity: 0.35, stage: 0.30 },
    },
    BOLLWORM: {
      id: 'bollworm',
      name: 'Bollworm',
      nameHi: 'बोलवर्म',
      crops: ['cotton', 'chickpea', 'pigeon_pea', 'tomato'],
      triggers: {
        temperature: { min: 20, max: 30 },
        humidity: { min: 60, max: 80 },
      },
      weight: { temperature: 0.35, humidity: 0.30, flowering: 0.35 },
    },
    FRUIT_FLY: {
      id: 'fruit_fly',
      name: 'Fruit Fly',
      nameHi: 'फल मक्खी',
      crops: ['mango', 'guava', 'citrus', 'cucurbits'],
      triggers: {
        temperature: { min: 25, max: 35 },
        humidity: { min: 60 },
      },
      weight: { temperature: 0.35, humidity: 0.30, fruiting: 0.35 },
    },
  },

  // Risk Level Thresholds
  RISK_THRESHOLDS: {
    LOW: 30,
    MEDIUM: 50,
    HIGH: 70,
    CRITICAL: 85,
  },
} as const;

// =============================================================================
// IRRIGATION CONFIGURATION
// =============================================================================

export const IRRIGATION_CONFIG = {
  // Crop Coefficients (Kc) by growth stage
  CROP_COEFFICIENTS: {
    rice: { initial: 1.05, mid: 1.20, late: 0.90 },
    wheat: { initial: 0.30, mid: 1.15, late: 0.25 },
    maize: { initial: 0.30, mid: 1.20, late: 0.35 },
    cotton: { initial: 0.35, mid: 1.20, late: 0.50 },
    sugarcane: { initial: 0.40, mid: 1.25, late: 0.75 },
    potato: { initial: 0.50, mid: 1.15, late: 0.75 },
    tomato: { initial: 0.60, mid: 1.15, late: 0.80 },
    onion: { initial: 0.70, mid: 1.05, late: 0.75 },
    soybean: { initial: 0.40, mid: 1.15, late: 0.50 },
    groundnut: { initial: 0.40, mid: 1.15, late: 0.60 },
    chickpea: { initial: 0.40, mid: 1.00, late: 0.35 },
    mustard: { initial: 0.35, mid: 1.15, late: 0.35 },
  },

  // Soil Types and Properties
  SOIL_TYPES: {
    sandy: { fieldCapacity: 15, wiltingPoint: 5, infiltrationRate: 50 },
    sandy_loam: { fieldCapacity: 22, wiltingPoint: 8, infiltrationRate: 25 },
    loam: { fieldCapacity: 30, wiltingPoint: 12, infiltrationRate: 15 },
    clay_loam: { fieldCapacity: 35, wiltingPoint: 15, infiltrationRate: 8 },
    clay: { fieldCapacity: 40, wiltingPoint: 20, infiltrationRate: 3 },
    black_cotton: { fieldCapacity: 45, wiltingPoint: 22, infiltrationRate: 2 },
    red: { fieldCapacity: 25, wiltingPoint: 10, infiltrationRate: 20 },
    laterite: { fieldCapacity: 20, wiltingPoint: 8, infiltrationRate: 30 },
  },

  // Irrigation Thresholds
  THRESHOLDS: {
    ADEQUATE: 80,           // Above 80% of field capacity
    MODERATE_STRESS: 60,    // 60-80% - should irrigate soon
    SEVERE_STRESS: 40,      // Below 40% - irrigate immediately
  },

  // Optimal Irrigation Times
  OPTIMAL_HOURS: {
    MORNING: { start: 6, end: 9 },
    EVENING: { start: 17, end: 19 },
    AVOID: { start: 11, end: 15 }, // Hottest hours
  },

  // Water Costs (INR per 1000 liters)
  WATER_COST_PER_KL: 5,
} as const;

// =============================================================================
// YIELD PREDICTION CONFIGURATION
// =============================================================================

export const YIELD_CONFIG = {
  // Average Yields by Crop (kg/hectare) - India baseline
  BASELINE_YIELDS: {
    rice: { average: 2500, good: 4000, excellent: 6000 },
    wheat: { average: 3000, good: 4500, excellent: 6000 },
    maize: { average: 2500, good: 5000, excellent: 8000 },
    cotton: { average: 500, good: 700, excellent: 1000 }, // lint
    sugarcane: { average: 70000, good: 85000, excellent: 100000 },
    potato: { average: 20000, good: 30000, excellent: 40000 },
    tomato: { average: 25000, good: 40000, excellent: 60000 },
    onion: { average: 15000, good: 25000, excellent: 35000 },
    soybean: { average: 1000, good: 1800, excellent: 2500 },
    groundnut: { average: 1500, good: 2500, excellent: 3500 },
    chickpea: { average: 900, good: 1500, excellent: 2000 },
    mustard: { average: 1200, good: 1800, excellent: 2500 },
  },

  // Factor Weights for Yield Prediction
  FACTOR_WEIGHTS: {
    NDVI: 0.25,
    WEATHER: 0.20,
    IRRIGATION: 0.15,
    SOIL: 0.10,
    PEST_DISEASE: 0.15,
    HISTORICAL: 0.15,
  },

  // Crop Growth Duration (days)
  GROWTH_DURATION: {
    rice: { kharif: 120, rabi: 150 },
    wheat: { rabi: 140 },
    maize: { kharif: 100, rabi: 120 },
    cotton: { kharif: 180 },
    sugarcane: { annual: 365 },
    potato: { rabi: 100 },
    tomato: { any: 90 },
    onion: { rabi: 150, kharif: 120 },
    soybean: { kharif: 100 },
    groundnut: { kharif: 120, rabi: 130 },
    chickpea: { rabi: 120 },
    mustard: { rabi: 130 },
  },

  // Seasons
  SEASONS: {
    KHARIF: { start: { month: 6, day: 1 }, end: { month: 10, day: 31 } },
    RABI: { start: { month: 11, day: 1 }, end: { month: 3, day: 31 } },
    ZAID: { start: { month: 3, day: 1 }, end: { month: 6, day: 30 } },
  },
} as const;

// =============================================================================
// CROP DETECTION CONFIGURATION
// =============================================================================

export const CROP_DETECTION_CONFIG = {
  // Supported Crops for Detection
  SUPPORTED_CROPS: [
    // Cereals
    { id: 'rice', name: 'Rice', nameHi: 'धान', category: 'cereal' },
    { id: 'wheat', name: 'Wheat', nameHi: 'गेहूं', category: 'cereal' },
    { id: 'maize', name: 'Maize', nameHi: 'मक्का', category: 'cereal' },
    { id: 'bajra', name: 'Pearl Millet', nameHi: 'बाजरा', category: 'cereal' },
    { id: 'jowar', name: 'Sorghum', nameHi: 'ज्वार', category: 'cereal' },
    // Pulses
    { id: 'chickpea', name: 'Chickpea', nameHi: 'चना', category: 'pulse' },
    { id: 'pigeon_pea', name: 'Pigeon Pea', nameHi: 'अरहर', category: 'pulse' },
    { id: 'moong', name: 'Green Gram', nameHi: 'मूंग', category: 'pulse' },
    { id: 'urad', name: 'Black Gram', nameHi: 'उड़द', category: 'pulse' },
    // Oilseeds
    { id: 'soybean', name: 'Soybean', nameHi: 'सोयाबीन', category: 'oilseed' },
    { id: 'groundnut', name: 'Groundnut', nameHi: 'मूंगफली', category: 'oilseed' },
    { id: 'mustard', name: 'Mustard', nameHi: 'सरसों', category: 'oilseed' },
    { id: 'sunflower', name: 'Sunflower', nameHi: 'सूरजमुखी', category: 'oilseed' },
    // Cash Crops
    { id: 'cotton', name: 'Cotton', nameHi: 'कपास', category: 'cash' },
    { id: 'sugarcane', name: 'Sugarcane', nameHi: 'गन्ना', category: 'cash' },
    // Vegetables
    { id: 'potato', name: 'Potato', nameHi: 'आलू', category: 'vegetable' },
    { id: 'tomato', name: 'Tomato', nameHi: 'टमाटर', category: 'vegetable' },
    { id: 'onion', name: 'Onion', nameHi: 'प्याज', category: 'vegetable' },
    { id: 'chilli', name: 'Chilli', nameHi: 'मिर्च', category: 'vegetable' },
    // Fruits
    { id: 'mango', name: 'Mango', nameHi: 'आम', category: 'fruit' },
    { id: 'banana', name: 'Banana', nameHi: 'केला', category: 'fruit' },
    { id: 'citrus', name: 'Citrus', nameHi: 'नींबू वर्गीय', category: 'fruit' },
    { id: 'grapes', name: 'Grapes', nameHi: 'अंगूर', category: 'fruit' },
  ],

  // Growth Stage Detection Thresholds (based on NDVI patterns)
  GROWTH_STAGES: {
    germination: { ndviRange: [0.1, 0.2], durationDays: 15 },
    seedling: { ndviRange: [0.2, 0.35], durationDays: 15 },
    vegetative: { ndviRange: [0.35, 0.6], durationDays: 30 },
    flowering: { ndviRange: [0.5, 0.7], durationDays: 15 },
    fruit_development: { ndviRange: [0.45, 0.65], durationDays: 25 },
    maturity: { ndviRange: [0.3, 0.5], durationDays: 15 },
    harvest_ready: { ndviRange: [0.15, 0.35], durationDays: 10 },
  },

  // AI Detection Prompt
  DETECTION_PROMPT: `Analyze this satellite/aerial image of agricultural land in India.

Identify:
1. CROP TYPE: What crop is growing? Common crops: rice, wheat, maize, cotton, sugarcane, potato, tomato, onion, soybean, groundnut, chickpea, mustard
2. GROWTH STAGE: germination, seedling, vegetative, flowering, fruit_development, maturity, harvest_ready
3. HEALTH: Overall crop health (0-100)
4. ANOMALIES: Any issues visible (gaps, waterlogging, pest_damage, disease, nutrient_deficiency, weed_infestation)

Return ONLY JSON:
{
  "cropType": "string",
  "confidence": 0-100,
  "growthStage": "string",
  "stageConfidence": 0-100,
  "healthScore": 0-100,
  "anomalies": [{"type": "string", "severity": "low|medium|high", "area": 0-100}]
}`,
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
