/**
 * Hook to detect if the current device is mobile
 *
 * Returns true for phones (< 768px width)
 * Returns false for tablets and desktops
 */

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768; // px - matches Tailwind's 'md' breakpoint

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on mount
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
