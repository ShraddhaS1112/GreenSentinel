/**
 * Service Worker Registration Utility
 * Handles registration and lifecycle management of the service worker
 */

interface ServiceWorkerRegistrationOptions {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Register the service worker for offline support
 * @param options - Configuration options for registration
 */
export const registerServiceWorker = (
  options: ServiceWorkerRegistrationOptions = {}
): void => {
  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported in this browser');
    return;
  }

  // Register the service worker
  navigator.serviceWorker
    .register('/service-worker.js', { scope: '/' })
    .then((registration) => {
      console.log('Service Worker registered successfully:', registration);

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New service worker is ready, notify user
            console.log('New service worker available');
            // You can emit an event or call a callback here
            window.dispatchEvent(
              new CustomEvent('sw-update-available', {
                detail: { registration }
              })
            );
          }
        });
      });

      if (options.onSuccess) {
        options.onSuccess(registration);
      }
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
      if (options.onError) {
        options.onError(error);
      }
    });
};

/**
 * Unregister the service worker
 */
export const unregisterServiceWorker = (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    return Promise.resolve(false);
  }

  return navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      return Promise.all(
        registrations.map((registration) => registration.unregister())
      ).then(() => true);
    })
    .catch((error) => {
      console.error('Failed to unregister service worker:', error);
      return false;
    });
};

/**
 * Check if the app is running in offline mode
 */
export const isOffline = (): boolean => {
  return !navigator.onLine;
};

/**
 * Listen for online/offline status changes
 */
export const onOnlineStatusChange = (
  callback: (isOnline: boolean) => void
): (() => void) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
