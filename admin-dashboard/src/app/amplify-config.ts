import { Amplify } from 'aws-amplify';

const appUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? 'pilearn-767491588787';
const cognitoRegion = process.env.NEXT_PUBLIC_COGNITO_REGION ?? 'ap-south-1';
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? 'ap-south-1_kc1sfOoEG';
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID ?? '40faprqjpcc6q0pfkdkcrd8p5v';

/** Embedded sign-in/out stay local. Existing OAuth callbacks alone enable legacy configuration. */
export function configureAuth(legacyOAuth = false) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
          ...(legacyOAuth ? { oauth: {
            domain: `${cognitoDomain}.auth.${cognitoRegion}.amazoncognito.com`,
            scopes: ['email', 'openid', 'profile'],
            redirectSignIn: [`${appUrl}/callback`],
            redirectSignOut: [`${appUrl}/logout`],
            responseType: 'code' as const,
          } } : {}),
        },
        signUpVerificationMethod: 'code' as const,
      },
    },
  });
}

configureAuth();
