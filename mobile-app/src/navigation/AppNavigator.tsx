// App Navigator
// Tabs: Home · Courses · My Learning · Inbox · Profile. Events, QR and leaderboards live under Home.
import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer, createNavigationContainerRef, NavigationState, PartialState } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LoginScreen } from '@/screens/LoginScreen';
import { AuthHomeScreen } from '@/screens/AuthHomeScreen';
import { SignUpScreen } from '@/screens/SignUpScreen';
import { ConfirmSignUpScreen } from '@/screens/ConfirmSignUpScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { CompleteProfileScreen } from '@/screens/CompleteProfileScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { EventsScreen } from '@/screens/EventsScreen';
import { EventScreen } from '@/screens/EventScreen';
import { PollScreen } from '@/screens/PollScreen';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';
import { LeaderboardHomeScreen } from '@/screens/LeaderboardHomeScreen';
import { QRScannerScreen } from '@/screens/QRScannerScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { EditProfileScreen } from '@/screens/EditProfileScreen';
import { CoursesScreen } from '@/screens/CoursesScreen';
import { CourseDetailScreen } from '@/screens/CourseDetailScreen';
import { PrivacyPolicyScreen } from '@/screens/PrivacyPolicyScreen';
import { MyLearningScreen } from '@/screens/MyLearningScreen';
import { CourseLearningScreen } from '@/screens/CourseLearningScreen';
import { LecturePlayerScreen } from '@/screens/LecturePlayerScreen';
import { ExamScreen } from '@/screens/ExamScreen';
import { CertificatesScreen } from '@/screens/CertificatesScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { NotificationDetailScreen } from '@/screens/NotificationDetailScreen';
import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { PurchasesScreen } from '@/screens/PurchasesScreen';
import { VerifyCertificateScreen } from '@/screens/VerifyCertificateScreen';
import { useNotifications } from '@/hooks/useLearning';
import {
  courseIdFromResponse,
  notificationIdFromResponse,
  registerForPush,
  shouldExplainPushPermission,
  unregisterPush,
  watchPushToken,
} from '@/services/push';
import { clearPrivateStores } from '@/utils/userStorage';
import { colors, spacing } from '@/theme/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
type SignUpFlowParams = { email?: string; password?: string; name?: string };
type LoginParams = { email?: string; notice?: string };
const navigationRef = createNavigationContainerRef<any>();

/** Open a course workspace from any tab, keeping My Learning underneath it. */
function openCourseLearning(navigation: any, courseId: string) {
  navigation.navigate('Learning', { screen: 'CourseLearning', params: { courseId }, initial: false });
}

// ---- Notification taps ------------------------------------------------------------------------

// Tap that arrived before the navigator was ready (cold start); flushed from NavigationContainer onReady.
let pendingNotificationTarget: { courseId: string | null } | null = null;

/** Open the course a tapped notification refers to (or the inbox). The payload is a hint, not authorization. */
function openFromNotification(courseId: string | null) {
  if (!navigationRef.isReady()) {
    pendingNotificationTarget = { courseId };
    return;
  }
  if (courseId) openCourseLearning(navigationRef, courseId);
  else navigationRef.navigate('Inbox', { screen: 'InboxMain' });
}

function flushPendingNotification() {
  const target = pendingNotificationTarget;
  pendingNotificationTarget = null;
  if (target) openFromNotification(target.courseId);
}

// ---- Browser tab titles (web) -----------------------------------------------------------------

// Route names are internal identifiers; show learners a readable page name instead.
const SCREEN_TITLES: Record<string, string> = {
  AuthHome: 'Welcome',
  Login: 'Sign in',
  SignUp: 'Create account',
  ConfirmSignUp: 'Verify email',
  ForgotPassword: 'Reset password',
  CompleteProfile: 'Complete your profile',
  HomeMain: 'Home',
  Events: 'Events',
  Event: 'Event',
  Poll: 'Poll',
  QRScanner: 'Scan QR code',
  LeaderboardHome: 'Leaderboards',
  LeaderboardDetail: 'Leaderboard',
  CoursesMain: 'Courses',
  CourseDetail: 'Course details',
  Checkout: 'Checkout',
  MyLearningMain: 'My Learning',
  CourseLearning: 'Course',
  LecturePlayer: 'Lecture',
  Exam: 'Assessment',
  Certificates: 'My certificates',
  VerifyCertificate: 'Verify certificate',
  Purchases: 'Purchases',
  InboxMain: 'Inbox',
  NotificationDetail: 'Message',
  ProfileMain: 'Profile',
  EditProfile: 'Edit profile',
  PrivacyPolicy: 'Privacy policy',
};

const documentTitle = {
  formatter: (_options: unknown, route: { name: string; params?: any } | undefined) => {
    // Lecture and exam titles travel in the route params; prefer them when present.
    const specific = route?.name === 'LecturePlayer' ? route.params?.title : route?.name === 'Exam' ? route.params?.exam?.title : null;
    const page = specific || (route ? SCREEN_TITLES[route.name] : undefined);
    return page ? `${page} · AI4Impact` : 'AI4Impact';
  },
};

// ---- Deep links -------------------------------------------------------------------------------
// ai4impact://checkout/<orderId>, ai4impact://course/<courseId>, and the web quote link
// https://admin.ai4impact.in/checkout?order=<orderId>. IDs are hints; the screens fetch with the user's session.

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
type LinkTarget = { kind: 'checkout' | 'course'; id: string };
let pendingLinkTarget: LinkTarget | null = null;
let initialUrlHandled = false;

function parseDeepLink(url: string | null): LinkTarget | null {
  if (!url) return null;
  const checkout = url.match(new RegExp(`checkout(?:/|\\?order=)(${UUID})`, 'i'));
  if (checkout) return { kind: 'checkout', id: checkout[1] };
  const course = url.match(new RegExp(`courses?/(${UUID})`, 'i'));
  if (course) return { kind: 'course', id: course[1] };
  return null;
}

/** Navigate now if the signed-in tabs are mounted, otherwise keep it until after sign-in. */
function openDeepLink(target: LinkTarget | null) {
  if (!target) return;
  if (!navigationRef.isReady() || !navigationRef.getRootState()?.routeNames?.includes('Courses')) {
    pendingLinkTarget = target;
    return;
  }
  if (target.kind === 'checkout') {
    navigationRef.navigate('Courses', { screen: 'Checkout', params: { orderId: target.id }, initial: false });
  } else {
    navigationRef.navigate('Courses', { screen: 'CourseDetail', params: { courseId: target.id }, initial: false });
  }
}

function flushPendingLink() {
  const target = pendingLinkTarget;
  pendingLinkTarget = null;
  openDeepLink(target);
}

// ---- Resume after re-authentication -----------------------------------------------------------

// Screens worth reopening after the session expires mid-task. Anything else lands on Home.
const RESUMABLE_SCREENS = new Set([
  'CourseDetail',
  'CourseLearning',
  'LecturePlayer',
  'Exam',
  'Checkout',
  'Event',
  'NotificationDetail',
]);

type ResumeTarget = { userId: string; name: string; params: object | undefined };
let resumeTarget: ResumeTarget | null = null;

/** Turn the focused route path into nested navigate() arguments: ['Learning', { screen: 'Exam', params }]. */
function focusedRoute(
  state: NavigationState | PartialState<NavigationState> | undefined
): { name: string; params: object | undefined; leaf: string } | null {
  if (!state?.routes?.length) return null;
  const route = state.routes[state.index ?? state.routes.length - 1];
  const child = focusedRoute(route.state as any);
  if (!child) return { name: route.name, params: route.params as object | undefined, leaf: route.name };
  return { name: route.name, params: { screen: child.name, params: child.params, initial: false }, leaf: child.leaf };
}

async function captureResumeTarget() {
  if (!navigationRef.isReady()) return;
  const target = focusedRoute(navigationRef.getRootState());
  if (!target || !RESUMABLE_SCREENS.has(target.leaf)) return;
  const { authService } = await import('@/services/auth');
  const current = await authService.getCurrentUser();
  if (current.user?.id) resumeTarget = { userId: current.user.id, name: target.name, params: target.params };
}

/** Reopen the captured page, but only for the same account that was signed out. */
async function restoreResumeTarget() {
  const target = resumeTarget;
  resumeTarget = null;
  if (!target || !navigationRef.isReady()) return;
  const { authService } = await import('@/services/auth');
  const current = await authService.getCurrentUser();
  if (current.user?.id === target.userId) navigationRef.navigate(target.name, target.params);
}

// ---- Signed-in shell --------------------------------------------------------------------------

/** Registers this device for push once signed in and routes notification taps. Renders nothing. */
function PushBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Explain once before the OS prompt; afterwards only register silently (the Profile switch re-asks).
    shouldExplainPushPermission()
      .then((explain) => {
        if (!explain) return registerForPush({ prompt: false });
        Alert.alert(
          'Course notifications',
          'Get notified about new lessons, live classes and announcements from your courses. Your inbox works either way.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Allow', onPress: () => registerForPush({ prompt: true }).catch(() => {}) },
          ]
        );
      })
      .catch(() => {});
    const unwatch = watchPushToken();

    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      // Fetch the inbox first; the server is the source of truth for what the notification says.
      const notificationId = notificationIdFromResponse(response);
      const markRead = notificationId
        ? import('@/services/api').then(({ api }) => api.markNotificationRead(notificationId)).catch(() => {})
        : Promise.resolve();
      markRead.finally(() => queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] }));
      openFromNotification(courseIdFromResponse(response));
    };

    // Cold start: app opened by tapping a notification
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        handle(response);
        if (response) Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
      })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    // Foreground arrival: refresh the inbox badge
    const received = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
    });
    return () => {
      unwatch();
      sub.remove();
      received.remove();
    };
  }, [queryClient]);

  return null;
}

type ProfileGateState = { kind: 'loading' } | { kind: 'incomplete'; email: string; name?: string; profile?: import('@/services/api').MyProfile } | { kind: 'ready' } | { kind: 'error' };

/**
 * A valid Cognito session is not enough: load the backend profile (GET /users/me) and send users
 * with no profile type to Complete Profile before showing the app.
 */
function SignedIn({ onLogout }: { onLogout: () => void }) {
  const [gate, setGate] = useState<ProfileGateState>({ kind: 'loading' });

  const check = useCallback(async () => {
    setGate({ kind: 'loading' });
    try {
      const { api } = await import('@/services/api');
      const profile = await api.getMyProfile();
      if (!profile.user_type || profile.privacy_consent_required) setGate({ kind: 'incomplete', email: profile.email, name: profile.name, profile });
      else setGate({ kind: 'ready' });
    } catch (err: any) {
      // A 401 here signs the user out via the API interceptor; anything else is retryable.
      if (err?.response?.status !== 401) setGate({ kind: 'error' });
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  if (gate.kind === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (gate.kind === 'error') {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
        <Text style={styles.centerText}>Could not load your profile. Check your connection and try again.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={check} activeOpacity={0.75}>
          <Text style={styles.primaryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLogout} style={{ padding: spacing.sm }}>
          <Text style={styles.link}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (gate.kind === 'incomplete') {
    return (
      <CompleteProfileScreen
        email={gate.email}
        name={gate.name}
        initialProfile={gate.profile}
        onComplete={() => setGate({ kind: 'ready' })}
        onSignOut={onLogout}
      />
    );
  }
  return <MainTabs onLogout={onLogout} />;
}

function MainTabs({ onLogout }: { onLogout: () => void }) {
  const { data: notifications } = useNotifications();
  const unread = (notifications ?? []).filter((n) => !n.read_at).length;

  useEffect(() => {
    // Let the nested navigators mount before reopening an interrupted page.
    const id = setTimeout(() => {
      flushPendingNotification();
      restoreResumeTarget();
      flushPendingLink();
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      <PushBridge />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          // No fixed height: React Navigation adds the home-indicator / gesture-bar inset itself.
          tabBarStyle: {
            paddingTop: 4,
            backgroundColor: colors.backgroundCard,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Home"
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size ?? 24} color={color} />
            ),
          }}
        >
          {() => (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="HomeMain">
                {({ navigation }: any) => (
                  <HomeScreen
                    onContinueCourse={(courseId) => openCourseLearning(navigation, courseId)}
                    onOpenInbox={() => navigation.navigate('Inbox', { screen: 'InboxMain' })}
                    onOpenEvents={() => navigation.navigate('Events')}
                    onEventPress={(event) => navigation.navigate('Event', { eventId: event.id })}
                    onScanPress={() => navigation.navigate('QRScanner')}
                    onLeaderboardPress={() => navigation.navigate('LeaderboardHome')}
                    onExploreCourses={() => navigation.navigate('Courses', { screen: 'CoursesMain' })}
                    onCoursePress={(courseId) =>
                      navigation.navigate('Courses', { screen: 'CourseDetail', params: { courseId }, initial: false })
                    }
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Events">
                {({ navigation }: any) => (
                  <EventsScreen
                    onBack={() => navigation.goBack()}
                    onEventPress={(event) => navigation.navigate('Event', { eventId: event.id })}
                    onScanPress={() => navigation.navigate('QRScanner')}
                    onLeaderboardPress={() => navigation.navigate('LeaderboardHome')}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Event">
                {({ route, navigation }: any) => (
                  <EventScreen
                    eventId={route.params?.eventId}
                    onBack={() => navigation.goBack()}
                    onPollPress={(pollId) => navigation.navigate('Poll', { pollId })}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Poll">
                {({ route, navigation }: any) => (
                  <PollScreen pollId={route.params?.pollId} onBack={() => navigation.goBack()} />
                )}
              </Stack.Screen>
              <Stack.Screen name="QRScanner">
                {({ navigation }: any) => (
                  <QRScannerScreen
                    onScanSuccess={(eventId) => navigation.replace('Event', { eventId })}
                    onBack={() => navigation.goBack()}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="LeaderboardHome">
                {({ navigation }: any) => (
                  <LeaderboardHomeScreen
                    onBack={() => navigation.goBack()}
                    onOpenEvents={() => navigation.navigate('Events')}
                    onOpenLeaderboard={(eventId) => navigation.navigate('LeaderboardDetail', { eventId })}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="LeaderboardDetail">
                {({ route, navigation }: any) => (
                  <LeaderboardScreen eventId={route.params?.eventId} onBack={() => navigation.goBack()} />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Courses"
          options={{
            tabBarLabel: 'Courses',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'book' : 'book-outline'} size={size ?? 24} color={color} />
            ),
          }}
        >
          {() => (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="CoursesMain">
                {({ navigation }: any) => (
                  <CoursesScreen onCoursePress={(course) => navigation.navigate('CourseDetail', { courseId: course.id })} />
                )}
              </Stack.Screen>
              <Stack.Screen name="CourseDetail">
                {({ route, navigation }: any) => (
                  <CourseDetailScreen
                    courseId={route.params?.courseId ?? ''}
                    onBack={() => navigation.goBack()}
                    onOpenLearning={(courseId) => openCourseLearning(navigation, courseId)}
                    onOpenCheckout={(orderId) => navigation.navigate('Checkout', { orderId })}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Checkout">
                {({ route, navigation }: any) => (
                  <CheckoutScreen orderId={route.params?.orderId ?? ''} onBack={() => navigation.goBack()} />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Learning"
          options={{
            tabBarLabel: 'My Learning',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'school' : 'school-outline'} size={size ?? 24} color={color} />
            ),
          }}
        >
          {() => (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="MyLearningMain">
                {({ navigation }: any) => (
                  <MyLearningScreen
                    onCoursePress={(courseId) => navigation.navigate('CourseLearning', { courseId })}
                    onCertificatesPress={() => navigation.navigate('Certificates')}
                    onNotificationsPress={() => navigation.navigate('Inbox', { screen: 'InboxMain' })}
                    onPurchasesPress={() => navigation.navigate('Purchases')}
                    onBrowseCourses={() => navigation.navigate('Courses', { screen: 'CoursesMain' })}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="CourseLearning">
                {({ route, navigation }: any) => (
                  <CourseLearningScreen
                    courseId={route.params?.courseId ?? ''}
                    onBack={() => navigation.goBack()}
                    onPlayLecture={(lecture) =>
                      navigation.navigate('LecturePlayer', {
                        classId: lecture.id,
                        courseId: lecture.course_id,
                        title: lecture.title,
                      })
                    }
                    onOpenExam={(exam) => navigation.navigate('Exam', { exam })}
                    onCertificateIssued={() => navigation.navigate('Certificates')}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="LecturePlayer">
                {({ route, navigation }: any) => (
                  <LecturePlayerScreen
                    // Remount for the next lecture so the old session's final heartbeat is flushed first.
                    key={route.params?.classId}
                    classId={route.params?.classId ?? ''}
                    courseId={route.params?.courseId}
                    title={route.params?.title ?? 'Lecture'}
                    onBack={() => navigation.goBack()}
                    onPlayNext={(lecture) =>
                      navigation.replace('LecturePlayer', {
                        classId: lecture.id,
                        courseId: lecture.course_id,
                        title: lecture.title,
                      })
                    }
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Exam">
                {({ route, navigation }: any) => <ExamScreen exam={route.params?.exam} onBack={() => navigation.goBack()} />}
              </Stack.Screen>
              <Stack.Screen name="Certificates">
                {({ navigation }: any) => (
                  <CertificatesScreen
                    onBack={() => navigation.goBack()}
                    onVerify={(id?: string) => navigation.navigate('VerifyCertificate', { id })}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="VerifyCertificate">
                {({ route, navigation }: any) => (
                  <VerifyCertificateScreen initialId={route.params?.id} onBack={() => navigation.goBack()} />
                )}
              </Stack.Screen>
              <Stack.Screen name="Purchases">
                {({ navigation }: any) => (
                  <PurchasesScreen
                    onBack={() => navigation.goBack()}
                    onOpenOrder={(orderId) => navigation.navigate('Checkout', { orderId })}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Checkout">
                {({ route, navigation }: any) => (
                  <CheckoutScreen orderId={route.params?.orderId ?? ''} onBack={() => navigation.goBack()} />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Inbox"
          options={{
            tabBarLabel: 'Inbox',
            tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'mail' : 'mail-outline'} size={size ?? 24} color={color} />
            ),
          }}
        >
          {() => (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="InboxMain">
                {({ navigation }: any) => (
                  <NotificationsScreen
                    onOpenNotification={(item) => navigation.navigate('NotificationDetail', { notificationId: item.id })}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="NotificationDetail">
                {({ route, navigation }: any) => (
                  <NotificationDetailScreen
                    notificationId={route.params?.notificationId ?? ''}
                    onBack={() => navigation.goBack()}
                    onOpenCourse={(courseId) => openCourseLearning(navigation, courseId)}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Profile"
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={size ?? 24} color={color} />
            ),
          }}
        >
          {() => (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="ProfileMain">
                {({ navigation }: any) => (
                  <ProfileScreen
                    onLogout={onLogout}
                    onEditProfile={() => navigation.navigate('EditProfile')}
                    onPrivacyPolicy={() => navigation.navigate('PrivacyPolicy')}
                    onCertificates={() => navigation.navigate('Certificates')}
                    onPurchases={() => navigation.navigate('Purchases')}
                    onVerifyCertificate={() => navigation.navigate('VerifyCertificate')}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="EditProfile">
                {({ navigation }: any) => (
                  <EditProfileScreen onBack={() => navigation.goBack()} onSaved={() => navigation.goBack()} />
                )}
              </Stack.Screen>
              <Stack.Screen name="PrivacyPolicy">
                {({ navigation }: any) => <PrivacyPolicyScreen onBack={() => navigation.goBack()} />}
              </Stack.Screen>
              <Stack.Screen name="Certificates">
                {({ navigation }: any) => (
                  <CertificatesScreen
                    onBack={() => navigation.goBack()}
                    onVerify={(id?: string) => navigation.navigate('VerifyCertificate', { id })}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="VerifyCertificate">
                {({ route, navigation }: any) => (
                  <VerifyCertificateScreen initialId={route.params?.id} onBack={() => navigation.goBack()} />
                )}
              </Stack.Screen>
              <Stack.Screen name="Purchases">
                {({ navigation }: any) => (
                  <PurchasesScreen
                    onBack={() => navigation.goBack()}
                    onOpenOrder={(orderId) => navigation.navigate('Checkout', { orderId })}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Checkout">
                {({ route, navigation }: any) => (
                  <CheckoutScreen orderId={route.params?.orderId ?? ''} onBack={() => navigation.goBack()} />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </>
  );
}

// ---- Root -------------------------------------------------------------------------------------

// Auth or Main App – load auth after Amplify config so we don't trigger Amplify before it's ready
export function AppNavigator() {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const manualLogoutRef = React.useRef(false);

  useEffect(() => {
    let cancelled = false;
    import('@/config/amplify')
      .then(() => import('@/services/auth'))
      .then(({ authService }) => {
        if (cancelled) return;
        authService.setOnUnauthorized(() => {
          // Session ended: drop every cached private response so the next account starts clean.
          queryClient.clear();
          manualLogoutRef.current = false;
          setRefreshKey((k) => k + 1);
        });
        authService.setBeforeSignOut(async () => {
          // Still signed in here: remember an interrupted page (forced expiry only) and clear private state.
          if (manualLogoutRef.current) {
            resumeTarget = null;
            await clearPrivateStores();
          } else {
            await captureResumeTarget();
          }
          await unregisterPush();
        });
        // Before any per-user store is read (push registration, exam resume)
        return authService.repairStoredUserId().then(() => authService.isAuthenticated());
      })
      .then((authenticated) => {
        if (!cancelled) setIsAuthenticated(!!authenticated);
      })
      .catch(() => {
        if (!cancelled) setIsAuthenticated(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, queryClient]);

  // Deep links: the cold-start URL once per app run, then any URL that arrives while running.
  useEffect(() => {
    if (!initialUrlHandled) {
      initialUrlHandled = true;
      Linking.getInitialURL().then((url) => openDeepLink(parseDeepLink(url))).catch(() => {});
    }
    const sub = Linking.addEventListener('url', ({ url }) => openDeepLink(parseDeepLink(url)));
    return () => sub.remove();
  }, []);

  const handleLogout = useCallback(() => {
    manualLogoutRef.current = true;
    import('@/services/auth').then(({ authService }) => authService.logout());
  }, []);

  const handleLoginSuccessStable = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  if (isAuthenticated === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={flushPendingNotification} documentTitle={documentTitle}>
      {isAuthenticated ? <SignedIn onLogout={handleLogout} /> : <AuthStack onLoginSuccess={handleLoginSuccessStable} />}
    </NavigationContainer>
  );
}

// Auth Stack: AuthHome (entry) → Sign In → Login | Create account → SignUp → ConfirmSignUp → CompleteProfile
function AuthStack({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AuthHome">
      <Stack.Screen name="AuthHome">
        {({ navigation }) => (
          <AuthHomeScreen
            onSignIn={() => navigation.navigate('Login')}
            onCreateAccount={() => navigation.navigate('SignUp')}
            onVerifyCertificate={() => navigation.navigate('VerifyCertificate')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="VerifyCertificate">
        {({ navigation }) => <VerifyCertificateScreen onBack={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen name="Login">
        {({ route, navigation }) => {
          const params = (route.params as LoginParams | undefined) ?? {};
          return (
            <LoginScreen
              // Remount when arriving with a new prefilled email/notice (e.g. after a password reset)
              key={`${params.email ?? ''}|${params.notice ?? ''}`}
              initialEmail={params.email}
              notice={params.notice}
              onLoginSuccess={onLoginSuccess}
              onCreateAccount={() => navigation.navigate('SignUp')}
              onForgotPassword={(email) => navigation.navigate('ForgotPassword', { email })}
              onNeedsConfirmation={(email) => navigation.navigate('ConfirmSignUp', { email })}
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="ForgotPassword">
        {({ route, navigation }) => (
          <ForgotPasswordScreen
            initialEmail={(route.params as LoginParams | undefined)?.email}
            onBack={() => navigation.goBack()}
            onDone={(email) =>
              navigation.navigate('Login', { email, notice: 'Password updated. Sign in with your new password.' })
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="SignUp">
        {({ navigation }) => (
          <SignUpScreen
            onSuccess={(email, password, name) => navigation.navigate('ConfirmSignUp', { email, password, name })}
            onSignIn={() => navigation.navigate('Login')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ConfirmSignUp">
        {({ route, navigation }) => {
          const params = (route.params as SignUpFlowParams | undefined) ?? {};
          return (
            <ConfirmSignUpScreen
              email={params.email ?? ''}
              password={params.password}
              name={params.name}
              onSuccess={() =>
                params.password
                  ? navigation.navigate('CompleteProfile', {
                      email: params.email ?? '',
                      password: params.password,
                      name: params.name,
                    })
                  : // Confirmed from the login screen: we don't hold the password, so sign in again.
                    navigation.navigate('Login', { email: params.email, notice: 'Email verified. Sign in to continue.' })
              }
              onResend={() => {}}
              onBack={() => navigation.goBack()}
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="CompleteProfile">
        {({ route }) => {
          const params = (route.params as SignUpFlowParams | undefined) ?? {};
          return (
            <CompleteProfileScreen
              email={params.email ?? ''}
              password={params.password ?? ''}
              name={params.name}
              onComplete={onLoginSuccess}
            />
          );
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  centerText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
