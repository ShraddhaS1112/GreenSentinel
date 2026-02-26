/**
 * OfflineIndicator Component
 * Displays a banner when the app is in offline mode
 */

import React from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

export const OfflineIndicator = (): React.JSX.Element | null => {
  const isOffline = useOfflineStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center z-50">
      <p className="text-sm font-semibold">
        📡 You are offline - displaying cached data
      </p>
    </div>
  );
};
