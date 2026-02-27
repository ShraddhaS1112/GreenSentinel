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
