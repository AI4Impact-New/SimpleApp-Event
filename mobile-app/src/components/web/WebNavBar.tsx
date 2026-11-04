// Website-style top navigation for the browser portal. Replaces the bottom tab bar on web only.
// Mirrors the landing-page NavBar: 64px slate-50 bar, 1px bottom border, active link with a teal underline.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useLinkBuilder } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PiLogo } from '@/components/PiLogo';
import { useWebLayout } from '@/hooks/useWebLayout';
import { authService } from '@/services/auth';
import { colors, fonts, layout, palette, spacing } from '@/theme/colors';

// Routes shown as text links; the rest (Inbox, Profile) sit on the right as account controls.
// "Events" is not a tab: it is a page inside the Home stack, linked here like the design's top nav.
const PRIMARY_ROUTES = ['Home', 'Learning', 'Courses', 'Events'];
const WEB_LABELS: Record<string, string> = { Learning: 'My learning', Events: 'Events' };
// Home-stack pages that belong to the Events section (highlight "Events" instead of "Home").
const EVENT_SCREENS = new Set(['Events', 'Event', 'Poll', 'LeaderboardHome', 'LeaderboardDetail']);

type PressState = { pressed: boolean; hovered?: boolean };

/**
 * Nav items render as real <a href> elements (React Native Web turns `href` into an anchor), so
 * Cmd/Ctrl/middle-click and "open in new tab" work. A plain click stays in the app without a reload.
 */
function linkProps(href: string | undefined, onNavigate: () => void) {
  return {
    href,
    onPress: (e: any) => {
      const modified = e?.metaKey || e?.ctrlKey || e?.shiftKey || e?.altKey || (e?.button != null && e.button !== 0);
      if (modified && href) return;
      e?.preventDefault?.();
      onNavigate();
    },
  } as any;
}

export function WebNavBar({ state, descriptors, navigation, unread }: BottomTabBarProps & { unread: number }) {
  const { wide } = useWebLayout();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    authService
      .getCurrentUser()
      .then((res) => {
        if (active) setName(res.user?.name || res.user?.given_name || null);
      })
      .catch(() => {});
    // A profile edit saves the new name to the stored user; show it without a reload.
    const unsubscribe = authService.onUserDataChange((user) => setName(user.name || user.given_name || null));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const focusedTab = state.routes[state.index];
  const nestedState = focusedTab?.state as { index?: number; routes: { name: string }[] } | undefined;
  const nestedName = nestedState?.routes[nestedState.index ?? nestedState.routes.length - 1]?.name;
  const inEvents = focusedTab?.name === 'Home' && !!nestedName && EVENT_SCREENS.has(nestedName);
  const focusedName = inEvents ? 'Events' : focusedTab?.name;
  const { buildHref } = useLinkBuilder();
  const hrefFor = (routeName: string) =>
    (routeName === 'Events' ? buildHref('Home', { screen: 'Events' }) : buildHref(routeName)) ?? undefined;

  // Same contract as the default tab bar: emit tabPress (stacks pop to top on re-press), then navigate.
  const go = (routeName: string) => {
    if (routeName === 'Events') {
      if (!inEvents || nestedName !== 'Events') navigation.navigate('Home', { screen: 'Events', initial: false } as never);
      return;
    }
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    const focused = focusedName === routeName;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) {
      navigation.dispatch({ ...CommonActions.navigate(route.name, route.params), target: state.key });
    }
  };

  const labelFor = (routeName: string) => {
    if (WEB_LABELS[routeName]) return WEB_LABELS[routeName];
    const route = state.routes.find((r) => r.name === routeName);
    const label = route ? descriptors[route.key]?.options.tabBarLabel : undefined;
    return typeof label === 'string' ? label : routeName;
  };

  const links = PRIMARY_ROUTES.filter((r) => r === 'Events' || state.routes.some((route) => route.name === r)).map((routeName) => {
    const active = focusedName === routeName;
    return (
      <Pressable
        key={routeName}
        {...linkProps(hrefFor(routeName), () => go(routeName))}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        style={(s: PressState) => [styles.link, wide ? styles.linkWide : styles.linkNarrow, active && styles.linkActive, s.hovered && !active && styles.linkHover]}
      >
        <Text style={[styles.linkText, active && styles.linkTextActive]}>{labelFor(routeName)}</Text>
      </Pressable>
    );
  });

  const initials = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const account = (
    <View style={styles.account}>
      <Pressable
        {...linkProps(hrefFor('Inbox'), () => go('Inbox'))}
        accessibilityRole="tab"
        accessibilityLabel={unread > 0 ? `Inbox, ${unread} unread` : 'Inbox'}
        accessibilityState={{ selected: focusedName === 'Inbox' }}
        style={(s: PressState) => [styles.iconBtn, (s.hovered || focusedName === 'Inbox') && styles.iconBtnHover]}
      >
        <Ionicons
          name={focusedName === 'Inbox' ? 'notifications' : 'notifications-outline'}
          size={20}
          color={focusedName === 'Inbox' ? colors.text : colors.textSecondary}
        />
        {unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable
        {...linkProps(hrefFor('Profile'), () => go('Profile'))}
        accessibilityRole="tab"
        accessibilityLabel="Profile"
        accessibilityState={{ selected: focusedName === 'Profile' }}
        style={(s: PressState) => [styles.profileBtn, (s.hovered || focusedName === 'Profile') && styles.profileBtnHover]}
      >
        <View style={styles.avatar}>
          {initials ? (
            <Text style={styles.avatarText}>{initials}</Text>
          ) : (
            <Ionicons name="person" size={14} color={palette.textOnDark} />
          )}
        </View>
        {wide ? <Text style={styles.profileName} numberOfLines={1}>{name?.split(' ')[0] || 'Account'}</Text> : null}
      </Pressable>
    </View>
  );

  const brand = (
    <Pressable {...linkProps(hrefFor('Home'), () => go('Home'))} accessibilityRole="link" accessibilityLabel="AI4Impact home" style={styles.brand}>
      <PiLogo size={32} />
      <Text style={styles.wordmark}>
        AI4<Text style={styles.wordmarkAccent}>Impact</Text>
      </Text>
      {wide ? (
        <View style={styles.portalTag}>
          <Text style={styles.portalTagText}>STUDENT</Text>
        </View>
      ) : null}
    </Pressable>
  );

  if (wide) {
    return (
      <View style={[styles.bar, styles.barWide]} role="navigation">
        <View style={[styles.inner, styles.innerWide]}>
          {brand}
          <View style={styles.linksWide} accessibilityRole="tablist">{links}</View>
          {account}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bar, styles.barNarrow]} role="navigation">
      <View style={[styles.inner, styles.innerNarrow]}>
        {brand}
        <View style={{ flex: 1 }} />
        {account}
      </View>
      <ScrollView
        horizontal
        style={styles.linksScroller}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.linksNarrow}
        accessibilityRole="tablist"
      >
        {links}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  barWide: {
    height: layout.navHeight,
  },
  barNarrow: {
    flexShrink: 0,
  },
  linksScroller: {
    flexGrow: 0,
    flexShrink: 0,
  },
  inner: {
    width: '100%',
    maxWidth: layout.container,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.containerPad,
    gap: spacing.xxl,
  },
  innerWide: {
    flex: 1,
  },
  innerNarrow: {
    height: 56,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.45,
    color: colors.text,
  },
  wordmarkAccent: {
    color: colors.primary,
  },
  portalTag: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
    marginLeft: spacing.xs,
  },
  portalTagText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.textMuted,
  },
  linksWide: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl + spacing.sm,
  },
  linksNarrow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xxl,
    height: 44,
  },
  link: {
    height: '100%',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  linkWide: {
    paddingTop: 2,
  },
  linkNarrow: {
    paddingHorizontal: 2,
  },
  linkActive: {
    borderBottomColor: colors.primary,
  },
  linkHover: {
    borderBottomColor: colors.border,
  },
  linkText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  linkTextActive: {
    fontWeight: '600',
    color: colors.text,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  iconBtnHover: {
    borderColor: colors.borderStrong,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: palette.amber500,
    borderWidth: 2,
    borderColor: colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.body,
    color: palette.amber950,
    fontSize: 10,
    fontWeight: '700',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 38,
    paddingLeft: 4,
    paddingRight: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  profileBtnHover: {
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: palette.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.display,
    color: palette.textOnDark,
    fontSize: 12,
    fontWeight: '600',
  },
  profileName: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    maxWidth: 140,
  },
});
