/**
 * Cache Manager Tests
 */

import {
  cacheFarmData,
  getCachedFarmData,
  cacheThreatHistory,
  getCachedThreatHistory,
  cacheHealthScores,
  getCachedHealthScores,
  clearAllCaches,
  getCacheInfo
} from './cacheManager';

describe('Cache Manager', () => {
  beforeEach(async () => {
    // Clear all caches before each test
    await clearAllCaches();
  });

  describe('Farm Data Caching', () => {
    it('should cache farm data', async () => {
      const farmId = 'farm-123';
      const farmData = { name: 'Test Farm', location: 'India' };

      await cacheFarmData(farmId, farmData);

      const cached = await getCachedFarmData(farmId);
      expect(cached).toEqual(farmData);
    });

    it('should return null for non-existent farm data', async () => {
      const cached = await getCachedFarmData('non-existent');
      expect(cached).toBeNull();
    });

    it('should respect TTL for farm data', async () => {
      const farmId = 'farm-123';
      const farmData = { name: 'Test Farm' };
      const ttl = 100; // 100ms

      await cacheFarmData(farmId, farmData, ttl);

      // Data should be available immediately
      let cached = await getCachedFarmData(farmId);
      expect(cached).toEqual(farmData);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Data should be expired
      cached = await getCachedFarmData(farmId);
      expect(cached).toBeNull();
    });
  });

  describe('Threat History Caching', () => {
    it('should cache threat history', async () => {
      const farmId = 'farm-123';
      const threats = [
        { id: '1', type: 'fire', confidence: 95 },
        { id: '2', type: 'human', confidence: 87 }
      ];

      await cacheThreatHistory(farmId, threats);

      const cached = await getCachedThreatHistory(farmId);
      expect(cached).toEqual(threats);
    });

    it('should return null for non-existent threat history', async () => {
      const cached = await getCachedThreatHistory('non-existent');
      expect(cached).toBeNull();
    });

    it('should cache empty threat history', async () => {
      const farmId = 'farm-123';
      const threats: unknown[] = [];

      await cacheThreatHistory(farmId, threats);

      const cached = await getCachedThreatHistory(farmId);
      expect(cached).toEqual([]);
    });
  });

  describe('Health Scores Caching', () => {
    it('should cache health scores', async () => {
      const farmId = 'farm-123';
      const scores = { score: 85, ndvi: 0.65, timestamp: Date.now() };

      await cacheHealthScores(farmId, scores);

      const cached = await getCachedHealthScores(farmId);
      expect(cached).toEqual(scores);
    });

    it('should return null for non-existent health scores', async () => {
      const cached = await getCachedHealthScores('non-existent');
      expect(cached).toBeNull();
    });

    it('should respect TTL for health scores', async () => {
      const farmId = 'farm-123';
      const scores = { score: 85 };
      const ttl = 100; // 100ms

      await cacheHealthScores(farmId, scores, ttl);

      // Data should be available immediately
      let cached = await getCachedHealthScores(farmId);
      expect(cached).toEqual(scores);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Data should be expired
      cached = await getCachedHealthScores(farmId);
      expect(cached).toBeNull();
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', async () => {
      const farmId = 'farm-123';
      const farmData = { name: 'Test Farm' };
      const threats = [{ id: '1', type: 'fire' }];
      const scores = { score: 85 };

      await cacheFarmData(farmId, farmData);
      await cacheThreatHistory(farmId, threats);
      await cacheHealthScores(farmId, scores);

      // Verify data is cached
      expect(await getCachedFarmData(farmId)).toEqual(farmData);
      expect(await getCachedThreatHistory(farmId)).toEqual(threats);
      expect(await getCachedHealthScores(farmId)).toEqual(scores);

      // Clear all caches
      await clearAllCaches();

      // Verify all caches are cleared
      expect(await getCachedFarmData(farmId)).toBeNull();
      expect(await getCachedThreatHistory(farmId)).toBeNull();
      expect(await getCachedHealthScores(farmId)).toBeNull();
    });

    it('should get cache info', async () => {
      const farmId1 = 'farm-123';
      const farmId2 = 'farm-456';

      await cacheFarmData(farmId1, { name: 'Farm 1' });
      await cacheFarmData(farmId2, { name: 'Farm 2' });
      await cacheThreatHistory(farmId1, [{ id: '1' }]);
      await cacheHealthScores(farmId1, { score: 85 });

      const info = await getCacheInfo();

      expect(info.farmDataSize).toBe(2);
      expect(info.threatHistorySize).toBe(1);
      expect(info.healthScoresSize).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock caches.open to throw an error
      const originalCaches = global.caches;
      Object.defineProperty(global, 'caches', {
        value: {
          open: jest.fn().mockRejectedValue(new Error('Cache error'))
        },
        configurable: true
      });

      await cacheFarmData('farm-123', { name: 'Test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to cache farm data:',
        expect.any(Error)
      );

      // Restore original caches
      Object.defineProperty(global, 'caches', {
        value: originalCaches,
        configurable: true
      });

      consoleSpy.mockRestore();
    });
  });
});
