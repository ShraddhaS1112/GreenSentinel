import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFarmStore, DEMO_FARMS } from '@/stores/farmStore';
import type { Farm, Camera, ThreatDetection, HealthScore } from '@green-sentinel/shared';

describe('Farm Store', () => {
  const mockFarm: Farm = {
    farmId: 'farm_123',
    userId: 'user_123',
    name: 'Test Farm',
    location: {
      latitude: 12.9,
      longitude: 77.5,
      address: 'Test Address',
      district: 'Test District',
      state: 'Karnataka',
    },
    area: 5,
    cropType: 'Rice',
    cameras: [],
    alertThresholds: { fire: 80, human: 80, animal: 75 },
    language: 'en' as any,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockCamera: Camera = {
    cameraId: 'cam_123',
    name: 'North Camera',
    type: 'rtsp',
    url: 'rtsp://192.168.1.100/stream',
    status: 'connected' as any,
  };

  beforeEach(() => {
    localStorage.clear();
    useFarmStore.setState({
      farms: [],
      currentFarmId: null,
      threats: [],
      healthScores: new Map(),
      dashboardSummary: null,
      isLoading: false,
      error: null,
      lastSyncedAt: null,
      isOnline: true,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useFarmStore.getState();
      expect(state.farms).toEqual([]);
      expect(state.currentFarmId).toBeNull();
      expect(state.threats).toEqual([]);
      expect(state.healthScores).toBeInstanceOf(Map);
      expect(state.dashboardSummary).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastSyncedAt).toBeNull();
      expect(state.isOnline).toBe(true);
    });
  });

  describe('Farm Management', () => {
    it('should add a farm', () => {
      const { addFarm } = useFarmStore.getState();
      addFarm(mockFarm);
      
      const farms = useFarmStore.getState().farms;
      expect(farms).toHaveLength(1);
      expect(farms[0].farmId).toBe('farm_123');
    });

    it('should set farms and auto-select first farm', () => {
      const { setFarms } = useFarmStore.getState();
      setFarms([mockFarm]);
      
      const state = useFarmStore.getState();
      expect(state.farms).toHaveLength(1);
      expect(state.currentFarmId).toBe('farm_123');
    });

    it('should not change currentFarmId if already set', () => {
      useFarmStore.setState({ currentFarmId: 'existing_farm' });
      const { setFarms } = useFarmStore.getState();
      setFarms([mockFarm]);
      
      expect(useFarmStore.getState().currentFarmId).toBe('existing_farm');
    });

    it('should update farm details', () => {
      const { addFarm, updateFarm } = useFarmStore.getState();
      addFarm(mockFarm);
      
      updateFarm('farm_123', { name: 'Updated Farm', area: 10 });
      
      const farm = useFarmStore.getState().farms[0];
      expect(farm.name).toBe('Updated Farm');
      expect(farm.area).toBe(10);
    });

    it('should delete a farm', () => {
      const { addFarm, deleteFarm } = useFarmStore.getState();
      addFarm(mockFarm);
      expect(useFarmStore.getState().farms).toHaveLength(1);
      
      deleteFarm('farm_123');
      
      expect(useFarmStore.getState().farms).toHaveLength(0);
    });

    it('should handle deleting the currently selected farm', () => {
      // Add two farms - one becomes current
      const farm2 = { ...mockFarm, farmId: 'farm_456' };
      const { addFarm, deleteFarm, setCurrentFarm } = useFarmStore.getState();
      addFarm(farm2);
      addFarm(mockFarm);
      setCurrentFarm('farm_123');
      
      deleteFarm('farm_123');
      
      // Should now point to farm_456 or null
      const state = useFarmStore.getState();
      expect(state.farms).toHaveLength(1);
    });

    it('should auto-select next farm when current is deleted', () => {
      const { addFarm, deleteFarm } = useFarmStore.getState();
      // First add farm2, then farm1 to have a predictable order
      const farm2 = { ...mockFarm, farmId: 'farm_456' };
      addFarm(farm2);
      addFarm(mockFarm);
      useFarmStore.setState({ currentFarmId: 'farm_123' });
      
      deleteFarm('farm_123');
      
      // After deleting farm_123, should select farm_456
      const currentId = useFarmStore.getState().currentFarmId;
      expect(currentId).toBe('farm_456');
    });
  });

  describe('Current Farm', () => {
    it('should set current farm', () => {
      const { addFarm, setCurrentFarm } = useFarmStore.getState();
      addFarm(mockFarm);
      
      setCurrentFarm('farm_123');
      
      expect(useFarmStore.getState().currentFarmId).toBe('farm_123');
    });

    it('should get current farm', () => {
      const { addFarm, setCurrentFarm } = useFarmStore.getState();
      addFarm(mockFarm);
      setCurrentFarm('farm_123');
      
      const currentFarm = useFarmStore.getState().getCurrentFarm();
      
      expect(currentFarm).not.toBeNull();
      expect(currentFarm?.farmId).toBe('farm_123');
    });

    it('should return null if no current farm', () => {
      const currentFarm = useFarmStore.getState().getCurrentFarm();
      expect(currentFarm).toBeNull();
    });
  });

  describe('Camera Management', () => {
    it('should add camera to farm', () => {
      const { addFarm, addCamera } = useFarmStore.getState();
      addFarm(mockFarm);
      
      addCamera('farm_123', mockCamera);
      
      const farm = useFarmStore.getState().farms[0];
      expect(farm.cameras).toHaveLength(1);
      expect(farm.cameras[0].cameraId).toBe('cam_123');
    });

    it('should update camera', () => {
      const { addFarm, addCamera, updateCamera } = useFarmStore.getState();
      addFarm(mockFarm);
      addCamera('farm_123', mockCamera);
      
      updateCamera('farm_123', 'cam_123', { name: 'Updated Camera' });
      
      const farm = useFarmStore.getState().farms[0];
      expect(farm.cameras[0].name).toBe('Updated Camera');
    });

    it('should remove camera', () => {
      const { addFarm, addCamera, removeCamera } = useFarmStore.getState();
      addFarm(mockFarm);
      addCamera('farm_123', mockCamera);
      
      removeCamera('farm_123', 'cam_123');
      
      const farm = useFarmStore.getState().farms[0];
      expect(farm.cameras).toHaveLength(0);
    });

    it('should update camera status', () => {
      const { addFarm, addCamera, updateCameraStatus } = useFarmStore.getState();
      addFarm(mockFarm);
      addCamera('farm_123', mockCamera);
      
      updateCameraStatus('farm_123', 'cam_123', 'disconnected');
      
      const farm = useFarmStore.getState().farms[0];
      expect(farm.cameras[0].status).toBe('disconnected');
    });
  });

  describe('Threat Management', () => {
    const mockThreat: ThreatDetection = {
      threatId: 'threat_123',
      farmId: 'farm_123',
      cameraId: 'cam_123',
      threatType: 'fire' as any,
      confidenceScore: 85,
      frameSnapshotPath: '/path/to/frame.jpg',
      frameTimestamp: '2024-01-01T00:00:00.000Z',
      alertSent: false,
      alertDeliveryStatus: 'pending' as any,
      latencyMs: 100,
      analysisMetadata: {} as any,
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    it('should set threats', () => {
      const { setThreats } = useFarmStore.getState();
      setThreats([mockThreat]);
      
      expect(useFarmStore.getState().threats).toHaveLength(1);
    });

    it('should add threat to beginning of list', () => {
      const { setThreats, addThreat } = useFarmStore.getState();
      setThreats([mockThreat]);
      
      const newThreat = { ...mockThreat, threatId: 'threat_456' };
      addThreat(newThreat);
      
      const threats = useFarmStore.getState().threats;
      expect(threats).toHaveLength(2);
      expect(threats[0].threatId).toBe('threat_456');
    });

    it('should limit threats to 100', () => {
      const { setThreats, addThreat } = useFarmStore.getState();
      setThreats([]);
      
      for (let i = 0; i < 105; i++) {
        addThreat({ ...mockThreat, threatId: `threat_${i}` });
      }
      
      expect(useFarmStore.getState().threats).toHaveLength(100);
    });
  });

  describe('Health Score Management', () => {
    const mockHealthScore: HealthScore = {
      farmId: 'farm_123',
      captureDate: '2024-01-01',
      ndvi: 0.75,
      healthScore: 85,
      healthStatus: 'excellent' as any,
    };

    it('should set health scores for farm', () => {
      const { setHealthScores } = useFarmStore.getState();
      setHealthScores('farm_123', [mockHealthScore]);
      
      const scores = useFarmStore.getState().healthScores.get('farm_123');
      expect(scores).toHaveLength(1);
      expect(scores?.[0].ndvi).toBe(0.75);
    });

    it('should add health score to existing farm', () => {
      const { setHealthScores, addHealthScore } = useFarmStore.getState();
      setHealthScores('farm_123', [mockHealthScore]);
      
      const newScore = { ...mockHealthScore, ndvi: 0.8, captureDate: '2024-01-02' };
      addHealthScore('farm_123', newScore);
      
      const scores = useFarmStore.getState().healthScores.get('farm_123');
      expect(scores).toHaveLength(2);
      expect(scores?.[0].captureDate).toBe('2024-01-02');
    });

    it('should limit health scores to 365 per farm', () => {
      const { setHealthScores, addHealthScore } = useFarmStore.getState();
      setHealthScores('farm_123', []);
      
      for (let i = 0; i < 370; i++) {
        addHealthScore('farm_123', { ...mockHealthScore, captureDate: `2024-01-${String(i % 30 + 1).padStart(2, '0')}` });
      }
      
      const scores = useFarmStore.getState().healthScores.get('farm_123');
      expect(scores).toHaveLength(365);
    });
  });

  describe('Dashboard Summary', () => {
    it('should set dashboard summary', () => {
      const summary = {
        farmId: 'farm_123',
        healthScore: 85,
        activeAlerts: 2,
        diseaseRisk: 30,
      };
      
      useFarmStore.getState().setDashboardSummary(summary as any);
      
      expect(useFarmStore.getState().dashboardSummary).toEqual(summary);
    });
  });

  describe('Online Status', () => {
    it('should set online status', () => {
      useFarmStore.getState().setOnlineStatus(false);
      expect(useFarmStore.getState().isOnline).toBe(false);
      
      useFarmStore.getState().setOnlineStatus(true);
      expect(useFarmStore.getState().isOnline).toBe(true);
    });
  });

  describe('Sync', () => {
    it('should update last synced timestamp', () => {
      useFarmStore.getState().setLastSynced();
      expect(useFarmStore.getState().lastSyncedAt).not.toBeNull();
    });
  });

  describe('Clear Data', () => {
    it('should clear all data', () => {
      const { addFarm, setThreats, setDashboardSummary } = useFarmStore.getState();
      addFarm(mockFarm);
      setThreats([{} as ThreatDetection]);
      setDashboardSummary({} as any);
      
      useFarmStore.getState().clearData();
      
      const state = useFarmStore.getState();
      expect(state.farms).toEqual([]);
      expect(state.currentFarmId).toBeNull();
      expect(state.threats).toEqual([]);
      expect(state.dashboardSummary).toBeNull();
    });
  });

  describe('Demo Farms', () => {
    it('should have SK Farm demo data', () => {
      expect(DEMO_FARMS).toHaveLength(1);
      expect(DEMO_FARMS[0].name).toBe('SK Farm');
      expect(DEMO_FARMS[0].farmId).toBe('farm_1772203456065');
    });

    it('should have demo farm with correct location', () => {
      expect(DEMO_FARMS[0].location.latitude).toBeCloseTo(12.612, 2);
      expect(DEMO_FARMS[0].location.longitude).toBeCloseTo(77.154, 2);
      expect(DEMO_FARMS[0].location.state).toBe('Karnataka');
    });

    it('should have demo farm with grapes crop', () => {
      expect(DEMO_FARMS[0].cropType).toBe('Grapes');
    });
  });

  describe('Fetch Farms (Demo Mode)', () => {
    it('should seed demo farms for sk-demo-user', async () => {
      const { fetchFarms } = useFarmStore.getState();
      await fetchFarms('sk-demo-user');
      
      const state = useFarmStore.getState();
      expect(state.farms).toEqual(DEMO_FARMS);
      expect(state.isLoading).toBe(false);
    });

    it('should skip fetch for demo userId', async () => {
      const { fetchFarms } = useFarmStore.getState();
      await fetchFarms('demo_user');
      
      expect(useFarmStore.getState().isLoading).toBe(false);
    });

    it('should skip fetch for empty userId', async () => {
      const { fetchFarms } = useFarmStore.getState();
      await fetchFarms('' as any);
      
      expect(useFarmStore.getState().isLoading).toBe(false);
    });
  });
});
