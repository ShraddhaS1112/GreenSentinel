/**
 * AWS Configuration for Green Sentinel
 *
 * Configure AWS Amplify with Cognito for phone+OTP authentication
 */

import { Amplify } from 'aws-amplify';
import { useAuthStore } from '@/stores/authStore';

// Environment variables (set in .env file)
const cognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
};

const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: cognitoConfig.userPoolId,
      userPoolClientId: cognitoConfig.userPoolClientId,
      loginWith: {
        phone: true,
      },
    },
  },
};

export function configureAWS() {
  const hasConfig = cognitoConfig.userPoolId && cognitoConfig.userPoolClientId;

  if (hasConfig) {
    try {
      Amplify.configure(awsConfig);
      useAuthStore.getState().setCognitoConfigured(true);
      console.log('AWS Cognito configured:', cognitoConfig.userPoolId);

      // Check if user is already signed in
      useAuthStore.getState().checkAuthState();
    } catch (err) {
      console.error('Failed to configure Amplify:', err);
      useAuthStore.getState().setCognitoConfigured(false);
    }
  } else {
    console.warn('Cognito not configured - running in demo mode');
    useAuthStore.getState().setCognitoConfigured(false);
  }
}

export default awsConfig;
