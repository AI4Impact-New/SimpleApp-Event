// App Navigator
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LoginScreen } from '@/screens/LoginScreen';
import { AuthHomeScreen } from '@/screens/AuthHomeScreen';
import { SignUpScreen } from '@/screens/SignUpScreen';
import { ConfirmSignUpScreen } from '@/screens/ConfirmSignUpScreen';
import { CompleteProfileScreen } from '@/screens/CompleteProfileScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { EventScreen } from '@/screens/EventScreen';
import { PollScreen } from '@/screens/PollScreen';
import { MaterialsScreen } from '@/screens/MaterialsScreen';
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
import { colors, spacing } from '@/theme/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
type SignUpFlowParams = { email?: string; password?: string; name?: string };

// Main Tab Navigator
function MainTabs({ onLogout }: { onLogout: (() => void) | null }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 56,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: colors.backgroundCard,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarLabel: 'Events',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size ?? 24} color={color} />
          ),
        }}
      >
        {() => (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeMain">
              {({ navigation }: any) => (
                <HomeScreen
                  onEventPress={(event) =>
                    navigation.navigate('Event', { eventId: event.id })
                  }
                  onScanPress={() =>
                    navigation.navigate('QRScanner')
                  }
                  onProfilePress={() => navigation.navigate('Profile')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Profile">
              {({ navigation }: any) => (
                <ProfileScreen
                  onBack={() => navigation.goBack()}
                  onLogout={onLogout ? () => onLogout() : () => {}}
                  onEditProfile={() => navigation.navigate('EditProfile')}
                  onPrivacyPolicy={() => navigation.navigate('PrivacyPolicy')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="PrivacyPolicy">
              {({ navigation }: any) => (
                <PrivacyPolicyScreen onBack={() => navigation.goBack()} />
              )}
            </Stack.Screen>
            <Stack.Screen name="EditProfile">
              {({ navigation }: any) => (
                <EditProfileScreen
                  onBack={() => navigation.goBack()}
                  onSaved={() => navigation.replace('Profile')}
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
                <PollScreen
                  pollId={route.params?.pollId}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="QRScanner">
              {({ navigation }: any) => (
                <QRScannerScreen
                  onScanSuccess={(eventId) => 
                    navigation.replace('Event', { eventId })
                  }
                  onBack={() => navigation.goBack()}
                />
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
                <CoursesScreen
                  onCoursePress={(course) =>
                    navigation.navigate('CourseDetail', { courseId: course.id })
                  }
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="CourseDetail">
              {({ route, navigation }: any) => (
                <CourseDetailScreen
                  courseId={route.params?.courseId ?? ''}
                  onBack={() => navigation.goBack()}
                  onOpenLearning={(courseId) =>
                    navigation.navigate('Learning', {
                      screen: 'CourseLearning',
                      params: { courseId },
                      initial: false,
                    })
                  }
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Learning"
        options={{
          tabBarLabel: 'Learning',
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
                  onNotificationsPress={() => navigation.navigate('Notifications')}
                  onBrowseCourses={() => navigation.navigate('Courses')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="CourseLearning">
              {({ route, navigation }: any) => (
                <CourseLearningScreen
                  courseId={route.params?.courseId ?? ''}
                  onBack={() => navigation.goBack()}
                  onPlayLecture={(lecture) =>
                    navigation.navigate('LecturePlayer', { classId: lecture.id, title: lecture.title })
                  }
                  onOpenExam={(exam) => navigation.navigate('Exam', { exam })}
                  onCertificateIssued={() => navigation.navigate('Certificates')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="LecturePlayer">
              {({ route, navigation }: any) => (
                <LecturePlayerScreen
                  classId={route.params?.classId ?? ''}
                  title={route.params?.title ?? 'Lecture'}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Exam">
              {({ route, navigation }: any) => (
                <ExamScreen exam={route.params?.exam} onBack={() => navigation.goBack()} />
              )}
            </Stack.Screen>
            <Stack.Screen name="Certificates">
              {({ navigation }: any) => <CertificatesScreen onBack={() => navigation.goBack()} />}
            </Stack.Screen>
            <Stack.Screen name="Notifications">
              {({ navigation }: any) => (
                <NotificationsScreen
                  onBack={() => navigation.goBack()}
                  onOpenCourse={(courseId) => navigation.navigate('CourseLearning', { courseId })}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Leaderboard"
        options={{
          tabBarLabel: 'Leaderboard',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'podium' : 'podium-outline'} size={size ?? 24} color={color} />
          ),
        }}
      >
        {() => (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="LeaderboardMain">
              {({ navigation }: any) => (
                <LeaderboardHomeScreen
                  onOpenEvents={() => navigation.navigate('Home')}
                  onOpenLeaderboard={(eventId) => navigation.navigate('LeaderboardDetail', { eventId })}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="LeaderboardDetail">
              {({ route, navigation }: any) => (
                <LeaderboardScreen
                  eventId={route.params?.eventId}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// Placeholder screen component
function PlaceholderScreen({
  title,
  description,
  onAction,
}: {
  title: string;
  description: string;
  onAction?: () => void;
}) {
  return (
    <View style={placeholderStyles.placeholder}>
      <Text style={placeholderStyles.placeholderTitle}>{title}</Text>
      <Text style={placeholderStyles.placeholderDesc}>{description}</Text>
      {onAction ? (
        <TouchableOpacity style={placeholderStyles.actionButton} onPress={onAction} activeOpacity={0.7}>
          <Text style={placeholderStyles.actionButtonText}>View Events</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xxl,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  placeholderDesc: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

// Auth or Main App – load auth after Amplify config so we don't trigger Amplify before it's ready
export function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [logoutFn, setLogoutFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/config/amplify')
      .then(() => import('@/services/auth'))
      .then(({ authService }) => {
        if (cancelled) return;
        authService.setOnUnauthorized(() => setRefreshKey((k) => k + 1));
        setLogoutFn(() => () => authService.logout());
        return authService.isAuthenticated();
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
  }, [refreshKey]);

  const handleLoginSuccessStable = React.useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  if (isAuthenticated === null) {
    return (
      <View style={loadingStyles.loading}>
        <Text style={loadingStyles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <MainTabs onLogout={logoutFn} />
      ) : (
        <AuthStack onLoginSuccess={handleLoginSuccessStable} />
      )}
    </NavigationContainer>
  );
}

// Auth Stack: AuthHome (entry) → Sign In → Login | Create account → SignUp → ConfirmSignUp → Login
function AuthStack({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AuthHome">
      <Stack.Screen name="AuthHome">
        {({ navigation }) => (
          <AuthHomeScreen
            onSignIn={() => navigation.navigate('Login')}
            onCreateAccount={() => navigation.navigate('SignUp')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onLoginSuccess={onLoginSuccess}
            onCreateAccount={() => navigation.navigate('SignUp')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="SignUp">
        {({ navigation }) => (
          <SignUpScreen
            onSuccess={(email, password, name) =>
              navigation.navigate('ConfirmSignUp', { email, password, name })
            }
            onSignIn={() => navigation.navigate('Login')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ConfirmSignUp">
        {({ route, navigation }) => (
          (() => {
            const params = (route.params as SignUpFlowParams | undefined) ?? {};
            return (
          <ConfirmSignUpScreen
            email={params.email ?? ''}
            password={params.password}
            name={params.name}
            onSuccess={() =>
              navigation.navigate('CompleteProfile', {
                email: params.email ?? '',
                password: params.password ?? '',
                name: params.name,
              })
            }
            onResend={() => {}}
          />
            );
          })()
        )}
      </Stack.Screen>
      <Stack.Screen name="CompleteProfile">
        {({ route, navigation }) => (
          (() => {
            const params = (route.params as SignUpFlowParams | undefined) ?? {};
            return (
          <CompleteProfileScreen
            email={params.email ?? ''}
            password={params.password ?? ''}
            name={params.name}
            onComplete={onLoginSuccess}
          />
            );
          })()
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const loadingStyles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
