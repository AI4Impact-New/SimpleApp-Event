import { Amplify } from 'aws-amplify';

// Fallbacks so OAuth is always configured (Next.js client may not have .env in some runs)
const appUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? 'payintelli-442042527593';
const cognitoRegion = process.env.NEXT_PUBLIC_COGNITO_REGION ?? 'ap-south-1';
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? 'ap-south-1_6SDlpRoIV';
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID ?? '73rg2jp451loqmf9ug0jqsb7o6';

const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      loginWith: {
        email: true,
        oauth: {
          domain: `${cognitoDomain}.auth.${cognitoRegion}.amazoncognito.com`,
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [`${appUrl}/callback`],
          redirectSignOut: [`${appUrl}/logout`],
          responseType: 'code' as const,
        },
      },
      signUpVerificationMethod: 'code' as const,
    },
  },
};

Amplify.configure(awsConfig);
