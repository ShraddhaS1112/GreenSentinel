import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOnlineStatus, useNetworkInfo, useIsSlowNetwork } from '@/hooks/useOnlineStatus';

describe('useOnlineStatus Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial online status', () => {
    const { result } = renderHook(() => useOnlineStatus());
    // Initial state should match navigator.onLine
    expect(typeof result.current).toBe('boolean');
  });

  it('should be a boolean', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });
});

describe('useNetworkInfo Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return network info object', () => {
    const { result } = renderHook(() => useNetworkInfo());
    expect(result.current).toHaveProperty('isOnline');
  });

  it('should have isOnline property', () => {
    const { result } = renderHook(() => useNetworkInfo());
    expect(result.current.isOnline).toBeDefined();
  });
});

describe('useIsSlowNetwork Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return boolean', () => {
    const { result } = renderHook(() => useIsSlowNetwork());
    expect(typeof result.current).toBe('boolean');
  });

  it('should return false when effectiveType is undefined', () => {
    const { result } = renderHook(() => useIsSlowNetwork());
    expect(result.current).toBe(false);
  });
});
