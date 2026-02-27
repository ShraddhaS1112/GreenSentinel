/**
 * Green Sentinel - Authentication Store
 *
 * Zustand store for managing authentication state with
 * offline support and token refresh.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Language } from '@green-sentinel/shared';

// =============================================================================
// TYPES
// =============================================================================

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  login: (phoneNumber: string, otp: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  updateLanguage: (language: Language) => void;
  clearError: () => void;
}

// =============================================================================
// MOCK AUTH (Replace with actual API calls)
// =============================================================================

const mockLogin = async (phoneNumber: string, _otp: string): Promise<{
  user: User;
  accessToken: string;
  refreshToken: string;
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Demo user
  const user: User = {
    userId: 'user_demo_001',
    phoneNumber,
    name: 'Demo Farmer',
    email: 'demo@greensentinel.com',
    language: 'en' as Language,
    farms: ['farm_001', 'farm_002'],
    alertPreferences: {
      voiceEnabled: true,
      textEnabled: true,
      minimumConfidence: 75,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    user,
    accessToken: `demo_access_token_${Date.now()}`,
    refreshToken: `demo_refresh_token_${Date.now()}`,
  };
};

// =============================================================================
// STORE
// =============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Set user
      setUser: (user) => {
        set({ user, isAuthenticated: true });
      },

      // Set tokens
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },

      // Login action
      login: async (phoneNumber, otp) => {
        set({ isLoading: true, error: null });

        try {
          const { user, accessToken, refreshToken } = await mockLogin(phoneNumber, otp);

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: (error as Error).message || 'Login failed',
          });
          throw error;
        }
      },

      // Logout action
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Refresh auth token
      refreshAuth: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          // In production, call the refresh token API
          // For now, just validate the token exists
          set({ isLoading: false });
        } catch (error) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      // Update language preference
      updateLanguage: (language) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, language, updatedAt: new Date().toISOString() },
          });
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'green-sentinel-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
