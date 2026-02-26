/**
 * useOfflineStatus Hook
 * Provides offline/online status to React components
 */

import { useEffect, useState } from 'react';
import { onOnlineStatusChange, isOffline } from '../utils/serviceWorkerRegister';

export const useOfflineStatus = (): boolean => {
  const [offline, setOffline] = useState<boolean>(isOffline());

  useEffect(() => {
    // Set up listener for online/offline changes
    const cleanup = onOnlineStatusChange((isOnline) => {
      setOffline(!isOnline);
    });

    return cleanup;
  }, []);

  return offline;
};
