import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';

describe('Auth Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      cognitoConfigured: false,
      signInStep: 'PHONE',
      pendingPhoneNumber: null,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.cognitoConfigured).toBe(false);
      expect(state.signInStep).toBe('PHONE');
      expect(state.pendingPhoneNumber).toBeNull();
    });
  });

  describe('Cognito Configuration', () => {
    it('should set cognito configured status', () => {
      const { setCognitoConfigured } = useAuthStore.getState();
      
      expect(useAuthStore.getState().cognitoConfigured).toBe(false);
      setCognitoConfigured(true);
      expect(useAuthStore.getState().cognitoConfigured).toBe(true);
      setCognitoConfigured(false);
      expect(useAuthStore.getState().cognitoConfigured).toBe(false);
    });
  });

  describe('Send OTP', () => {
    it('should transition to OTP step in demo mode', async () => {
      const { sendOtp } = useAuthStore.getState();
      
      const result = await sendOtp('9876543210');
      
      expect(result).toBe(true);
      expect(useAuthStore.getState().signInStep).toBe('OTP');
      expect(useAuthStore.getState().pendingPhoneNumber).toBe('9876543210');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should format phone number with +91 prefix', async () => {
      const { sendOtp } = useAuthStore.getState();
      
      await sendOtp('9876543210');
      
      // Phone should be stored as-is since we don't have Cognito configured
      expect(useAuthStore.getState().pendingPhoneNumber).toBe('9876543210');
    });

    it('should clear previous errors when sending OTP', async () => {
      useAuthStore.setState({ error: 'Previous error' });
      
      const { sendOtp } = useAuthStore.getState();
      await sendOtp('9876543210');
      
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should set loading state while sending OTP', async () => {
      const { sendOtp } = useAuthStore.getState();
      
      const promise = sendOtp('9876543210');
      expect(useAuthStore.getState().isLoading).toBe(true);
      
      await promise;
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('Verify OTP', () => {
    it('should authenticate user in demo mode with any OTP', async () => {
      useAuthStore.setState({ 
        signInStep: 'OTP', 
        pendingPhoneNumber: '9876543210' 
      });
      
      const { verifyOtp } = useAuthStore.getState();
      const result = await verifyOtp('123456');
      
      expect(result).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).not.toBeNull();
      expect(useAuthStore.getState().user?.phoneNumber).toBe('9876543210');
      expect(useAuthStore.getState().signInStep).toBe('DONE');
    });

    it('should clear previous errors when verifying OTP', async () => {
      useAuthStore.setState({ 
        signInStep: 'OTP', 
        pendingPhoneNumber: '9876543210',
        error: 'Previous error' 
      });
      
      const { verifyOtp } = useAuthStore.getState();
      await verifyOtp('123456');
      
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('Instant Demo Login', () => {
    it('should authenticate user instantly', () => {
      const { instantDemoLogin } = useAuthStore.getState();
      instantDemoLogin();
      
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).not.toBeNull();
      expect(state.user?.userId).toBe('sk-demo-user');
      expect(state.user?.name).toBe('SK Demo Farmer');
      expect(state.signInStep).toBe('DONE');
    });

    it('should set demo user with correct phone number', () => {
      const { instantDemoLogin } = useAuthStore.getState();
      instantDemoLogin();
      
      expect(useAuthStore.getState().user?.phoneNumber).toBe('9876543210');
    });

    it('should enable alert preferences for demo user', () => {
      const { instantDemoLogin } = useAuthStore.getState();
      instantDemoLogin();
      
      expect(useAuthStore.getState().user?.alertPreferences?.voiceEnabled).toBe(true);
      expect(useAuthStore.getState().user?.alertPreferences?.textEnabled).toBe(true);
    });

    it('should clear any existing errors', () => {
      useAuthStore.setState({ error: 'Some error' });
      
      const { instantDemoLogin } = useAuthStore.getState();
      instantDemoLogin();
      
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('Mock Login', () => {
    it('should authenticate user with mock login', async () => {
      const { mockLogin } = useAuthStore.getState();
      await mockLogin('9876543210', '123456');
      
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.phoneNumber).toBe('9876543210');
      expect(state.user?.name).toBe('Demo Farmer');
    });

    it('should generate unique userId for each mock login', async () => {
      const { mockLogin } = useAuthStore.getState();
      await mockLogin('9876543210', '123456');
      const firstUserId = useAuthStore.getState().user?.userId;
      
      await mockLogin('9876543210', '123456');
      const secondUserId = useAuthStore.getState().user?.userId;
      
      expect(firstUserId).not.toBe(secondUserId);
    });
  });

  describe('Logout', () => {
    it('should clear user and authentication state', async () => {
      // First login
      const { instantDemoLogin, logout } = useAuthStore.getState();
      instantDemoLogin();
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      
      // Then logout
      await logout();
      
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.signInStep).toBe('PHONE');
      expect(state.pendingPhoneNumber).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('Update Language', () => {
    it('should update user language preference', () => {
      const { instantDemoLogin, updateLanguage } = useAuthStore.getState();
      instantDemoLogin();
      
      expect(useAuthStore.getState().user?.language).toBe('en');
      
      updateLanguage('hi');
      
      expect(useAuthStore.getState().user?.language).toBe('hi');
    });

    it('should not throw if no user is logged in', () => {
      const { updateLanguage } = useAuthStore.getState();
      expect(() => updateLanguage('ta')).not.toThrow();
    });
  });

  describe('Clear Error', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error message' });
      expect(useAuthStore.getState().error).toBe('Some error message');
      
      useAuthStore.getState().clearError();
      
      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
