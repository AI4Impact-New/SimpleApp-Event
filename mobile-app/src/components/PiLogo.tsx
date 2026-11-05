import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

// AI4Impact mark — same artwork as the website favicon (landing-page/public/logo-mark-navy.svg).
interface PiLogoProps {
  size?: number;
  /** `dark` is the white tile for navy backgrounds (landing-page/public/logo-mark-white.svg). */
  variant?: 'light' | 'dark';
}

export function PiLogo({ size = 64, variant = 'light' }: PiLogoProps) {
  const tile = variant === 'dark' ? '#ffffff' : '#081328';
  const ink = variant === 'dark' ? '#081328' : '#ffffff';
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Rect width={48} height={48} rx={12} fill={tile} />
        <Path
          d="M13 38 L27 9 L27 38"
          fill="none"
          stroke={ink}
          strokeWidth={5.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M17.8 29 L32 29" fill="none" stroke={ink} strokeWidth={5.5} strokeLinecap="round" />
        <Circle cx={38.5} cy={29} r={3.6} fill="#fea92f" />
      </Svg>
    </View>
  );
}
