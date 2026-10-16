import { Amplify } from 'aws-amplify';

const region = process.env.EXPO_PUBLIC_COGNITO_REGION ?? 'ap-south-1';
const userPoolId = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? 'ap-south-1_kc1sfOoEG';
const userPoolClientId = process.env.EXPO_PUBLIC_COGNITO_APP_CLIENT_ID ?? '40faprqjpcc6q0pfkdkcrd8p5v';

const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      region,
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code' as const,
    },
  },
};

try {
  Amplify.configure(awsConfig);
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[Amplify] configured for region:', region, 'userPoolId:', userPoolId ? `${userPoolId.slice(0, 12)}...` : 'missing', 'clientId:', userPoolClientId ? `${userPoolClientId.slice(0, 8)}...` : 'missing');
  }
} catch (e) {
  console.warn('Amplify configure:', e);
}
