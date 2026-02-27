/**
 * Green Sentinel - Farm Store
 *
 * Zustand store for managing farm data with offline caching.
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

  // Actions
  setFarms: (farms: Farm[]) => void;
  setCurrentFarm: (farmId: string) => void;
  getCurrentFarm: () => Farm | null;
  addFarm: (farm: Farm) => void;
  updateFarm: (farmId: string, updates: Partial<Farm>) => void;
  deleteFarm: (farmId: string) => void;

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
  clearData: () => void;
}

// =============================================================================
// MOCK DATA (For demo purposes)
// =============================================================================

const mockFarms: Farm[] = [
  {
    farmId: 'farm_001',
    userId: 'user_demo_001',
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
      {
        cameraId: 'cam_002',
        farmId: 'farm_001',
        name: 'Field Camera 1',
        rtspUrl: 'rtsp://192.168.1.101:554/stream',
        status: 'connected' as CameraStatus,
        captureInterval: 10,
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
  {
    farmId: 'farm_002',
    userId: 'user_demo_001',
    name: 'Green Valley Estate',
    location: {
      latitude: 19.0760,
      longitude: 72.8777,
      address: 'Nashik Road, Maharashtra',
      district: 'Nashik',
      state: 'Maharashtra',
    },
    area: 50,
    cropType: 'Grapes',
    cameras: [
      {
        cameraId: 'cam_003',
        farmId: 'farm_002',
        name: 'Main Entrance',
        rtspUrl: 'rtsp://192.168.2.100:554/stream',
        status: 'connected' as CameraStatus,
        captureInterval: 5,
        createdAt: new Date().toISOString(),
      },
    ],
    alertThresholds: {
      fire: 80,
      human: 80,
      animal: 75,
    },
    language: 'mr' as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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

      // Farm actions
      setFarms: (farms) => {
        set({ farms });
        // Set first farm as current if none selected
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
      },

      // Camera actions
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

      // Threat actions
      setThreats: (threats) => {
        set({ threats });
      },

      addThreat: (threat) => {
        set((state) => ({
          threats: [threat, ...state.threats].slice(0, 100), // Keep last 100
        }));
      },

      // Health actions
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
          newMap.set(farmId, [score, ...existing].slice(0, 365)); // Keep 1 year
          return { healthScores: newMap };
        });
      },

      // Dashboard
      setDashboardSummary: (summary) => {
        set({ dashboardSummary: summary });
      },

      // Sync
      setLastSynced: () => {
        set({ lastSyncedAt: new Date().toISOString() });
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
        threats: state.threats.slice(0, 50), // Cache last 50 threats
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
