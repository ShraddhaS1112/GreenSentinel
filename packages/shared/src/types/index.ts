/**
 * Green Sentinel - Core Type Definitions
 *
 * This module contains all shared types used across the application,
 * ensuring type safety and consistency between frontend and backend.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/**
 * Supported regional languages for alerts
 * Based on major agricultural states in India
 */
export enum Language {
  HINDI = 'hi',
  MARATHI = 'mr',
  TAMIL = 'ta',
  TELUGU = 'te',
  KANNADA = 'kn',
  BENGALI = 'bn',
  ENGLISH = 'en',
}

/**
 * Types of threats that can be detected by the AI vision system
 */
export enum ThreatType {
  FIRE = 'fire',
  HUMAN = 'human',
  ANIMAL = 'animal',
}

/**
 * Alert delivery status tracking
 */
export enum AlertDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

/**
 * Camera connection status
 */
export enum CameraStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error',
}

/**
 * Health score categories based on NDVI values
 */
export enum HealthCategory {
  EXCELLENT = 'excellent',  // NDVI > 0.6, Score > 80
  GOOD = 'good',            // NDVI 0.5-0.6, Score 70-80
  MODERATE = 'moderate',    // NDVI 0.3-0.5, Score 50-70
  POOR = 'poor',            // NDVI 0.2-0.3, Score 40-50
  CRITICAL = 'critical',    // NDVI < 0.2, Score < 40
}

// =============================================================================
// USER & AUTHENTICATION
// =============================================================================

/**
 * User profile and preferences
 */
export interface User {
  userId: string;
  phoneNumber: string;
  email?: string;
  name: string;
  language: Language;
  farms: string[];  // Array of farm IDs
  alertPreferences: AlertPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface AlertPreferences {
  voiceEnabled: boolean;
  textEnabled: boolean;
  quietHoursStart?: string;  // HH:MM format
  quietHoursEnd?: string;    // HH:MM format
  minimumConfidence: number; // 0-100, minimum confidence to trigger alert
}

/**
 * JWT Token payload structure
 */
export interface TokenPayload {
  userId: string;
  email?: string;
  phoneNumber: string;
  farms: string[];
  iat: number;
  exp: number;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

// =============================================================================
// FARM & CAMERA
// =============================================================================

/**
 * Farm entity with full details
 */
export interface Farm {
  farmId: string;
  userId: string;
  name: string;
  location: GeoLocation;
  area?: number;  // in hectares
  cropType?: string;
  cameras: Camera[];
  alertThresholds: AlertThresholds;
  language: Language;
  createdAt: string;
  updatedAt: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
  district?: string;
  state?: string;
}

/**
 * IP Camera configuration
 */
export interface Camera {
  cameraId: string;
  farmId: string;
  name: string;
  rtspUrl: string;
  status: CameraStatus;
  captureInterval: number;  // seconds (5-10)
  lastFrameAt?: string;
  createdAt: string;
}

/**
 * Camera credentials stored in Secrets Manager
 * Never exposed to frontend
 */
export interface CameraCredentials {
  cameraId: string;
  username: string;
  password: string;
  rotatedAt: string;
}

/**
 * Configurable thresholds for threat alerts per farm
 */
export interface AlertThresholds {
  fire: number;     // Default: 80
  human: number;    // Default: 80
  animal: number;   // Default: 75
}

// =============================================================================
// THREAT DETECTION
// =============================================================================

/**
 * Threat detection result from AI analysis
 */
export interface ThreatDetection {
  threatId: string;
  farmId: string;
  cameraId: string;
  threatType: ThreatType;
  confidenceScore: number;  // 0-100
  frameSnapshotPath: string;
  frameTimestamp: string;
  alertSent: boolean;
  alertDeliveryStatus: AlertDeliveryStatus;
  latencyMs: number;
  analysisMetadata: AnalysisMetadata;
  createdAt: string;
}

export interface AnalysisMetadata {
  modelId: string;
  modelVersion: string;
  analysisTimeMs: number;
  allScores: ThreatScores;
  rawResponse?: string;
}

/**
 * AI model response with confidence scores for all threat types
 */
export interface ThreatScores {
  fire: number;
  human: number;
  animal: number;
}

/**
 * Frame capture event for SQS processing
 */
export interface FrameEvent {
  eventId: string;
  farmId: string;
  cameraId: string;
  frameS3Path: string;
  timestamp: string;
  capturedAt: string;
}

/**
 * Threat alert event for notification processing
 */
export interface ThreatAlertEvent {
  eventId: string;
  threatId: string;
  farmId: string;
  cameraId: string;
  threatType: ThreatType;
  confidenceScore: number;
  frameSnapshotPath: string;
  timestamp: string;
  userId: string;
  phoneNumber: string;
  language: Language;
}

// =============================================================================
// CROP HEALTH (NDVI)
// =============================================================================

/**
 * Daily crop health score from satellite analysis
 */
export interface HealthScore {
  farmId: string;
  date: string;  // YYYY-MM-DD
  healthScore: number;  // 0-100
  ndviValue: number;    // -1 to 1
  category: HealthCategory;
  heatmapPath: string;
  satelliteDate: string;
  cloudCover: number;   // 0-100 percentage
  isCached: boolean;
  previousScore?: number;
  scoreDelta?: number;
  createdAt: string;
}

/**
 * NDVI calculation result from Sentinel Hub
 */
export interface NDVIResult {
  farmId: string;
  ndviValue: number;
  pixelData: number[][];  // 2D array of NDVI values
  boundingBox: BoundingBox;
  acquisitionDate: string;
  cloudCoverPercentage: number;
  satelliteId: string;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Health trend data for visualization
 */
export interface HealthTrend {
  farmId: string;
  dataPoints: HealthDataPoint[];
  averageScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface HealthDataPoint {
  date: string;
  score: number;
  ndvi: number;
}

// =============================================================================
// ALERTS & NOTIFICATIONS
// =============================================================================

/**
 * Alert message structure
 */
export interface Alert {
  alertId: string;
  farmId: string;
  userId: string;
  type: 'threat' | 'health' | 'system';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  translatedMessage?: string;
  language: Language;
  metadata: AlertMetadata;
  deliveryStatus: AlertDeliveryStatus;
  deliveryAttempts: number;
  lastAttemptAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface AlertMetadata {
  threatId?: string;
  threatType?: ThreatType;
  confidenceScore?: number;
  snapshotUrl?: string;
  healthScore?: number;
  healthDelta?: number;
  voiceMessageUrl?: string;
}

/**
 * WhatsApp message structure for Twilio
 */
export interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string;
  contentSid?: string;
}

// =============================================================================
// AUDIT & LOGGING
// =============================================================================

/**
 * Audit log entry for compliance and debugging
 */
export interface AuditLog {
  farmId: string;
  eventType: AuditEventType;
  timestamp: string;
  details: Record<string, unknown>;
  status: 'success' | 'failure';
  latencyMs?: number;
  userId?: string;
  ipAddress?: string;
}

export enum AuditEventType {
  THREAT_DETECTED = 'threat_detected',
  ALERT_SENT = 'alert_sent',
  ALERT_DELIVERED = 'alert_delivered',
  ALERT_FAILED = 'alert_failed',
  CAMERA_CONNECTED = 'camera_connected',
  CAMERA_DISCONNECTED = 'camera_disconnected',
  CREDENTIAL_ACCESSED = 'credential_accessed',
  HEALTH_SCORE_CALCULATED = 'health_score_calculated',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  FARM_CREATED = 'farm_created',
  FARM_UPDATED = 'farm_updated',
  API_ERROR = 'api_error',
  SYSTEM_ERROR = 'system_error',
}

// =============================================================================
// API RESPONSES
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  latencyMs: number;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedResponse<T> {
  items: T[];
  nextToken?: string;
  totalCount?: number;
  hasMore: boolean;
}

// =============================================================================
// DASHBOARD & STATISTICS
// =============================================================================

/**
 * Dashboard summary data
 */
export interface DashboardSummary {
  farmId: string;
  lastUpdated: string;
  threatsSummary: ThreatsSummary;
  healthSummary: HealthSummary;
  camerasSummary: CamerasSummary;
  recentAlerts: Alert[];
}

export interface ThreatsSummary {
  last24Hours: number;
  last7Days: number;
  last30Days: number;
  byType: Record<ThreatType, number>;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface HealthSummary {
  currentScore: number;
  previousScore: number;
  scoreDelta: number;
  category: HealthCategory;
  lastUpdated: string;
  weeklyAverage: number;
}

export interface CamerasSummary {
  total: number;
  connected: number;
  disconnected: number;
  errored: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * System configuration (stored in SSM Parameter Store)
 */
export interface SystemConfig {
  frameCapture: {
    defaultInterval: number;
    minInterval: number;
    maxInterval: number;
    maxFrameSize: number;  // bytes
    s3TtlHours: number;
  };
  threatDetection: {
    modelId: string;
    maxAnalysisTimeMs: number;
    defaultThresholds: AlertThresholds;
  };
  ndvi: {
    fetchTimeUtc: string;  // HH:MM
    cloudCoverThreshold: number;
    cacheDurationDays: number;
  };
  alerts: {
    maxRetries: number;
    retryIntervalMs: number;
    maxLatencyMs: number;
    warningLatencyMs: number;
  };
  security: {
    jwtExpirySeconds: number;
    refreshTokenExpiryDays: number;
    credentialRotationDays: number;
  };
}

// =============================================================================
// WEBSOCKET / REAL-TIME
// =============================================================================

/**
 * Real-time event types for AppSync subscriptions
 */
export type RealtimeEvent =
  | { type: 'THREAT_DETECTED'; payload: ThreatDetection }
  | { type: 'ALERT_SENT'; payload: Alert }
  | { type: 'HEALTH_UPDATED'; payload: HealthScore }
  | { type: 'CAMERA_STATUS_CHANGED'; payload: { cameraId: string; status: CameraStatus } };

/**
 * Subscription filter for real-time events
 */
export interface SubscriptionFilter {
  farmIds?: string[];
  eventTypes?: string[];
}

// =============================================================================
// ENHANCED SATELLITE ANALYTICS
// =============================================================================

/**
 * Vegetation index types supported by the system
 */
export enum VegetationIndex {
  NDVI = 'ndvi',   // Normalized Difference Vegetation Index
  NDWI = 'ndwi',   // Normalized Difference Water Index
  NDMI = 'ndmi',   // Normalized Difference Moisture Index
  EVI = 'evi',     // Enhanced Vegetation Index
  SAVI = 'savi',   // Soil Adjusted Vegetation Index
}

/**
 * Complete satellite analysis result with multiple indices
 */
export interface SatelliteAnalysis {
  farmId: string;
  captureDate: string;
  cloudCover: number;
  indices: VegetationIndices;
  healthScore: number;
  healthCategory: HealthCategory;
  zones: SatelliteZone[];
  sceneId: string;
  processingTimeMs: number;
  createdAt: string;
}

/**
 * All vegetation indices for a farm
 */
export interface VegetationIndices {
  ndvi: IndexResult;
  ndwi: IndexResult;
  ndmi: IndexResult;
  evi?: IndexResult;
  savi?: IndexResult;
}

/**
 * Individual index calculation result
 */
export interface IndexResult {
  mean: number;
  min: number;
  max: number;
  stdDev: number;
  histogram: number[];
}

/**
 * Zone-based satellite analysis
 */
export interface SatelliteZone {
  zoneId: string;
  zoneName: string;
  ndvi: number;
  ndwi: number;
  ndmi: number;
  healthScore: number;
  healthCategory: HealthCategory;
  areaHectares: number;
  issues: ZoneIssue[];
}

export interface ZoneIssue {
  type: 'water_stress' | 'nutrient_deficiency' | 'pest_damage' | 'waterlogging';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
}

/**
 * Sentinel-2 scene metadata from STAC API
 */
export interface SatelliteScene {
  sceneId: string;
  datetime: string;
  cloudCover: number;
  sunElevation: number;
  assets: {
    B02?: string;  // Blue
    B03?: string;  // Green
    B04?: string;  // Red
    B08?: string;  // NIR
    B11?: string;  // SWIR1
    B12?: string;  // SWIR2
    SCL?: string;  // Scene Classification
  };
  geometry: GeoJSON.Polygon;
}

// =============================================================================
// WEATHER INTELLIGENCE
// =============================================================================

/**
 * Current weather conditions
 */
export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  uvIndex: number;
  visibility: number;
  pressure: number;
  weatherCode: WeatherCode;
  weatherDescription: string;
  isDay: boolean;
  updatedAt: string;
}

/**
 * Weather code from Open-Meteo
 */
export enum WeatherCode {
  CLEAR_SKY = 0,
  MAINLY_CLEAR = 1,
  PARTLY_CLOUDY = 2,
  OVERCAST = 3,
  FOG = 45,
  DEPOSITING_RIME_FOG = 48,
  LIGHT_DRIZZLE = 51,
  MODERATE_DRIZZLE = 53,
  DENSE_DRIZZLE = 55,
  LIGHT_FREEZING_DRIZZLE = 56,
  DENSE_FREEZING_DRIZZLE = 57,
  SLIGHT_RAIN = 61,
  MODERATE_RAIN = 63,
  HEAVY_RAIN = 65,
  LIGHT_FREEZING_RAIN = 66,
  HEAVY_FREEZING_RAIN = 67,
  SLIGHT_SNOW = 71,
  MODERATE_SNOW = 73,
  HEAVY_SNOW = 75,
  SNOW_GRAINS = 77,
  SLIGHT_RAIN_SHOWERS = 80,
  MODERATE_RAIN_SHOWERS = 81,
  VIOLENT_RAIN_SHOWERS = 82,
  SLIGHT_SNOW_SHOWERS = 85,
  HEAVY_SNOW_SHOWERS = 86,
  THUNDERSTORM = 95,
  THUNDERSTORM_WITH_SLIGHT_HAIL = 96,
  THUNDERSTORM_WITH_HEAVY_HAIL = 99,
}

/**
 * Daily weather forecast
 */
export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeedMax: number;
  uvIndexMax: number;
  weatherCode: WeatherCode;
  sunrise: string;
  sunset: string;
}

/**
 * Hourly weather forecast
 */
export interface HourlyForecast {
  time: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
  cloudCover: number;
  weatherCode: WeatherCode;
}

/**
 * Complete weather data for a farm
 */
export interface WeatherData {
  farmId: string;
  location: GeoLocation;
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
  agricultural: AgriculturalMetrics;
  alerts: WeatherAlert[];
  fetchedAt: string;
}

/**
 * Agricultural-specific weather metrics
 */
export interface AgriculturalMetrics {
  gdd: number;              // Growing Degree Days
  et0: number;              // Reference Evapotranspiration (mm/day)
  chillHours: number;       // Accumulated chill hours
  heatUnits: number;        // Heat units for the season
  frostRisk: boolean;       // Frost risk in next 48 hours
  sprayWindow: SprayWindow | null;
  irrigationAdvisory: string;
}

/**
 * Optimal spraying window
 */
export interface SprayWindow {
  start: string;
  end: string;
  conditions: string;
  confidence: number;
}

/**
 * Weather alert
 */
export interface WeatherAlert {
  alertId: string;
  type: WeatherAlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  advisory: string;
  affectedCrops: string[];
}

export enum WeatherAlertType {
  FROST = 'frost',
  HEAT_WAVE = 'heat_wave',
  HEAVY_RAIN = 'heavy_rain',
  DROUGHT = 'drought',
  STRONG_WIND = 'strong_wind',
  HAIL = 'hail',
  THUNDERSTORM = 'thunderstorm',
}

// =============================================================================
// DISEASE & PEST FORECASTING
// =============================================================================

/**
 * Disease risk assessment
 */
export interface DiseaseRisk {
  diseaseId: string;
  name: string;
  localName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  probability: number;
  affectedCrops: string[];
  triggers: string[];
  symptoms: string[];
  preventiveActions: string[];
  curativeActions: string[];
  optimalSprayWindow?: SprayWindow;
  historicalIncidence: number;
  neighborhoodAlerts: number;
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Pest risk assessment
 */
export interface PestRisk {
  pestId: string;
  name: string;
  localName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  affectedCrops: string[];
  triggers: string[];
  identificationTips: string[];
  controlMeasures: ControlMeasure[];
  economicThreshold: string;
  migrationPattern?: MigrationPattern;
}

export interface ControlMeasure {
  type: 'cultural' | 'biological' | 'chemical' | 'mechanical';
  description: string;
  timing: string;
  effectiveness: number;
}

export interface MigrationPattern {
  direction: string;
  speed: number;
  expectedArrival?: string;
  affectedRegions: string[];
}

/**
 * Complete disease/pest forecast for a farm
 */
export interface DiseaseAndPestForecast {
  farmId: string;
  cropType: string;
  growthStage: GrowthStage;
  diseases: DiseaseRisk[];
  pests: PestRisk[];
  overallRiskLevel: RiskLevel;
  advisories: string[];
  nextUpdateAt: string;
  generatedAt: string;
}

// =============================================================================
// IRRIGATION MODELING
// =============================================================================

/**
 * Irrigation recommendation
 */
export interface IrrigationRecommendation {
  farmId: string;
  date: string;
  soilMoisture: SoilMoistureData;
  waterBalance: WaterBalance;
  recommendation: IrrigationAction;
  zones: IrrigationZone[];
  schedule: IrrigationSchedule[];
  savings: WaterSavings;
  generatedAt: string;
}

export interface SoilMoistureData {
  current: number;           // Current moisture percentage
  fieldCapacity: number;     // Soil-specific field capacity
  wiltingPoint: number;      // Permanent wilting point
  optimalRange: { min: number; max: number };
  status: 'adequate' | 'moderate_stress' | 'severe_stress' | 'waterlogged';
}

export interface WaterBalance {
  rainfall: number;          // mm in last 7 days
  irrigation: number;        // mm applied
  evapotranspiration: number; // mm lost
  deficit: number;           // mm needed
  surplus: number;           // mm excess
}

export interface IrrigationAction {
  action: 'irrigate_now' | 'irrigate_soon' | 'wait' | 'skip_rain_expected';
  waterNeeded: number;       // liters per hectare
  duration: number;          // minutes
  optimalTime: string;       // HH:MM
  reason: string;
  priority: number;          // 1-5
}

export interface IrrigationZone {
  zoneId: string;
  zoneName: string;
  moistureLevel: number;
  stressLevel: 'none' | 'mild' | 'moderate' | 'severe';
  priority: number;
  waterNeeded: number;
  lastIrrigated?: string;
}

export interface IrrigationSchedule {
  date: string;
  time: string;
  zones: string[];
  waterAmount: number;
  duration: number;
  status: 'scheduled' | 'completed' | 'skipped';
  skipReason?: string;
}

export interface WaterSavings {
  thisWeek: number;          // liters saved
  thisMonth: number;
  thisSeason: number;
  percentageVsTraditional: number;
  costSavings: number;       // INR
}

// =============================================================================
// YIELD PREDICTION
// =============================================================================

/**
 * Yield prediction result
 */
export interface YieldPrediction {
  farmId: string;
  cropType: string;
  variety?: string;
  predictedYield: number;    // kg per hectare
  unit: string;
  confidence: {
    low: number;
    high: number;
    percentage: number;
  };
  comparison: YieldComparison;
  factors: YieldFactors;
  timeline: YieldTimeline;
  recommendations: string[];
  generatedAt: string;
}

export interface YieldComparison {
  lastYear: number;
  lastYearDelta: number;     // percentage
  regionalAverage: number;
  regionalDelta: number;     // percentage
  nationalAverage: number;
  personalBest: number;
  personalBestYear: number;
}

export interface YieldFactors {
  positive: YieldFactor[];
  negative: YieldFactor[];
  neutral: YieldFactor[];
}

export interface YieldFactor {
  factor: string;
  impact: number;            // -100 to +100
  description: string;
  actionable: boolean;
  recommendation?: string;
}

export interface YieldTimeline {
  sowingDate: string;
  currentStage: GrowthStage;
  expectedHarvestDate: string;
  daysToHarvest: number;
  stageProgress: number;     // 0-100 percentage within current stage
}

/**
 * Historical yield data
 */
export interface YieldHistory {
  farmId: string;
  records: YieldRecord[];
  averageYield: number;
  bestYield: number;
  bestYear: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface YieldRecord {
  year: number;
  season: 'kharif' | 'rabi' | 'zaid';
  cropType: string;
  variety?: string;
  yield: number;
  areaHectares: number;
  totalProduction: number;
  notes?: string;
}

// =============================================================================
// CROP DETECTION & GROWTH TRACKING
// =============================================================================

/**
 * Growth stages for crops
 */
export enum GrowthStage {
  GERMINATION = 'germination',
  SEEDLING = 'seedling',
  VEGETATIVE = 'vegetative',
  FLOWERING = 'flowering',
  FRUIT_DEVELOPMENT = 'fruit_development',
  MATURITY = 'maturity',
  HARVEST_READY = 'harvest_ready',
}

/**
 * Crop detection result from AI analysis
 */
export interface CropDetection {
  farmId: string;
  detectedCrop: string;
  confidence: number;
  alternativeCrops: { crop: string; confidence: number }[];
  growthStage: GrowthStage;
  stageConfidence: number;
  healthIndicators: CropHealthIndicators;
  anomalies: CropAnomaly[];
  analysisDate: string;
  imageSource: 'satellite' | 'drone' | 'camera';
}

export interface CropHealthIndicators {
  vigor: number;             // 0-100
  uniformity: number;        // 0-100
  density: number;           // 0-100
  stressLevel: number;       // 0-100 (lower is better)
}

export interface CropAnomaly {
  type: 'gap' | 'waterlogging' | 'pest_damage' | 'disease' | 'nutrient_deficiency' | 'weed_infestation';
  severity: 'low' | 'medium' | 'high';
  affectedArea: number;      // percentage of total area
  location?: { lat: number; lng: number };
  confidence: number;
}

/**
 * Crop growth timeline
 */
export interface CropTimeline {
  farmId: string;
  cropType: string;
  sowingDate: string;
  stages: StageRecord[];
  currentStage: GrowthStage;
  daysInCurrentStage: number;
  expectedNextStage: string;
  daysToNextStage: number;
  expectedHarvestDate: string;
}

export interface StageRecord {
  stage: GrowthStage;
  startDate: string;
  endDate?: string;
  duration: number;
  healthScore: number;
  notes?: string;
}

// =============================================================================
// HISTORICAL ANALYSIS
// =============================================================================

/**
 * Historical NDVI trend data
 */
export interface NDVIHistory {
  farmId: string;
  years: number;
  dataPoints: NDVIHistoryPoint[];
  trends: {
    overall: 'improving' | 'stable' | 'declining';
    seasonal: SeasonalTrend[];
  };
  insights: string[];
}

export interface NDVIHistoryPoint {
  date: string;
  ndvi: number;
  healthScore: number;
  cloudCover: number;
}

export interface SeasonalTrend {
  season: 'kharif' | 'rabi' | 'zaid';
  averageNDVI: number;
  bestYear: number;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Historical weather patterns
 */
export interface WeatherHistory {
  farmId: string;
  years: number;
  annualRainfall: { year: number; rainfall: number }[];
  averageTemperatures: { year: number; avgTemp: number; maxTemp: number; minTemp: number }[];
  extremeEvents: ExtremeWeatherEvent[];
  patterns: WeatherPattern[];
}

export interface ExtremeWeatherEvent {
  date: string;
  type: WeatherAlertType;
  severity: string;
  impact: string;
}

export interface WeatherPattern {
  pattern: string;
  frequency: string;
  typicalMonths: string[];
  impact: string;
}

/**
 * Farm insights from historical analysis
 */
export interface FarmInsights {
  farmId: string;
  optimalSowingWindow: {
    kharif: { start: string; end: string };
    rabi: { start: string; end: string };
  };
  riskPeriods: { period: string; risk: string; mitigation: string }[];
  bestPractices: string[];
  recommendations: string[];
  generatedAt: string;
}

// =============================================================================
// REPORTS
// =============================================================================

/**
 * Report types
 */
export enum ReportType {
  WEEKLY_SUMMARY = 'weekly_summary',
  MONTHLY_SUMMARY = 'monthly_summary',
  SEASON_REPORT = 'season_report',
  INSURANCE_CLAIM = 'insurance_claim',
  LOAN_APPLICATION = 'loan_application',
  SUSTAINABILITY = 'sustainability',
}

/**
 * Generated report
 */
export interface Report {
  reportId: string;
  farmId: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  period: { start: string; end: string };
  format: 'pdf' | 'json' | 'excel';
  fileUrl: string;
  fileSize: number;
  expiresAt: string;
  sections: ReportSection[];
}

export interface ReportSection {
  title: string;
  type: 'summary' | 'chart' | 'table' | 'image' | 'text';
  data: unknown;
}

// =============================================================================
// SUSTAINABILITY METRICS
// =============================================================================

/**
 * Sustainability tracking
 */
export interface SustainabilityMetrics {
  farmId: string;
  period: { start: string; end: string };
  carbonFootprint: {
    total: number;           // kg CO2 per hectare
    breakdown: { source: string; amount: number }[];
    trend: 'decreasing' | 'stable' | 'increasing';
  };
  waterEfficiency: {
    cropPerDrop: number;     // kg yield per m3 water
    savingsVsBaseline: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  inputReduction: {
    pesticides: number;      // percentage reduction
    fertilizers: number;
    fuel: number;
  };
  biodiversity: {
    score: number;           // 0-100
    factors: string[];
  };
  certifications: CertificationStatus[];
}

export interface CertificationStatus {
  type: 'organic' | 'rainforest_alliance' | 'fair_trade' | 'global_gap';
  status: 'eligible' | 'in_progress' | 'certified' | 'not_eligible';
  requirements: { requirement: string; met: boolean }[];
  estimatedDate?: string;
}

// =============================================================================
// GEOJSON TYPES (for TypeScript compatibility)
// =============================================================================

export namespace GeoJSON {
  export interface Point {
    type: 'Point';
    coordinates: [number, number];
  }

  export interface Polygon {
    type: 'Polygon';
    coordinates: [number, number][][];
  }

  export interface MultiPolygon {
    type: 'MultiPolygon';
    coordinates: [number, number][][][];
  }

  export interface LineString {
    type: 'LineString';
    coordinates: [number, number][];
  }
}
