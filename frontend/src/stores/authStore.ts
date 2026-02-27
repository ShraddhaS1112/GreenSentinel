/**
 * Green Sentinel - Authentication Store
 *
 * Zustand store for managing authentication state with
 * AWS Cognito phone+OTP authentication.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  signIn,
  signUp,
  confirmSignIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';
import type { Language } from '@/stores/preferencesStore';

// =============================================================================
// TYPES
// =============================================================================

interface User {
  userId: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  language: Language;
  alertPreferences?: {
    voiceEnabled: boolean;
    textEnabled: boolean;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  cognitoConfigured: boolean;
  signInStep: 'PHONE' | 'OTP' | 'DONE';
  pendingPhoneNumber: string | null;

  // Actions
  setCognitoConfigured: (configured: boolean) => void;
  sendOtp: (phoneNumber: string) => Promise<boolean>;
  verifyOtp: (otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthState: () => Promise<void>;
  updateLanguage: (language: Language) => void;
  clearError: () => void;

  // Legacy mock login (fallback when Cognito not configured)
  mockLogin: (phoneNumber: string, otp: string) => Promise<void>;
}

// =============================================================================
// STORE
// =============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      cognitoConfigured: false,
      signInStep: 'PHONE',
      pendingPhoneNumber: null,

      // Set Cognito configured status
      setCognitoConfigured: (configured) => {
        set({ cognitoConfigured: configured });
      },

      // Send OTP - initiates sign-in with phone number
      sendOtp: async (phoneNumber) => {
        const { cognitoConfigured } = get();
        set({ isLoading: true, error: null, pendingPhoneNumber: phoneNumber });

        // Format phone number to E.164 (+91XXXXXXXXXX)
        const cleaned = phoneNumber.replace(/\D/g, '');
        const formattedPhone = cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`;

        if (!cognitoConfigured) {
          // Demo mode - just move to OTP step
          await new Promise((r) => setTimeout(r, 500));
          set({ isLoading: false, signInStep: 'OTP' });
          return true;
        }

        try {
          // Strategy: Try sign-up first (will fail if user exists), then sign-in
          // This works better with preventUserExistenceErrors enabled

          try {
            // Generate a random password (won't be used - OTP only)
            const tempPassword = `Temp${Date.now()}!${Math.random().toString(36).slice(2)}`;

            await signUp({
              username: formattedPhone,
              password: tempPassword,
              options: {
                userAttributes: {
                  phone_number: formattedPhone,
                },
              },
            });
            console.log('New user signed up:', formattedPhone);
          } catch (signUpErr: unknown) {
            const signUpError = signUpErr as { name?: string; message?: string };
            console.log('Sign up result:', signUpError.name);

            // User already exists - that's fine, proceed to sign in
            if (signUpError.name === 'UsernameExistsException') {
              console.log('User already exists, proceeding to sign in');
            } else {
              // Other sign-up error
              console.error('Sign up failed:', signUpError);
            }
          }

          // Now sign in (user either just created or already existed)
          const result = await signIn({
            username: formattedPhone,
            options: {
              authFlowType: 'CUSTOM_WITHOUT_SRP',
            },
          });

          console.log('Sign in result:', result);

          if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
            set({ isLoading: false, signInStep: 'OTP' });
            return true;
          }

          // If already signed in
          if (result.isSignedIn) {
            await get().checkAuthState();
            set({ isLoading: false, signInStep: 'DONE' });
            return true;
          }

          set({ isLoading: false, signInStep: 'OTP' });
          return true;
        } catch (err: unknown) {
          const error = err as { name?: string; message?: string };
          console.error('Auth error:', error);

          set({
            isLoading: false,
            error: error.message || 'Failed to send OTP',
          });
          return false;
        }
      },

      // Verify OTP
      verifyOtp: async (otp) => {
        const { cognitoConfigured, pendingPhoneNumber } = get();
        set({ isLoading: true, error: null });

        if (!cognitoConfigured) {
          // Demo mode - accept any 6-digit OTP
          await new Promise((r) => setTimeout(r, 500));
          set({
            user: {
              userId: `demo_${Date.now()}`,
              phoneNumber: pendingPhoneNumber || '',
              name: 'Demo Farmer',
              language: 'en',
            },
            isAuthenticated: true,
            isLoading: false,
            signInStep: 'DONE',
          });
          return true;
        }

        try {
          const result = await confirmSignIn({
            challengeResponse: otp,
          });

          console.log('Confirm sign in result:', result);

          if (result.isSignedIn) {
            await get().checkAuthState();
            set({ isLoading: false, signInStep: 'DONE' });
            return true;
          }

          // If still not signed in, might need another challenge
          if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
            set({
              isLoading: false,
              error: 'Invalid OTP. Please try again.',
            });
            return false;
          }

          set({ isLoading: false });
          return false;
        } catch (err: unknown) {
          const error = err as { message?: string };
          console.error('Verify OTP error:', error);
          set({
            isLoading: false,
            error: error.message || 'Invalid OTP',
          });
          return false;
        }
      },

      // Logout
      logout: async () => {
        const { cognitoConfigured } = get();

        try {
          if (cognitoConfigured) {
            await signOut();
          }
        } catch (err) {
          console.error('Logout error:', err);
        }

        set({
          user: null,
          isAuthenticated: false,
          signInStep: 'PHONE',
          pendingPhoneNumber: null,
          error: null,
        });
      },

      // Check current auth state
      checkAuthState: async () => {
        const { cognitoConfigured } = get();

        if (!cognitoConfigured) {
          return;
        }

        try {
          const currentUser = await getCurrentUser();
          const session = await fetchAuthSession();

          if (currentUser && session.tokens) {
            const phoneNumber = currentUser.signInDetails?.loginId || currentUser.username;

            set({
              user: {
                userId: currentUser.userId,
                phoneNumber: phoneNumber,
                language: 'en',
              },
              isAuthenticated: true,
              signInStep: 'DONE',
            });
          }
        } catch {
          // Not signed in
          set({
            user: null,
            isAuthenticated: false,
            signInStep: 'PHONE',
          });
        }
      },

      // Update language preference
      updateLanguage: (language) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, language },
          });
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Legacy mock login (for demo/testing)
      mockLogin: async (phoneNumber, _otp) => {
        set({ isLoading: true, error: null });

        await new Promise((r) => setTimeout(r, 1000));

        set({
          user: {
            userId: `demo_${Date.now()}`,
            phoneNumber,
            name: 'Demo Farmer',
            language: 'en',
          },
          isAuthenticated: true,
          isLoading: false,
          signInStep: 'DONE',
        });
      },
    }),
    {
      name: 'green-sentinel-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
