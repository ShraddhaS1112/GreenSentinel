import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedData,
  setCachedData,
  fetchWithCache,
  getFarms,
  getFarm,
  createFarm,
  updateFarm,
  deleteFarm,
  getAlerts,
  healthCheck,
  getSatelliteData,
  getCropHealth,
  getForecast,
  getDiseaseScanUploadUrl,
  analyzeDiseaseScan,
  getDiseaseScanHistory,
  analyzeThreat,
  getAgentStatus,
  getIrrigationRecommendations,
} from '@/services/apiService';
import type { ApiResponse } from '@/services/apiService';

describe('API Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('getCachedData', () => {
    it('should return null for non-existent key', () => {
      const result = getCachedData('non_existent');
      expect(result).toBeNull();
    });

    it('should return cached data within expiry', () => {
      const data = { test: 'value' };
      setCachedData('test_key', data);
      
      const result = getCachedData('test_key');
      expect(result).toEqual(data);
    });

    it('should return null for expired cache', () => {
      const data = { test: 'value' };
      localStorage.setItem(
        'gs_api_cache_test_key',
        JSON.stringify({ data, timestamp: Date.now() - 10 * 60 * 1000 }) // 10 minutes ago
      );
      
      const result = getCachedData('test_key');
      expect(result).toBeNull();
    });
  });

  describe('setCachedData', () => {
    it('should store data in localStorage', () => {
      const data = { farmId: '123', name: 'Test Farm' };
      setCachedData('farms', data);
      
      const cached = localStorage.getItem('gs_api_cache_farms');
      expect(cached).not.toBeNull();
      
      const parsed = JSON.parse(cached!);
      expect(parsed.data).toEqual(data);
      expect(parsed.timestamp).toBeDefined();
    });

    it('should overwrite existing cached data', () => {
      setCachedData('test', { old: 'value' });
      setCachedData('test', { new: 'value' });
      
      const result = getCachedData('test');
      expect(result).toEqual({ new: 'value' });
    });
  });

  describe('fetchWithCache', () => {
    it('should fetch fresh data and cache it', async () => {
      const mockResponse: ApiResponse<any> = {
        data: { farmId: '123', name: 'Test Farm' },
        error: null,
        status: 200,
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse.data),
      });
      
      const fetchFn = vi.fn().mockResolvedValue(mockResponse);
      const result = await fetchWithCache('farms', fetchFn);
      
      expect(result.data).toEqual(mockResponse.data);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should return cached data on fetch failure', async () => {
      const cachedData = { farmId: 'cached', name: 'Cached Farm' };
      setCachedData('farms', cachedData);
      
      const mockErrorResponse: ApiResponse<any> = {
        data: null,
        error: 'Network error',
        status: 0,
      };
      
      const fetchFn = vi.fn().mockResolvedValue(mockErrorResponse);
      const result = await fetchWithCache('farms', fetchFn);
      
      expect(result.data).toEqual(cachedData);
    });

    it('should return error when both fetch fails and no cache', async () => {
      const mockErrorResponse: ApiResponse<any> = {
        data: null,
        error: 'Network error',
        status: 0,
      };
      
      const fetchFn = vi.fn().mockResolvedValue(mockErrorResponse);
      const result = await fetchWithCache('farms', fetchFn);
      
      expect(result.data).toBeNull();
      expect(result.error).toBe('Network error');
    });
  });

  describe('getFarms', () => {
    it('should call API with correct endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ farmId: '123' }]),
      });
      
      await getFarms('user_123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/farms?userId=user_123'),
        expect.any(Object)
      );
    });
  });

  describe('getFarm', () => {
    it('should call API with farmId and userId', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ farmId: 'farm_123' }),
      });
      
      await getFarm('farm_123', 'user_123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/farms/farm_123'),
        expect.any(Object)
      );
    });
  });

  describe('createFarm', () => {
    it('should POST farm data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      
      const farm = {
        farmId: 'farm_123',
        userId: 'user_123',
        name: 'New Farm',
        location: { latitude: 0, longitude: 0 },
        totalArea: 5,
        areaUnit: 'hectares' as const,
        crops: ['Rice'],
        createdAt: '2024-01-01',
      };
      
      await createFarm(farm);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/farms'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('updateFarm', () => {
    it('should PUT updated farm data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      
      await updateFarm('farm_123', { name: 'Updated Name' });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/farms/farm_123'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('deleteFarm', () => {
    it('should DELETE farm', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      
      await deleteFarm('farm_123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/farms/farm_123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('getAlerts', () => {
    it('should call API with farmId', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });
      
      await getAlerts('farm_123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/alerts?farmId=farm_123'),
        expect.any(Object)
      );
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy', stage: 'dev' }),
      });
      
      const result = await healthCheck();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.any(Object)
      );
    });
  });

  describe('getSatelliteData', () => {
    it('should fetch satellite data with default days', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ farmId: 'farm_123', data: [] }),
      });
      
      await getSatelliteData('farm_123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('days=30'),
        expect.any(Object)
      );
    });

    it('should fetch satellite data with custom days', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ farmId: 'farm_123', data: [] }),
      });
      
      await getSatelliteData('farm_123', 60);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('days=60'),
        expect.any(Object)
      );
    });
  });

  describe('getCropHealth', () => {
    it('should fetch crop health data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ farmId: 'farm_123', history: [] }),
      });
      
      await getCropHealth('farm_123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/crop-health'),
        expect.any(Object)
      );
    });
  });

  describe('getForecast', () => {
    it('should fetch weather forecast', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ farmId: 'farm_123', forecasts: [] }),
      });
      
      await getForecast('farm_123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/forecast'),
        expect.any(Object)
      );
    });
  });

  describe('getDiseaseScanUploadUrl', () => {
    it('should get upload URL for disease scan', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          uploadUrl: 'https://s3.example.com/upload',
          scanId: 'scan_123',
          key: 'scans/scan_123.jpg',
          expiresIn: 60,
        }),
      });
      
      await getDiseaseScanUploadUrl('farm_123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/disease-scan/upload-url'),
        expect.any(Object)
      );
    });
  });

  describe('analyzeDiseaseScan', () => {
    it('should send analysis request with scan details', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          scanId: 'scan_123',
          analysis: { detected: true, disease: 'Late Blight' },
        }),
      });
      
      await analyzeDiseaseScan('farm_123', 'scan_123', 'key_123', 'Tomato');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/disease-scan/analyze'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('getDiseaseScanHistory', () => {
    it('should fetch disease scan history', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ farmId: 'farm_123', scans: [] }),
      });
      
      await getDiseaseScanHistory('farm_123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/disease-scan'),
        expect.any(Object)
      );
    });
  });

  describe('analyzeThreat', () => {
    it('should send threat analysis request with base64 image', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          farmId: 'farm_123',
          analysis: { overallThreat: 'none' },
          analyzedAt: '2024-01-01T00:00:00.000Z',
        }),
      });
      
      const base64Image = 'data:image/jpeg;base64,/9j/4AAQ...';
      await analyzeThreat('farm_123', base64Image);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/threat-detect'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('getAgentStatus', () => {
    it('should fetch edge agent status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ online: true, lastSeen: null, cameras: [] }),
      });
      
      await getAgentStatus('farm_123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/agent-heartbeat'),
        expect.any(Object)
      );
    });
  });

  describe('getIrrigationRecommendations', () => {
    it('should fetch irrigation recommendations', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ farmId: 'farm_123', weeklySchedule: [] }),
      });
      
      await getIrrigationRecommendations('farm_123', 'user_123');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/irrigation'),
        expect.any(Object)
      );
    });
  });
});
