// Ring spinner from the design's States page: a thin track with one coloured arc, 0.8s per turn.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { palette } from '@/theme/colors';

export function Spinner({
  size = 16,
  thickness = 2,
  track = '#2a3654',
  head = palette.teal400,
  label,
  style,
}: {
  size?: number;
  thickness?: number;
  track?: string;
  head?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[
        { width: size, height: size, borderRadius: size / 2, borderWidth: thickness, borderColor: track, borderTopColor: head },
        { transform: [{ rotate }] },
        style,
      ]}
    />
  );
}
