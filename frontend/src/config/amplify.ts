/**
 * AWS Amplify Configuration
 *
 * Configure Cognito for phone+OTP authentication.
 * Values are loaded from environment variables set during build.
 */

import { Amplify } from 'aws-amplify';

// Cognito configuration from environment or defaults
const cognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
};

export function configureAmplify() {
  if (!cognitoConfig.userPoolId || !cognitoConfig.userPoolClientId) {
    console.warn('Cognito not configured - using demo mode');
    return false;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: cognitoConfig.userPoolId,
        userPoolClientId: cognitoConfig.userPoolClientId,
        signUpVerificationMethod: 'code',
        loginWith: {
          phone: true,
        },
      },
    },
  });

  console.log('Amplify configured with Cognito:', cognitoConfig.userPoolId);
  return true;
}

export { cognitoConfig };
