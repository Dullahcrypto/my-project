import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { getLayout } from '../layout';
import { C, MONO, SANS } from '../theme';
import { enter, riseStyle } from '../components/motion';
import { Logo } from '../components/Logo';

const WhatsAppIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6z" />
    <path d="M9 9.5c.3 2 2.3 4.2 4.6 5l1.3-1.3 2 .9-.4 1.6c-3.6.3-7.9-3.6-8-7.2l1.5-.5 1 1.9z" />
  </svg>
);

// Sky background, revealed from the line's position. Rendered below the wave layer.
export const CTASky: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = getLayout(width, height);
  const sky = enter(frame, fps, 0, { damping: 200, mass: 1, stiffness: 90 });
  const R = Math.hypot(width, height) * 0.6;
  return <AbsoluteFill style={{ backgroundColor: C.sky, clipPath: `circle(${sky * R}px at 50% ${L.cta.underY}px)` }} />;
};

// Final card details. Holds about 3.5 seconds.
export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = getLayout(width, height);
  const P = L.cta;
  const rise = (d: number, dist = 30) => riseStyle(enter(frame, fps, d), 0, dist);
  const iconSize = P.labelSize * 1.5;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: P.logoY - P.logoSize / 2, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...rise(12) }}>
        <Logo size={P.logoSize} ring={C.white} />
      </div>
      <div
        style={{
          position: 'absolute',
          top: P.nameTop + P.logoSize * 0.18,
          left: 0,
          right: 0,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          ...rise(16),
        }}
      >
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: L.vertical ? 46 : 40, letterSpacing: '-0.03em', color: C.navy }}>Neuromed Clinic</span>
        <span style={{ fontFamily: MONO, fontSize: L.vertical ? 26 : 24, color: C.ink2 }}>Jabi, Abuja</span>
      </div>
      <div style={{ position: 'absolute', top: P.labelTop, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, ...rise(22) }}>
        <span style={{ width: iconSize, height: iconSize, borderRadius: '50%', background: C.wa, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WhatsAppIcon size={iconSize * 0.62} />
        </span>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: P.labelSize, letterSpacing: '-0.025em', color: C.navy }}>Book on WhatsApp</span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: P.numberTop,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: P.numberSize,
          letterSpacing: '-0.035em',
          color: C.navy,
          whiteSpace: 'nowrap',
          ...rise(26),
        }}
      >
        0813 102 6221
      </div>
      <div
        style={{
          position: 'absolute',
          top: P.addressTop,
          left: L.margin,
          right: L.margin,
          textAlign: 'center',
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: P.addressSize,
          lineHeight: 1.3,
          color: C.navy,
          ...rise(34, 24),
        }}
      >
        Arewa Specialist Hospital Annex,{L.vertical ? <br /> : ' '}opposite Jabi Lake, Abuja
      </div>
      <div
        style={{
          position: 'absolute',
          top: P.hoursTop,
          left: L.margin,
          right: L.margin,
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: P.hoursSize,
          color: C.ink2,
          ...rise(40, 20),
        }}
      >
        Mon–Fri 9:00–19:00 · Sat 10:00–14:00
      </div>
    </AbsoluteFill>
  );
};
