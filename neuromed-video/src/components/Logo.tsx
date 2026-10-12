import React from 'react';
import { Img, staticFile } from 'remotion';

export const Logo: React.FC<{ size: number; ring?: string; style?: React.CSSProperties }> = ({ size, ring, style }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      boxShadow: ring ? `0 0 0 ${Math.max(3, size * 0.025)}px ${ring}, 0 ${size * 0.12}px ${size * 0.3}px rgba(0,0,0,0.25)` : undefined,
      ...style,
    }}
  >
    <Img src={staticFile('logo.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '42% 45%' }} />
  </div>
);
