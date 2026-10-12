import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../theme';

// Navy ground, faint dot grid, one slow-moving soft glow.
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const gx = interpolate(Math.sin(frame / 90), [-1, 1], [0.35, 0.65]) * width;
  const gy = interpolate(Math.cos(frame / 120), [-1, 1], [0.35, 0.55]) * height;
  const r = Math.max(width, height) * 0.55;
  return (
    <AbsoluteFill style={{ backgroundColor: C.navy }}>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill={C.soft} fillOpacity="0.09" />
          </pattern>
          <radialGradient id="glow" cx={gx} cy={gy} r={r} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={C.blue} stopOpacity="0.20" />
            <stop offset="1" stopColor={C.blue} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={width} height={height} fill="url(#dots)" />
        <rect width={width} height={height} fill="url(#glow)" />
      </svg>
    </AbsoluteFill>
  );
};
