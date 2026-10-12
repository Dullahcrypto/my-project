import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { getLayout } from '../layout';
import { C, MONO, SANS, T } from '../theme';
import { Logo } from './Logo';

// Small persistent "Neuromed Clinic" mark while the services and visit steps play.
export const BrandMark: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = getLayout(width, height);
  const o = interpolate(frame, [T.services.from, T.services.from + 20, T.cta.from - 10, T.cta.from + 6], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (o <= 0) return null;
  const size = L.vertical ? 64 : 56;
  return (
    <div
      style={{
        position: 'absolute',
        top: L.brand.top,
        left: L.brand.align === 'left' ? L.brand.left : 0,
        right: L.brand.align === 'left' ? undefined : 0,
        display: 'flex',
        justifyContent: L.brand.align === 'left' ? 'flex-start' : 'center',
        alignItems: 'center',
        gap: 16,
        opacity: o,
      }}
    >
      <Logo size={size} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: L.vertical ? 34 : 30, color: C.white, letterSpacing: '-0.02em' }}>Neuromed Clinic</span>
        <span style={{ fontFamily: MONO, fontSize: L.vertical ? 22 : 20, color: C.mute }}>Jabi, Abuja</span>
      </div>
    </div>
  );
};
