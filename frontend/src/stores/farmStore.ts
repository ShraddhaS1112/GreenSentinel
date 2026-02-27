/**
 * Green Sentinel - Farm Store
 *
 * Zustand store for managing farm data with AWS API backend and offline caching.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Farm,
  Camera,
  ThreatDetection,
  HealthScore,
  DashboardSummary,
  CameraStatus,
} from '@green-sentinel/shared';
import * as api from '@/services/apiService';

// =============================================================================
// TYPES
// =============================================================================

interface FarmState {
  // Data
  farms: Farm[];
  currentFarmId: string | null;
  threats: ThreatDetection[];
  healthScores: Map<string, HealthScore[]>;
  dashboardSummary: DashboardSummary | null;

  // UI State
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  isOnline: boolean;

  // Actions
  setFarms: (farms: Farm[]) => void;
  setCurrentFarm: (farmId: string) => void;
  getCurrentFarm: () => Farm | null;
  addFarm: (farm: Farm) => void;
  updateFarm: (farmId: string, updates: Partial<Farm>) => void;
  deleteFarm: (farmId: string) => void;

  // Async API actions
  fetchFarms: (userId?: string) => Promise<void>;
  saveFarmToApi: (farm: Farm) => Promise<boolean>;
  deleteFarmFromApi: (farmId: string) => Promise<boolean>;

  // Camera actions
  addCamera: (farmId: string, camera: Camera) => void;
  updateCamera: (farmId: string, cameraId: string, updates: Partial<Camera>) => void;
  removeCamera: (farmId: string, cameraId: string) => void;
  updateCameraStatus: (farmId: string, cameraId: string, status: CameraStatus) => void;

  // Threat actions
  setThreats: (threats: ThreatDetection[]) => void;
  addThreat: (threat: ThreatDetection) => void;

  // Health actions
  setHealthScores: (farmId: string, scores: HealthScore[]) => void;
  addHealthScore: (farmId: string, score: HealthScore) => void;

  // Dashboard
  setDashboardSummary: (summary: DashboardSummary) => void;

  // Sync
  setLastSynced: () => void;
  setOnlineStatus: (online: boolean) => void;
  clearData: () => void;
}

// =============================================================================
// MOCK DATA (Fallback for demo/offline)
// =============================================================================

const mockFarms: Farm[] = [
  {
    farmId: 'farm_001',
    userId: 'demo-user',
    name: 'Sunrise Farm',
    location: {
      latitude: 18.5204,
      longitude: 73.8567,
      address: 'Pune Rural, Maharashtra',
      district: 'Pune',
      state: 'Maharashtra',
    },
    area: 25,
    cropType: 'Sugarcane',
    cameras: [
      {
        cameraId: 'cam_001',
        farmId: 'farm_001',
        name: 'North Gate Camera',
        rtspUrl: 'rtsp://192.168.1.100:554/stream',
        status: 'connected' as CameraStatus,
        captureInterval: 5,
        lastFrameAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ],
    alertThresholds: {
      fire: 80,
      human: 80,
      animal: 75,
    },
    language: 'hi' as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// =============================================================================
// HELPER: Convert between API and local Farm types
// =============================================================================

function apiToLocalFarm(apiFarm: api.Farm): Farm {
  return {
    farmId: apiFarm.farmId,
    userId: apiFarm.userId,
    name: apiFarm.name,
    location: apiFarm.location,
    area: apiFarm.totalArea,
    cropType: apiFarm.crops[0] || 'Unknown',
    cameras: [],
    alertThresholds: { fire: 80, human: 80, animal: 75 },
    language: 'en' as any,
    createdAt: apiFarm.createdAt,
    updatedAt: apiFarm.updatedAt || apiFarm.createdAt,
  };
}

function localToApiFarm(farm: Farm): api.Farm {
  return {
    farmId: farm.farmId,
    userId: farm.userId,
    name: farm.name,
    location: farm.location,
    totalArea: farm.area || 0,
    areaUnit: 'hectares',
    crops: [farm.cropType || 'Unknown'],
    soilType: 'loamy',
    createdAt: farm.createdAt || new Date().toISOString(),
    updatedAt: farm.updatedAt,
  };
}

// =============================================================================
// STORE
// =============================================================================

export const useFarmStore = create<FarmState>()(
  persist(
    (set, get) => ({
      // Initial state
      farms: mockFarms,
      currentFarmId: mockFarms[0]?.farmId || null,
      threats: [],
      healthScores: new Map(),
      dashboardSummary: null,
      isLoading: false,
      error: null,
      lastSyncedAt: null,
      isOnline: navigator.onLine,

      // =========================================================================
      // Farm actions (local)
      // =========================================================================

      setFarms: (farms) => {
        set({ farms });
        if (!get().currentFarmId && farms.length > 0) {
          set({ currentFarmId: farms[0]?.farmId || null });
        }
      },

      setCurrentFarm: (farmId) => {
        set({ currentFarmId: farmId });
      },

      getCurrentFarm: () => {
        const { farms, currentFarmId } = get();
        return farms.find((f) => f.farmId === currentFarmId) || null;
      },

      addFarm: (farm) => {
        set((state) => ({
          farms: [...state.farms, farm],
        }));
        // Sync to API if online
        if (get().isOnline) {
          get().saveFarmToApi(farm);
        }
      },

      updateFarm: (farmId, updates) => {
        set((state) => ({
          farms: state.farms.map((f) =>
            f.farmId === farmId
              ? { ...f, ...updates, updatedAt: new Date().toISOString() }
              : f
          ),
        }));
      },

      deleteFarm: (farmId) => {
        set((state) => ({
          farms: state.farms.filter((f) => f.farmId !== farmId),
          currentFarmId:
            state.currentFarmId === farmId
              ? state.farms[0]?.farmId || null
              : state.currentFarmId,
        }));
        // Sync to API if online
        if (get().isOnline) {
          get().deleteFarmFromApi(farmId);
        }
      },

      // =========================================================================
      // Async API actions
      // =========================================================================

      fetchFarms: async (userId = 'demo-user') => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.fetchWithCache(`farms_${userId}`, () =>
            api.getFarms(userId)
          );

          if (response.data && response.data.length > 0) {
            const farms = response.data.map(apiToLocalFarm);
            set({
              farms,
              currentFarmId: get().currentFarmId || farms[0]?.farmId || null,
              isLoading: false,
              lastSyncedAt: new Date().toISOString(),
            });
          } else {
            // No farms from API, keep local/mock data
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Failed to fetch farms:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch farms',
            isLoading: false,
          });
        }
      },

      saveFarmToApi: async (farm) => {
        try {
          const apiFarm = localToApiFarm(farm);
          const response = await api.createFarm(apiFarm);
          return response.data?.success || false;
        } catch (error) {
          console.error('Failed to save farm to API:', error);
          return false;
        }
      },

      deleteFarmFromApi: async (farmId) => {
        try {
          const response = await api.deleteFarm(farmId);
          return response.data?.success || false;
        } catch (error) {
          console.error('Failed to delete farm from API:', error);
          return false;
        }
      },

      // =========================================================================
      // Camera actions
      // =========================================================================

      addCamera: (farmId, camera) => {
        set((state) => ({
          farms: state.farms.map((f) =>
            f.farmId === farmId
              ? { ...f, cameras: [...f.cameras, camera] }
              : f
          ),
        }));
      },

      updateCamera: (farmId, cameraId, updates) => {
        set((state) => ({
          farms: state.farms.map((f) =>
            f.farmId === farmId
              ? {
                  ...f,
                  cameras: f.cameras.map((c) =>
                    c.cameraId === cameraId ? { ...c, ...updates } : c
                  ),
                }
              : f
          ),
        }));
      },

      removeCamera: (farmId, cameraId) => {
        set((state) => ({
          farms: state.farms.map((f) =>
            f.farmId === farmId
              ? {
                  ...f,
                  cameras: f.cameras.filter((c) => c.cameraId !== cameraId),
                }
              : f
          ),
        }));
      },

      updateCameraStatus: (farmId, cameraId, status) => {
        get().updateCamera(farmId, cameraId, { status });
      },

      // =========================================================================
      // Threat actions
      // =========================================================================

      setThreats: (threats) => {
        set({ threats });
      },

      addThreat: (threat) => {
        set((state) => ({
          threats: [threat, ...state.threats].slice(0, 100),
        }));
      },

      // =========================================================================
      // Health actions
      // =========================================================================

      setHealthScores: (farmId, scores) => {
        set((state) => {
          const newMap = new Map(state.healthScores);
          newMap.set(farmId, scores);
          return { healthScores: newMap };
        });
      },

      addHealthScore: (farmId, score) => {
        set((state) => {
          const newMap = new Map(state.healthScores);
          const existing = newMap.get(farmId) || [];
          newMap.set(farmId, [score, ...existing].slice(0, 365));
          return { healthScores: newMap };
        });
      },

      // =========================================================================
      // Dashboard
      // =========================================================================

      setDashboardSummary: (summary) => {
        set({ dashboardSummary: summary });
      },

      // =========================================================================
      // Sync & Status
      // =========================================================================

      setLastSynced: () => {
        set({ lastSyncedAt: new Date().toISOString() });
      },

      setOnlineStatus: (online) => {
        set({ isOnline: online });
        // Attempt to sync when coming back online
        if (online) {
          get().fetchFarms();
        }
      },

      clearData: () => {
        set({
          farms: [],
          currentFarmId: null,
          threats: [],
          healthScores: new Map(),
          dashboardSummary: null,
        });
      },
    }),
    {
      name: 'green-sentinel-farm',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        farms: state.farms,
        currentFarmId: state.currentFarmId,
        threats: state.threats.slice(0, 50),
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);

// =============================================================================
// Initialize: Listen for online/offline events
// =============================================================================

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useFarmStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useFarmStore.getState().setOnlineStatus(false);
  });
}
