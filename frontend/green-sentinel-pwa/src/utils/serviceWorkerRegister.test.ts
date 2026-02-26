/**
 * Service Worker Registration Tests
 */

import {
  registerServiceWorker,
  unregisterServiceWorker,
  isOffline,
  onOnlineStatusChange
} from './serviceWorkerRegister';

describe('Service Worker Registration', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('registerServiceWorker', () => {
    it('should not register if service workers are not supported', () => {
      const originalNavigator = navigator;
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      registerServiceWorker();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Service Workers are not supported in this browser'
      );

      consoleSpy.mockRestore();
    });

    it('should call onSuccess callback when registration succeeds', async () => {
      const mockRegistration = {} as ServiceWorkerRegistration;
      const onSuccess = jest.fn();

      // Mock navigator.serviceWorker.register
      const registerMock = jest.fn().mockResolvedValue(mockRegistration);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: registerMock },
        configurable: true
      });

      registerServiceWorker({ onSuccess });

      // Wait for async registration
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onSuccess).toHaveBeenCalledWith(mockRegistration);
    });

    it('should call onError callback when registration fails', async () => {
      const error = new Error('Registration failed');
      const onError = jest.fn();

      // Mock navigator.serviceWorker.register to reject
      const registerMock = jest.fn().mockRejectedValue(error);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: registerMock },
        configurable: true
      });

      registerServiceWorker({ onError });

      // Wait for async registration
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('unregisterServiceWorker', () => {
    it('should return false if service workers are not supported', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true
      });

      const result = await unregisterServiceWorker();
      expect(result).toBe(false);
    });

    it('should unregister all service workers', async () => {
      const mockRegistration = {
        unregister: jest.fn().mockResolvedValue(true)
      };

      const getRegistrationsMock = jest
        .fn()
        .mockResolvedValue([mockRegistration]);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { getRegistrations: getRegistrationsMock },
        configurable: true
      });

      const result = await unregisterServiceWorker();

      expect(result).toBe(true);
      expect(mockRegistration.unregister).toHaveBeenCalled();
    });
  });

  describe('isOffline', () => {
    it('should return true when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true
      });

      expect(isOffline()).toBe(true);
    });

    it('should return false when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true
      });

      expect(isOffline()).toBe(false);
    });
  });

  describe('onOnlineStatusChange', () => {
    it('should call callback when online event fires', () => {
      const callback = jest.fn();
      onOnlineStatusChange(callback);

      const event = new Event('online');
      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should call callback when offline event fires', () => {
      const callback = jest.fn();
      onOnlineStatusChange(callback);

      const event = new Event('offline');
      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should return cleanup function that removes listeners', () => {
      const callback = jest.fn();
      const cleanup = onOnlineStatusChange(callback);

      cleanup();

      const event = new Event('online');
      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
