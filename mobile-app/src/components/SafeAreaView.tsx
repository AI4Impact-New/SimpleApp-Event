// Safe-area container for every screen. React Native's own SafeAreaView only pads on iOS; Android draws
// edge-to-edge, so use the inset-aware view. Inside the tab navigator the tab bar already owns the bottom inset.
import React, { useContext } from 'react';
import type { ViewProps } from 'react-native';
import { SafeAreaView as InsetSafeAreaView, type Edge } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

export function SafeAreaView({ edges, ...props }: ViewProps & { edges?: Edge[] }) {
  const inTabs = useContext(BottomTabBarHeightContext) !== undefined;
  return <InsetSafeAreaView edges={edges ?? (inTabs ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom'])} {...props} />;
}
