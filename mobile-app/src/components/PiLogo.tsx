import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

// AI4Impact mark — same artwork as the website favicon (landing-page/public/logo-mark-navy.svg).
interface PiLogoProps {
  size?: number;
}

export function PiLogo({ size = 64 }: PiLogoProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Rect width={48} height={48} rx={12} fill="#081328" />
        <Path
          d="M13 38 L27 9 L27 38"
          fill="none"
          stroke="#ffffff"
          strokeWidth={5.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M17.8 29 L32 29" fill="none" stroke="#ffffff" strokeWidth={5.5} strokeLinecap="round" />
        <Circle cx={38.5} cy={29} r={3.6} fill="#fea92f" />
      </Svg>
    </View>
  );
}
