/**
 * Cache Manager Utility
 * Handles caching of farm data and threat history for offline access
 */

const FARM_DATA_CACHE = 'farm-data-cache-v1';
const THREAT_HISTORY_CACHE = 'threat-history-cache-v1';
const HEALTH_SCORES_CACHE = 'health-scores-cache-v1';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
}

/**
 * Store farm data in cache
 */
export const cacheFarmData = async (
  farmId: string,
  data: unknown,
  ttl?: number
): Promise<void> => {
  try {
    const cache = await caches.open(FARM_DATA_CACHE);
    const entry: CacheEntry<unknown> = {
      data,
      timestamp: Date.now(),
      ttl
    };
    const response = new Response(JSON.stringify(entry), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/farm-data/${farmId}`, response);
  } catch (error) {
    console.error('Failed to cache farm data:', error);
  }
};

/**
 * Retrieve farm data from cache
 */
export const getCachedFarmData = async (farmId: string): Promise<unknown | null> => {
  try {
    const cache = await caches.open(FARM_DATA_CACHE);
    const response = await cache.match(`/farm-data/${farmId}`);

    if (!response) {
      return null;
    }

    const entry: CacheEntry<unknown> = await response.json();

    // Check if cache has expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      await cache.delete(`/farm-data/${farmId}`);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Failed to retrieve cached farm data:', error);
    return null;
  }
};

/**
 * Store threat history in cache
 */
export const cacheThreatHistory = async (
  farmId: string,
  threats: unknown[],
  ttl?: number
): Promise<void> => {
  try {
    const cache = await caches.open(THREAT_HISTORY_CACHE);
    const entry: CacheEntry<unknown[]> = {
      data: threats,
      timestamp: Date.now(),
      ttl
    };
    const response = new Response(JSON.stringify(entry), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/threats/${farmId}`, response);
  } catch (error) {
    console.error('Failed to cache threat history:', error);
  }
};

/**
 * Retrieve threat history from cache
 */
export const getCachedThreatHistory = async (
  farmId: string
): Promise<unknown[] | null> => {
  try {
    const cache = await caches.open(THREAT_HISTORY_CACHE);
    const response = await cache.match(`/threats/${farmId}`);

    if (!response) {
      return null;
    }

    const entry: CacheEntry<unknown[]> = await response.json();

    // Check if cache has expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      await cache.delete(`/threats/${farmId}`);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Failed to retrieve cached threat history:', error);
    return null;
  }
};

/**
 * Store health scores in cache
 */
export const cacheHealthScores = async (
  farmId: string,
  scores: unknown,
  ttl?: number
): Promise<void> => {
  try {
    const cache = await caches.open(HEALTH_SCORES_CACHE);
    const entry: CacheEntry<unknown> = {
      data: scores,
      timestamp: Date.now(),
      ttl
    };
    const response = new Response(JSON.stringify(entry), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/health/${farmId}`, response);
  } catch (error) {
    console.error('Failed to cache health scores:', error);
  }
};

/**
 * Retrieve health scores from cache
 */
export const getCachedHealthScores = async (
  farmId: string
): Promise<unknown | null> => {
  try {
    const cache = await caches.open(HEALTH_SCORES_CACHE);
    const response = await cache.match(`/health/${farmId}`);

    if (!response) {
      return null;
    }

    const entry: CacheEntry<unknown> = await response.json();

    // Check if cache has expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      await cache.delete(`/health/${farmId}`);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Failed to retrieve cached health scores:', error);
    return null;
  }
};

/**
 * Clear all cached data
 */
export const clearAllCaches = async (): Promise<void> => {
  try {
    const cacheNames = [FARM_DATA_CACHE, THREAT_HISTORY_CACHE, HEALTH_SCORES_CACHE];
    await Promise.all(
      cacheNames.map((cacheName) => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
};

/**
 * Get cache size information
 */
export const getCacheInfo = async (): Promise<{
  farmDataSize: number;
  threatHistorySize: number;
  healthScoresSize: number;
}> => {
  try {
    const farmDataCache = await caches.open(FARM_DATA_CACHE);
    const threatHistoryCache = await caches.open(THREAT_HISTORY_CACHE);
    const healthScoresCache = await caches.open(HEALTH_SCORES_CACHE);

    const farmDataKeys = await farmDataCache.keys();
    const threatHistoryKeys = await threatHistoryCache.keys();
    const healthScoresKeys = await healthScoresCache.keys();

    return {
      farmDataSize: farmDataKeys.length,
      threatHistorySize: threatHistoryKeys.length,
      healthScoresSize: healthScoresKeys.length
    };
  } catch (error) {
    console.error('Failed to get cache info:', error);
    return {
      farmDataSize: 0,
      threatHistorySize: 0,
      healthScoresSize: 0
    };
  }
};
