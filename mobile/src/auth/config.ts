import { Amplify } from 'aws-amplify';

// Configure Amplify for React Native
// Uses the same Cognito pool as the dashboard
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || '',
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
      },
    },
  },
});
