import { describe, it, expect } from 'vitest';
import {
  AWS_RESOURCES,
  THRESHOLDS,
  LIMITS,
  TIME,
  LANGUAGES,
  THREAT_CONFIG,
  HEALTH_CATEGORY_CONFIG,
  AI_CONFIG,
  SATELLITE_CONFIG,
  WEATHER_CONFIG,
  DISEASE_CONFIG,
  IRRIGATION_CONFIG,
  YIELD_CONFIG,
  CROP_DETECTION_CONFIG,
  ERROR_CODES,
} from '@green-sentinel/shared';

describe('AWS Resources Constants', () => {
  it('should have all required DynamoDB table names', () => {
    expect(AWS_RESOURCES.TABLES.FARMS).toBeDefined();
    expect(AWS_RESOURCES.TABLES.ALERTS).toBeDefined();
    expect(AWS_RESOURCES.TABLES.THREATS).toBeDefined();
  });

  it('should have all required S3 bucket names', () => {
    expect(AWS_RESOURCES.BUCKETS.FRAMES).toBeDefined();
    expect(AWS_RESOURCES.BUCKETS.HEATMAPS).toBeDefined();
  });

  it('should have all required SNS topics', () => {
    expect(AWS_RESOURCES.TOPICS.THREAT_NOTIFICATIONS).toBeDefined();
    expect(AWS_RESOURCES.TOPICS.SYSTEM_ALERTS).toBeDefined();
  });
});

describe('Threshold Constants', () => {
  describe('Threat Detection Thresholds', () => {
    it('should have fire threshold >= 0', () => {
      expect(THRESHOLDS.THREAT_DETECTION.fire).toBeGreaterThanOrEqual(0);
    });

    it('should have human threshold >= 0', () => {
      expect(THRESHOLDS.THREAT_DETECTION.human).toBeGreaterThanOrEqual(0);
    });

    it('should have animal threshold >= 0', () => {
      expect(THRESHOLDS.THREAT_DETECTION.animal).toBeGreaterThanOrEqual(0);
    });

    it('should have reasonable thresholds (0-100)', () => {
      expect(THRESHOLDS.THREAT_DETECTION.fire).toBeLessThanOrEqual(100);
      expect(THRESHOLDS.THREAT_DETECTION.human).toBeLessThanOrEqual(100);
      expect(THRESHOLDS.THREAT_DETECTION.animal).toBeLessThanOrEqual(100);
    });
  });

  describe('NDVI Thresholds', () => {
    it('should have EXCELLENT threshold >= 0', () => {
      expect(THRESHOLDS.NDVI.EXCELLENT).toBeGreaterThanOrEqual(0);
    });

    it('should have decreasing thresholds (EXCELLENT >= GOOD >= MODERATE >= POOR)', () => {
      expect(THRESHOLDS.NDVI.EXCELLENT).toBeGreaterThanOrEqual(THRESHOLDS.NDVI.GOOD);
      expect(THRESHOLDS.NDVI.GOOD).toBeGreaterThanOrEqual(THRESHOLDS.NDVI.MODERATE);
      expect(THRESHOLDS.NDVI.MODERATE).toBeGreaterThanOrEqual(THRESHOLDS.NDVI.POOR);
    });
  });
});

describe('Limit Constants', () => {
  it('should have frame limits', () => {
    expect(LIMITS.FRAME.MIN_INTERVAL_SECONDS).toBeGreaterThan(0);
    expect(LIMITS.FRAME.MAX_INTERVAL_SECONDS).toBeGreaterThan(LIMITS.FRAME.MIN_INTERVAL_SECONDS);
  });

  it('should have camera limits', () => {
    expect(LIMITS.CAMERAS.MAX_PER_FARM).toBeGreaterThan(0);
  });

  it('should have latency budgets', () => {
    expect(LIMITS.LATENCY.FRAME_ANALYSIS).toBeGreaterThan(0);
    expect(LIMITS.LATENCY.ALERT_DELIVERY).toBeGreaterThan(0);
    expect(LIMITS.LATENCY.END_TO_END).toBeGreaterThan(0);
  });

  it('should have retry configurations', () => {
    expect(LIMITS.RETRY.MAX_RTSP_RETRIES).toBeGreaterThan(0);
    expect(LIMITS.RETRY.MAX_ALERT_RETRIES).toBeGreaterThan(0);
    expect(LIMITS.RETRY.BACKOFF_BASE_MS).toBeGreaterThan(0);
  });
});

describe('Time Constants', () => {
  it('should have JWT expiry', () => {
    expect(TIME.JWT_EXPIRY_SECONDS).toBeGreaterThan(0);
  });

  it('should have refresh token expiry', () => {
    expect(TIME.REFRESH_TOKEN_EXPIRY_DAYS).toBeGreaterThan(0);
  });

  it('should have NDVI fetch schedule', () => {
    expect(TIME.NDVI_FETCH_HOUR).toBeGreaterThanOrEqual(0);
    expect(TIME.NDVI_FETCH_HOUR).toBeLessThan(24);
  });
});

describe('Language Constants', () => {
  it('should have all 7 supported languages', () => {
    expect(LANGUAGES.en).toBeDefined();
    expect(LANGUAGES.hi).toBeDefined();
    expect(LANGUAGES.mr).toBeDefined();
    expect(LANGUAGES.ta).toBeDefined();
    expect(LANGUAGES.te).toBeDefined();
    expect(LANGUAGES.kn).toBeDefined();
    expect(LANGUAGES.bn).toBeDefined();
  });

  it('should have native names for all languages', () => {
    Object.values(LANGUAGES).forEach(lang => {
      expect(lang.nativeName).toBeDefined();
      expect(lang.nativeName.length).toBeGreaterThan(0);
    });
  });

  it('should have Bhashini codes for all languages', () => {
    Object.values(LANGUAGES).forEach(lang => {
      expect(lang.bhashiniCode).toBeDefined();
    });
  });
});

describe('Threat Config Constants', () => {
  it('should have fire threat config', () => {
    expect(THREAT_CONFIG.fire).toBeDefined();
    expect(THREAT_CONFIG.fire.severity).toBe('critical');
    expect(THREAT_CONFIG.fire.color).toBeDefined();
  });

  it('should have human threat config', () => {
    expect(THREAT_CONFIG.human).toBeDefined();
    expect(THREAT_CONFIG.human.severity).toBe('critical');
  });

  it('should have animal threat config', () => {
    expect(THREAT_CONFIG.animal).toBeDefined();
    expect(THREAT_CONFIG.animal.severity).toBe('warning');
  });
});

describe('Health Category Config Constants', () => {
  it('should have all health categories', () => {
    expect(HEALTH_CATEGORY_CONFIG.excellent).toBeDefined();
    expect(HEALTH_CATEGORY_CONFIG.good).toBeDefined();
    expect(HEALTH_CATEGORY_CONFIG.moderate).toBeDefined();
    expect(HEALTH_CATEGORY_CONFIG.poor).toBeDefined();
    expect(HEALTH_CATEGORY_CONFIG.critical).toBeDefined();
  });

  it('should have minScore for each category', () => {
    Object.values(HEALTH_CATEGORY_CONFIG).forEach(config => {
      expect(config.minScore).toBeGreaterThanOrEqual(0);
      expect(config.minScore).toBeLessThanOrEqual(100);
    });
  });

  it('should have color for each category', () => {
    Object.values(HEALTH_CATEGORY_CONFIG).forEach(config => {
      expect(config.color).toBeDefined();
      expect(config.color.startsWith('#')).toBe(true);
    });
  });
});

describe('AI Config Constants', () => {
  it('should have Bedrock configuration', () => {
    expect(AI_CONFIG.BEDROCK).toBeDefined();
    expect(AI_CONFIG.BEDROCK.MODEL_ID).toBeDefined();
    expect(AI_CONFIG.BEDROCK.REGION).toBeDefined();
  });

  it('should have reasonable AI parameters', () => {
    expect(AI_CONFIG.BEDROCK.MAX_TOKENS).toBeGreaterThan(0);
    expect(AI_CONFIG.BEDROCK.TEMPERATURE).toBeGreaterThanOrEqual(0);
    expect(AI_CONFIG.BEDROCK.TEMPERATURE).toBeLessThanOrEqual(1);
  });

  it('should have threat analysis prompt', () => {
    expect(AI_CONFIG.BEDROCK.THREAT_ANALYSIS_PROMPT).toBeDefined();
    expect(AI_CONFIG.BEDROCK.THREAT_ANALYSIS_PROMPT.length).toBeGreaterThan(0);
  });
});

describe('Satellite Config Constants', () => {
  it('should have AWS Open Data configuration', () => {
    expect(SATELLITE_CONFIG.AWS_OPEN_DATA).toBeDefined();
    expect(SATELLITE_CONFIG.AWS_OPEN_DATA.BUCKET).toBeDefined();
  });

  it('should have STAC API configuration', () => {
    expect(SATELLITE_CONFIG.STAC_API).toBeDefined();
    expect(SATELLITE_CONFIG.STAC_API.URL).toBeDefined();
    expect(SATELLITE_CONFIG.STAC_API.COLLECTION).toBeDefined();
  });

  it('should have band configurations', () => {
    expect(SATELLITE_CONFIG.BANDS.B04).toBeDefined(); // Red
    expect(SATELLITE_CONFIG.BANDS.B08).toBeDefined(); // NIR
  });

  it('should have vegetation index formulas', () => {
    expect(SATELLITE_CONFIG.INDICES.NDVI).toBeDefined();
    expect(SATELLITE_CONFIG.INDICES.NDVI.formula).toContain('B08');
    expect(SATELLITE_CONFIG.INDICES.NDVI.formula).toContain('B04');
  });

  it('should have NDVI formula correct', () => {
    const ndviFormula = SATELLITE_CONFIG.INDICES.NDVI.formula;
    expect(ndviFormula).toBe('(B08 - B04) / (B08 + B04)');
  });
});

describe('Weather Config Constants', () => {
  it('should have Open-Meteo configuration', () => {
    expect(WEATHER_CONFIG.OPEN_METEO).toBeDefined();
    expect(WEATHER_CONFIG.OPEN_METEO.FORECAST_URL).toBeDefined();
  });

  it('should have forecast configuration', () => {
    expect(WEATHER_CONFIG.FORECAST_DAYS).toBeGreaterThan(0);
    expect(WEATHER_CONFIG.HOURLY_HOURS).toBeGreaterThan(0);
  });

  it('should have weather code descriptions', () => {
    expect(WEATHER_CONFIG.WEATHER_DESCRIPTIONS[0]).toBe('Clear sky');
    expect(WEATHER_CONFIG.WEATHER_DESCRIPTIONS[95]).toBeDefined();
  });

  it('should have alert thresholds', () => {
    expect(WEATHER_CONFIG.ALERTS.FROST).toBeDefined();
    expect(WEATHER_CONFIG.ALERTS.HEAT_WAVE).toBeDefined();
    expect(WEATHER_CONFIG.ALERTS.HEAVY_RAIN).toBeDefined();
  });

  it('should have agricultural metrics', () => {
    expect(WEATHER_CONFIG.AGRICULTURE.GDD_BASE_TEMP).toBeGreaterThan(0);
    expect(WEATHER_CONFIG.AGRICULTURE.ET0_DEFAULT).toBeGreaterThan(0);
  });
});

describe('Disease Config Constants', () => {
  it('should have disease configurations', () => {
    expect(DISEASE_CONFIG.DISEASES.LATE_BLIGHT).toBeDefined();
    expect(DISEASE_CONFIG.DISEASES.POWDERY_MILDEW).toBeDefined();
    expect(DISEASE_CONFIG.DISEASES.RUST).toBeDefined();
  });

  it('should have pest configurations', () => {
    expect(DISEASE_CONFIG.PESTS.FALL_ARMYWORM).toBeDefined();
    expect(DISEASE_CONFIG.PESTS.APHIDS).toBeDefined();
    expect(DISEASE_CONFIG.PESTS.WHITEFLY).toBeDefined();
  });

  it('should have risk thresholds', () => {
    expect(DISEASE_CONFIG.RISK_THRESHOLDS.LOW).toBeGreaterThanOrEqual(0);
    expect(DISEASE_CONFIG.RISK_THRESHOLDS.MEDIUM).toBeGreaterThan(DISEASE_CONFIG.RISK_THRESHOLDS.LOW);
    expect(DISEASE_CONFIG.RISK_THRESHOLDS.HIGH).toBeGreaterThan(DISEASE_CONFIG.RISK_THRESHOLDS.MEDIUM);
    expect(DISEASE_CONFIG.RISK_THRESHOLDS.CRITICAL).toBeGreaterThan(DISEASE_CONFIG.RISK_THRESHOLDS.HIGH);
  });

  it('should have Hindi names for diseases', () => {
    expect(DISEASE_CONFIG.DISEASES.LATE_BLIGHT.nameHi).toBeDefined();
    expect(DISEASE_CONFIG.DISEASES.LATE_BLIGHT.nameHi.length).toBeGreaterThan(0);
  });
});

describe('Irrigation Config Constants', () => {
  it('should have crop coefficients', () => {
    expect(IRRIGATION_CONFIG.CROP_COEFFICIENTS.rice).toBeDefined();
    expect(IRRIGATION_CONFIG.CROP_COEFFICIENTS.wheat).toBeDefined();
  });

  it('should have soil type configurations', () => {
    expect(IRRIGATION_CONFIG.SOIL_TYPES.loam).toBeDefined();
    expect(IRRIGATION_CONFIG.SOIL_TYPES.clay).toBeDefined();
  });

  it('should have soil properties with field capacity and wilting point', () => {
    const loam = IRRIGATION_CONFIG.SOIL_TYPES.loam;
    expect(loam.fieldCapacity).toBeGreaterThan(loam.wiltingPoint);
  });

  it('should have irrigation thresholds', () => {
    expect(IRRIGATION_CONFIG.THRESHOLDS.ADEQUATE).toBeGreaterThan(0);
    expect(IRRIGATION_CONFIG.THRESHOLDS.MODERATE_STRESS).toBeGreaterThan(0);
    expect(IRRIGATION_CONFIG.THRESHOLDS.SEVERE_STRESS).toBeGreaterThan(0);
  });

  it('should have optimal irrigation hours', () => {
    expect(IRRIGATION_CONFIG.OPTIMAL_HOURS.MORNING.start).toBeGreaterThanOrEqual(0);
    expect(IRRIGATION_CONFIG.OPTIMAL_HOURS.MORNING.end).toBeLessThanOrEqual(24);
    expect(IRRIGATION_CONFIG.OPTIMAL_HOURS.EVENING.start).toBeGreaterThanOrEqual(0);
    expect(IRRIGATION_CONFIG.OPTIMAL_HOURS.EVENING.end).toBeLessThanOrEqual(24);
  });
});

describe('Yield Config Constants', () => {
  it('should have baseline yields for major crops', () => {
    expect(YIELD_CONFIG.BASELINE_YIELDS.rice).toBeDefined();
    expect(YIELD_CONFIG.BASELINE_YIELDS.wheat).toBeDefined();
    expect(YIELD_CONFIG.BASELINE_YIELDS.cotton).toBeDefined();
  });

  it('should have factor weights that sum to 1', () => {
    const weights = YIELD_CONFIG.FACTOR_WEIGHTS;
    const sum = weights.NDVI + weights.WEATHER + weights.IRRIGATION + 
                weights.SOIL + weights.PEST_DISEASE + weights.HISTORICAL;
    expect(sum).toBeCloseTo(1, 1);
  });

  it('should have growth duration for crops', () => {
    expect(YIELD_CONFIG.GROWTH_DURATION.rice).toBeDefined();
    expect(YIELD_CONFIG.GROWTH_DURATION.wheat).toBeDefined();
  });
});

describe('Crop Detection Config Constants', () => {
  it('should have supported crops list', () => {
    expect(CROP_DETECTION_CONFIG.SUPPORTED_CROPS.length).toBeGreaterThan(0);
  });

  it('should have growth stages', () => {
    expect(CROP_DETECTION_CONFIG.GROWTH_STAGES.germination).toBeDefined();
    expect(CROP_DETECTION_CONFIG.GROWTH_STAGES.vegetative).toBeDefined();
    expect(CROP_DETECTION_CONFIG.GROWTH_STAGES.harvest_ready).toBeDefined();
  });

  it('should have detection prompt', () => {
    expect(CROP_DETECTION_CONFIG.DETECTION_PROMPT).toBeDefined();
    expect(CROP_DETECTION_CONFIG.DETECTION_PROMPT.length).toBeGreaterThan(0);
  });
});

describe('Error Codes Constants', () => {
  it('should have authentication error codes (1xxx)', () => {
    expect(ERROR_CODES.AUTH_INVALID_TOKEN).toBe('E1001');
    expect(ERROR_CODES.AUTH_EXPIRED_TOKEN).toBe('E1002');
  });

  it('should have camera error codes (2xxx)', () => {
    expect(ERROR_CODES.CAMERA_CONNECTION_FAILED).toBe('E2001');
    expect(ERROR_CODES.CAMERA_FRAME_CAPTURE_FAILED).toBe('E2002');
  });

  it('should have threat detection error codes (3xxx)', () => {
    expect(ERROR_CODES.THREAT_ANALYSIS_FAILED).toBe('E3001');
    expect(ERROR_CODES.THREAT_ANALYSIS_TIMEOUT).toBe('E3002');
  });

  it('should have NDVI error codes (4xxx)', () => {
    expect(ERROR_CODES.NDVI_FETCH_FAILED).toBe('E4001');
    expect(ERROR_CODES.NDVI_CLOUD_COVER_HIGH).toBe('E4002');
  });

  it('should have alert error codes (5xxx)', () => {
    expect(ERROR_CODES.ALERT_DELIVERY_FAILED).toBe('E5001');
    expect(ERROR_CODES.ALERT_TRANSLATION_FAILED).toBe('E5002');
  });

  it('should have farm error codes (6xxx)', () => {
    expect(ERROR_CODES.FARM_NOT_FOUND).toBe('E6001');
    expect(ERROR_CODES.FARM_ACCESS_DENIED).toBe('E6002');
  });

  it('should have system error codes (9xxx)', () => {
    expect(ERROR_CODES.SYSTEM_INTERNAL_ERROR).toBe('E9001');
    expect(ERROR_CODES.SYSTEM_SERVICE_UNAVAILABLE).toBe('E9002');
    expect(ERROR_CODES.SYSTEM_RATE_LIMITED).toBe('E9003');
  });
});
