// Browser URLs for the student portal (web only; native keeps its own deep-link handling in AppNavigator).
// Every page gets a real address so back/forward, refresh, bookmarks and "open in new tab" behave like a website.
import {
  getActionFromState,
  getPathFromState as defaultGetPathFromState,
  getStateFromPath as defaultGetStateFromPath,
  type LinkingOptions,
} from '@react-navigation/native';

// Only identifiers may appear in a URL. Route params also carry emails, passwords (sign-up flow),
// notices and whole objects (exam); those stay in memory and never reach the address bar or history.
const URL_PARAMS = new Set(['courseId', 'orderId', 'eventId', 'pollId', 'classId', 'examId', 'notificationId', 'id']);

// Signed-out pages; a link to one of these is never "returned to" after sign-in.
const AUTH_PATHS = ['/welcome', '/login', '/signup', '/verify-email', '/forgot-password', '/complete-profile', '/verify'];

const config: LinkingOptions<object>['config'] = {
  screens: {
    // Signed out
    AuthHome: 'welcome',
    Login: 'login',
    SignUp: 'signup',
    ConfirmSignUp: 'verify-email',
    ForgotPassword: 'forgot-password',
    CompleteProfile: 'complete-profile',
    VerifyCertificate: 'verify',

    // Signed in
    Home: {
      path: '',
      initialRouteName: 'HomeMain',
      screens: {
        HomeMain: '',
        Events: 'events',
        Event: 'events/:eventId',
        Poll: 'polls/:pollId',
        QRScanner: 'scan',
        LeaderboardHome: 'leaderboards',
        LeaderboardDetail: 'leaderboards/:eventId',
      },
    },
    Courses: {
      path: 'courses',
      initialRouteName: 'CoursesMain',
      screens: {
        CoursesMain: '',
        CourseDetail: ':courseId',
        // Matches the existing quote link format /checkout/<orderId>.
        Checkout: { path: 'checkout/:orderId', exact: true },
      },
    },
    Learning: {
      path: 'learning',
      initialRouteName: 'MyLearningMain',
      screens: {
        MyLearningMain: '',
        CourseLearning: 'courses/:courseId',
        LecturePlayer: 'courses/:courseId/lectures/:classId',
        Exam: 'courses/:courseId/exams/:examId',
        Certificates: 'certificates',
        VerifyCertificate: 'certificates/verify',
        Purchases: 'purchases',
        Checkout: 'purchases/:orderId',
      },
    },
    Inbox: {
      path: 'inbox',
      initialRouteName: 'InboxMain',
      screens: {
        InboxMain: '',
        NotificationDetail: ':notificationId',
      },
    },
    Profile: {
      path: 'profile',
      initialRouteName: 'ProfileMain',
      screens: {
        ProfileMain: '',
        EditProfile: 'edit',
        PrivacyPolicy: 'privacy',
        Certificates: 'certificates',
        VerifyCertificate: 'certificates/verify',
        Purchases: 'purchases',
        Checkout: 'purchases/:orderId',
      },
    },
  },
};

/** Drop every param that is not an identifier, at every nesting level. */
function urlSafeState<T>(state: T): T {
  const s = state as any;
  if (!s?.routes) return state;
  return {
    ...s,
    routes: s.routes.map((route: any) => {
      const params = route.params
        ? Object.fromEntries(
            Object.entries(route.params).filter(([key, value]) => URL_PARAMS.has(key) && typeof value === 'string')
          )
        : undefined;
      return { ...route, params, state: route.state ? urlSafeState(route.state) : undefined };
    }),
  };
}

/** Legacy link shapes: /checkout?order=<id> (quote emails) and /course/<id>. */
function normalizePath(path: string): string {
  const [pathname, query = ''] = path.split('?');
  const order = new URLSearchParams(query).get('order');
  if (pathname.replace(/\/$/, '') === '/checkout' && order) return `/checkout/${encodeURIComponent(order)}`;
  return path.replace(/^\/course\//, '/courses/');
}

export const webLinking: LinkingOptions<object> = {
  prefixes: [],
  config,
  getStateFromPath: (path, options) => defaultGetStateFromPath(normalizePath(path), options),
  getPathFromState: (state, options) => defaultGetPathFromState(urlSafeState(state), options),
};

/**
 * The page a signed-out visitor originally asked for, so sign-in can take them there.
 * Read once at startup; a signed-out visit rewrites the address bar to /welcome straight after.
 */
let returnPath: string | null =
  typeof window !== 'undefined' && window.location ? window.location.pathname + window.location.search : null;

/** Navigation action for the remembered page, or null for the home page and sign-in pages. Consumed once. */
export function takeReturnAction() {
  const path = returnPath;
  returnPath = null;
  if (!path || path === '/' || AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}?`))) return null;
  const state = webLinking.getStateFromPath!(path, config as any);
  return state ? getActionFromState(state, config as any) ?? null : null;
}
