/**
 * Green Sentinel - Shared Utility Functions
 *
 * Common utilities used across frontend and backend.
 */

import {
  HealthCategory,
  ThreatType,
  Language,
  ThreatScores,
  AlertThresholds,
} from '../types';
import {
  THRESHOLDS,
  HEALTH_CATEGORY_CONFIG,
  THREAT_CONFIG,
  LIMITS,
} from '../constants';

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const id = `${timestamp}-${random}`;
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Generate a DynamoDB-compatible composite key
 */
export function createCompositeKey(...parts: string[]): string {
  return parts.join('#');
}

/**
 * Parse a composite key into its parts
 */
export function parseCompositeKey(key: string): string[] {
  return key.split('#');
}

// =============================================================================
// NDVI & HEALTH SCORE CALCULATIONS
// =============================================================================

/**
 * Convert NDVI value (-1 to 1) to health score (0 to 100)
 * Formula: Score = (NDVI + 1) * 50
 */
export function ndviToHealthScore(ndvi: number): number {
  const clampedNdvi = Math.max(-1, Math.min(1, ndvi));
  const score = (clampedNdvi + 1) * 50;
  return Math.round(score * 10) / 10; // Round to 1 decimal
}

/**
 * Convert health score (0 to 100) back to NDVI (-1 to 1)
 */
export function healthScoreToNdvi(score: number): number {
  const clampedScore = Math.max(0, Math.min(100, score));
  return (clampedScore / 50) - 1;
}

/**
 * Determine health category based on NDVI value
 */
export function getHealthCategoryFromNdvi(ndvi: number): HealthCategory {
  if (ndvi > THRESHOLDS.NDVI.EXCELLENT) return HealthCategory.EXCELLENT;
  if (ndvi > THRESHOLDS.NDVI.GOOD) return HealthCategory.GOOD;
  if (ndvi > THRESHOLDS.NDVI.MODERATE) return HealthCategory.MODERATE;
  if (ndvi > THRESHOLDS.NDVI.POOR) return HealthCategory.POOR;
  return HealthCategory.CRITICAL;
}

/**
 * Determine health category based on health score
 */
export function getHealthCategoryFromScore(score: number): HealthCategory {
  if (score >= HEALTH_CATEGORY_CONFIG.excellent.minScore) return HealthCategory.EXCELLENT;
  if (score >= HEALTH_CATEGORY_CONFIG.good.minScore) return HealthCategory.GOOD;
  if (score >= HEALTH_CATEGORY_CONFIG.moderate.minScore) return HealthCategory.MODERATE;
  if (score >= HEALTH_CATEGORY_CONFIG.poor.minScore) return HealthCategory.POOR;
  return HealthCategory.CRITICAL;
}

/**
 * Get color for health category (for UI rendering)
 */
export function getHealthCategoryColor(category: HealthCategory): string {
  return HEALTH_CATEGORY_CONFIG[category].color;
}

/**
 * Map NDVI value to heatmap color (Red -> Yellow -> Green)
 */
export function ndviToColor(ndvi: number): string {
  if (ndvi < 0.3) {
    // Red to Orange
    const t = ndvi / 0.3;
    return interpolateColor('#EF4444', '#F97316', t);
  } else if (ndvi < 0.6) {
    // Orange to Yellow
    const t = (ndvi - 0.3) / 0.3;
    return interpolateColor('#F97316', '#EAB308', t);
  } else {
    // Yellow to Green
    const t = (ndvi - 0.6) / 0.4;
    return interpolateColor('#EAB308', '#22C55E', t);
  }
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// =============================================================================
// THREAT DETECTION
// =============================================================================

/**
 * Check if threat scores exceed configured thresholds
 */
export function detectThreats(
  scores: ThreatScores,
  thresholds: AlertThresholds = THRESHOLDS.THREAT_DETECTION
): ThreatType[] {
  const detectedThreats: ThreatType[] = [];

  if (scores.fire >= thresholds.fire) {
    detectedThreats.push(ThreatType.FIRE);
  }
  if (scores.human >= thresholds.human) {
    detectedThreats.push(ThreatType.HUMAN);
  }
  if (scores.animal >= thresholds.animal) {
    detectedThreats.push(ThreatType.ANIMAL);
  }

  return detectedThreats;
}

/**
 * Get the highest priority threat from detected threats
 * Priority: Fire > Human > Animal
 */
export function getHighestPriorityThreat(threats: ThreatType[]): ThreatType | null {
  if (threats.includes(ThreatType.FIRE)) return ThreatType.FIRE;
  if (threats.includes(ThreatType.HUMAN)) return ThreatType.HUMAN;
  if (threats.includes(ThreatType.ANIMAL)) return ThreatType.ANIMAL;
  return null;
}

/**
 * Get threat configuration
 */
export function getThreatConfig(threatType: ThreatType) {
  return THREAT_CONFIG[threatType];
}

// =============================================================================
// ALERT MESSAGE FORMATTING
// =============================================================================

/**
 * Format threat alert message in English
 */
export function formatThreatAlert(
  threatType: ThreatType,
  farmName: string,
  confidence: number,
  timestamp: Date
): string {
  const config = THREAT_CONFIG[threatType];
  const timeStr = formatTime(timestamp);
  const dateStr = formatDate(timestamp);

  return `${config.emoji} THREAT DETECTED: ${config.alertTitle}

Farm: ${farmName}
Time: ${timeStr} on ${dateStr}
Confidence: ${confidence}%

Please check your farm immediately.`;
}

/**
 * Format health alert message
 */
export function formatHealthAlert(
  farmName: string,
  currentScore: number,
  previousScore: number,
  timestamp: Date
): string {
  const delta = currentScore - previousScore;
  const direction = delta > 0 ? 'improved' : 'declined';
  const emoji = delta > 0 ? '📈' : '📉';

  return `${emoji} HEALTH UPDATE: Crop health has ${direction}

Farm: ${farmName}
Current Score: ${currentScore}/100
Previous Score: ${previousScore}/100
Change: ${delta > 0 ? '+' : ''}${delta} points
Date: ${formatDate(timestamp)}

${currentScore < 50 ? 'Consider inspecting your crops.' : 'Your crops are doing well.'}`;
}

// =============================================================================
// DATE & TIME UTILITIES
// =============================================================================

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

/**
 * Format date for display (e.g., "27 Feb 2024")
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time for display (e.g., "14:30")
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format timestamp for display (e.g., "27 Feb 2024, 14:30")
 */
export function formatTimestamp(date: Date): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/**
 * Get relative time string (e.g., "5 minutes ago")
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDate(date);
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return formatDateISO(date) === formatDateISO(today);
}

// =============================================================================
// RETRY & BACKOFF
// =============================================================================

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoff(
  attempt: number,
  baseMs: number = LIMITS.RETRY.BACKOFF_BASE_MS,
  maxMs: number = LIMITS.RETRY.BACKOFF_MAX_MS
): number {
  const delay = baseMs * Math.pow(2, attempt);
  return Math.min(delay, maxMs);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseMs: number = LIMITS.RETRY.BACKOFF_BASE_MS,
  maxMs: number = LIMITS.RETRY.BACKOFF_MAX_MS
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = calculateBackoff(attempt, baseMs, maxMs);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate phone number format (Indian mobile numbers)
 */
export function isValidIndianPhone(phone: string): boolean {
  // Remove spaces, dashes, and country code
  const cleaned = phone.replace(/[\s-]/g, '').replace(/^\+91/, '');
  // Indian mobile numbers are 10 digits starting with 6-9
  return /^[6-9]\d{9}$/.test(cleaned);
}

/**
 * Format phone number for WhatsApp (E.164 format)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '').replace(/^\+/, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return `+${cleaned}`;
}

/**
 * Validate latitude
 */
export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

/**
 * Validate longitude
 */
export function isValidLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

/**
 * Validate coordinates are within India (approximate bounds)
 */
export function isWithinIndia(lat: number, lng: number): boolean {
  // Approximate bounding box for India
  return lat >= 6.5 && lat <= 35.5 && lng >= 68 && lng <= 97.5;
}

/**
 * Validate RTSP URL format
 */
export function isValidRtspUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'rtsp:';
  } catch {
    return false;
  }
}

// =============================================================================
// S3 PATH UTILITIES
// =============================================================================

/**
 * Generate S3 path for frame storage
 */
export function getFrameS3Path(
  farmId: string,
  cameraId: string,
  timestamp: Date
): string {
  const dateStr = formatDateISO(timestamp);
  const timeStr = timestamp.toISOString().replace(/[:.]/g, '-');
  return `frames/${farmId}/${cameraId}/${dateStr}/${timeStr}.jpg`;
}

/**
 * Generate S3 path for heatmap storage
 */
export function getHeatmapS3Path(farmId: string, date: Date): string {
  const dateStr = formatDateISO(date);
  return `heatmaps/${farmId}/${dateStr}.png`;
}

/**
 * Parse frame S3 path to extract metadata
 */
export function parseFrameS3Path(path: string): {
  farmId: string;
  cameraId: string;
  date: string;
  filename: string;
} | null {
  const match = path.match(/frames\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
  if (!match || !match[1] || !match[2] || !match[3] || !match[4]) return null;
  return {
    farmId: match[1],
    cameraId: match[2],
    date: match[3],
    filename: match[4],
  };
}

// =============================================================================
// LANGUAGE UTILITIES
// =============================================================================

/**
 * Get language name by code
 */
export function getLanguageName(code: Language): string {
  const names: Record<Language, string> = {
    [Language.HINDI]: 'Hindi',
    [Language.MARATHI]: 'Marathi',
    [Language.TAMIL]: 'Tamil',
    [Language.TELUGU]: 'Telugu',
    [Language.KANNADA]: 'Kannada',
    [Language.BENGALI]: 'Bengali',
    [Language.ENGLISH]: 'English',
  };
  return names[code] || 'English';
}

/**
 * Get native language name by code
 */
export function getLanguageNativeName(code: Language): string {
  const names: Record<Language, string> = {
    [Language.HINDI]: 'हिन्दी',
    [Language.MARATHI]: 'मराठी',
    [Language.TAMIL]: 'தமிழ்',
    [Language.TELUGU]: 'తెలుగు',
    [Language.KANNADA]: 'ಕನ್ನಡ',
    [Language.BENGALI]: 'বাংলা',
    [Language.ENGLISH]: 'English',
  };
  return names[code] || 'English';
}

// =============================================================================
// METRIC CALCULATIONS
// =============================================================================

/**
 * Calculate trend from data points
 */
export function calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
  if (values.length < 2) return 'stable';

  const recentHalf = values.slice(Math.floor(values.length / 2));
  const olderHalf = values.slice(0, Math.floor(values.length / 2));

  const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
  const olderAvg = olderHalf.reduce((a, b) => a + b, 0) / olderHalf.length;

  const diff = recentAvg - olderAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

/**
 * Calculate average of numbers
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Check if a health score change is significant enough to trigger an alert
 * Significant change is defined as a change of more than 10 points
 */
export function hasSignificantChange(
  currentScore: number,
  previousScore: number,
  threshold: number = 10
): boolean {
  return Math.abs(currentScore - previousScore) >= threshold;
}
