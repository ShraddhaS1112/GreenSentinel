/**
 * AWS Configuration for Green Sentinel
 *
 * Configure AWS Amplify with Cognito for authentication
 */

import { Amplify } from 'aws-amplify';

// Environment variables (set in .env file)
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'ap-south-1_jqEgqYrkW',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '5n1a7uvq0i8epu1g3rhgj1uek4',
      loginWith: {
        phone: true,
        email: true,
      },
    },
  },
};

export function configureAWS() {
  Amplify.configure(awsConfig);
}

export default awsConfig;
