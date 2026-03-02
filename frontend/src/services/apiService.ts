/**
 * Green Sentinel - API Service
 *
 * Connects frontend to AWS API Gateway backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://4uogxqomb0.execute-api.ap-south-1.amazonaws.com/dev';

// Types
export interface Farm {
  userId: string;
  farmId: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    district?: string;
    state?: string;
  };
  totalArea: number;
  areaUnit: 'hectares' | 'acres';
  crops: string[];
  soilType?: string;
  irrigationType?: string;
  notificationPhone?: string; // WhatsApp number for alerts (e.g., "whatsapp:+919876543210")
  createdAt: string;
  updatedAt?: string;
}

export interface Alert {
  farmId: string;
  alertTimestamp: string;
  alertId: string;
  alertType: 'disease' | 'pest' | 'weather' | 'irrigation' | 'satellite';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  advisory: string;
  isRead: boolean;
  ttl?: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: data.error || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    return {
      data,
      error: null,
      status: response.status,
    };
  } catch (error) {
    console.error('API call failed:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
}

// ============================================================================
// Farm API
// ============================================================================

export async function getFarms(userId: string = 'demo-user'): Promise<ApiResponse<Farm[]>> {
  return apiCall<Farm[]>(`/farms?userId=${encodeURIComponent(userId)}`);
}

export async function getFarm(farmId: string, userId: string = 'demo-user'): Promise<ApiResponse<Farm>> {
  return apiCall<Farm>(`/farms/${encodeURIComponent(farmId)}?userId=${encodeURIComponent(userId)}`);
}

export async function createFarm(farm: Omit<Farm, 'createdAt' | 'updatedAt'>): Promise<ApiResponse<{ success: boolean }>> {
  return apiCall<{ success: boolean }>('/farms', {
    method: 'POST',
    body: JSON.stringify(farm),
  });
}

export async function updateFarm(farmId: string, updates: Partial<Farm>): Promise<ApiResponse<{ success: boolean }>> {
  return apiCall<{ success: boolean }>(`/farms/${encodeURIComponent(farmId)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteFarm(farmId: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiCall<{ success: boolean }>(`/farms/${encodeURIComponent(farmId)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Alerts API
// ============================================================================

export async function getAlerts(farmId: string): Promise<ApiResponse<Alert[]>> {
  return apiCall<Alert[]>(`/alerts?farmId=${encodeURIComponent(farmId)}`);
}

export async function createAlert(alert: Omit<Alert, 'alertTimestamp'>): Promise<ApiResponse<{ success: boolean }>> {
  return apiCall<{ success: boolean }>('/alerts', {
    method: 'POST',
    body: JSON.stringify({
      ...alert,
      alertTimestamp: new Date().toISOString(),
    }),
  });
}

// ============================================================================
// Health Check
// ============================================================================

export async function healthCheck(): Promise<ApiResponse<{ status: string; stage: string }>> {
  return apiCall<{ status: string; stage: string }>('/health');
}

// ============================================================================
// Trigger Alert (for testing)
// ============================================================================

export async function triggerAlert(
  farmId: string,
  userId: string,
  alert: {
    alertType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
  }
): Promise<ApiResponse<{ success: boolean }>> {
  return apiCall<{ success: boolean }>('/alerts/trigger', {
    method: 'POST',
    body: JSON.stringify({
      farmId,
      userId,
      ...alert,
    }),
  });
}

// ============================================================================
// Satellite Data API (NDVI, vegetation indices)
// ============================================================================

export interface SatelliteData {
  farmId: string;
  captureDate: string;
  ndvi: number;
  ndwi: number;
  lai: number;
  cloudCover: number;
  healthStatus: 'excellent' | 'good' | 'moderate' | 'stressed' | 'poor';
  healthScore: number;
  source: string;
  processedAt: string;
  bbox?: number[]; // [minLng, minLat, maxLng, maxLat]
}

export interface SatelliteDataResponse {
  farmId: string;
  dateRange: { start: string; end: string };
  data: SatelliteData[];
  count: number;
}

export async function getSatelliteData(
  farmId: string,
  days: number = 30
): Promise<ApiResponse<SatelliteDataResponse>> {
  return apiCall<SatelliteDataResponse>(
    `/satellite?farmId=${encodeURIComponent(farmId)}&days=${days}`
  );
}

// ============================================================================
// Crop Health API
// ============================================================================

export interface CropHealthRecord {
  fieldId: string;
  recordDate: string;
  ndvi: number;
  healthScore: number;
  healthStatus: string;
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export interface CropHealthResponse {
  farmId: string;
  dateRange: { start: string; end: string };
  current: CropHealthRecord | null;
  trend: 'improving' | 'stable' | 'declining';
  averageNdvi: number | null;
  history: CropHealthRecord[];
  count: number;
}

export async function getCropHealth(
  farmId: string,
  days: number = 30
): Promise<ApiResponse<CropHealthResponse>> {
  return apiCall<CropHealthResponse>(
    `/crop-health?farmId=${encodeURIComponent(farmId)}&days=${days}`
  );
}

// ============================================================================
// Disease/Pest Forecast API
// ============================================================================

export interface DiseaseRisk {
  disease: string;
  name: string;
  risk: number;
  severity: 'low' | 'medium' | 'high';
  affectedCrops: string[];
}

export interface PestRisk {
  pest: string;
  name: string;
  risk: number;
  severity: 'low' | 'medium' | 'high';
  affectedCrops: string[];
}

export interface WeatherConditions {
  temp: number;
  humidity: number;
  precipitation: number;
  cloudCover: number;
  windSpeed: number;
  dewPoint: number;
  consecutiveWetDays: number;
}

export interface Forecast {
  timestamp: string;
  diseases: DiseaseRisk[];
  pests: PestRisk[];
  weather: WeatherConditions;
}

export interface ForecastResponse {
  farmId: string;
  forecasts: Forecast[];
  latest: Forecast | null;
}

export async function getForecast(
  farmId: string
): Promise<ApiResponse<ForecastResponse>> {
  return apiCall<ForecastResponse>(
    `/forecast?farmId=${encodeURIComponent(farmId)}`
  );
}

// ============================================================================
// Offline Support - Cache API responses
// ============================================================================

const CACHE_PREFIX = 'gs_api_cache_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // Storage full or unavailable
  }
}

// Fetch with cache fallback (for offline support)
export async function fetchWithCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<ApiResponse<T>>
): Promise<ApiResponse<T>> {
  // Try to fetch fresh data
  const response = await fetchFn();

  if (response.data) {
    // Cache successful response
    setCachedData(cacheKey, response.data);
    return response;
  }

  // If fetch failed, try cache
  const cached = getCachedData<T>(cacheKey);
  if (cached) {
    return {
      data: cached,
      error: null,
      status: 200,
    };
  }

  return response;
}

// ============================================================================
// Disease Scanner API (AI-powered plant disease detection)
// ============================================================================

export interface DiseaseAnalysis {
  detected: boolean;
  disease: string | null;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  symptoms: string[];
  causes: string[];
  treatment: string[];
  prevention: string[];
  affectedCrops: string[];
  hindiName: string;
  summary: string;
}

export interface DiseaseScanResult {
  scanId: string;
  scanDate: string;
  title: string;
  severity: string;
  analysis: DiseaseAnalysis;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  scanId: string;
  key: string;
  expiresIn: number;
}

export async function getDiseaseScanUploadUrl(
  farmId: string
): Promise<ApiResponse<UploadUrlResponse>> {
  return apiCall<UploadUrlResponse>(
    `/disease-scan/upload-url?farmId=${encodeURIComponent(farmId)}`
  );
}

export async function analyzeDiseaseScan(
  farmId: string,
  scanId: string,
  key: string,
  cropType?: string
): Promise<ApiResponse<{ success: boolean; scanId: string; analysis: DiseaseAnalysis }>> {
  return apiCall<{ success: boolean; scanId: string; analysis: DiseaseAnalysis }>(
    '/disease-scan/analyze',
    {
      method: 'POST',
      body: JSON.stringify({ farmId, scanId, key, cropType }),
    }
  );
}

export async function getDiseaseScanHistory(
  farmId: string
): Promise<ApiResponse<{ farmId: string; scans: DiseaseScanResult[] }>> {
  return apiCall<{ farmId: string; scans: DiseaseScanResult[] }>(
    `/disease-scan?farmId=${encodeURIComponent(farmId)}`
  );
}

// ============================================================================
// AI Threat Detection API
// ============================================================================

export interface ThreatAnalysis {
  fire: { detected: boolean; confidence: number; description: string | null };
  human: { detected: boolean; confidence: number; count: number; activity: string | null; suspicious: boolean };
  animal: { detected: boolean; confidence: number; species: string[]; description: string | null };
  overallThreat: 'none' | 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export async function analyzeThreat(
  farmId: string,
  imageData: string // base64 JPEG
): Promise<ApiResponse<{ farmId: string; analysis: ThreatAnalysis; analyzedAt: string }>> {
  return apiCall<{ farmId: string; analysis: ThreatAnalysis; analyzedAt: string }>(
    '/threat-detect',
    {
      method: 'POST',
      body: JSON.stringify({ farmId, imageData }),
    }
  );
}

// ============================================================================
// Irrigation Planner API
// ============================================================================

export interface IrrigationDay {
  date: string;
  rainExpected: number;
  evapotranspiration: number;
  waterRequirement: number;
  irrigationNeeded: number;
  maxTemperature: number;
  recommendation: string;
}

export interface IrrigationResponse {
  farmId: string;
  farmName: string;
  cropHealth: { ndvi: number; status: string };
  weeklySchedule: IrrigationDay[];
  recommendations: string[];
  totalWaterNeeded: string;
  generatedAt: string;
}

export async function getIrrigationRecommendations(
  farmId: string,
  userId: string = 'demo-user'
): Promise<ApiResponse<IrrigationResponse>> {
  return apiCall<IrrigationResponse>(
    `/irrigation?farmId=${encodeURIComponent(farmId)}&userId=${encodeURIComponent(userId)}`
  );
}
