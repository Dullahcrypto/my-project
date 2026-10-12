import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { getLayout } from '../layout';
import { C, MONO, SANS, T } from '../theme';
import { enter, exitP, riseStyle } from '../components/motion';
import { Logo } from '../components/Logo';

export const Promise: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = getLayout(width, height);
  const P = L.promise;
  const e = exitP(frame, T.promise.len, 16);
  const logoP = enter(frame, fps, 2);
  const ringP = enter(frame, fps, 8);
  const r = P.logoSize / 2 + 18;
  const circ = 2 * Math.PI * r;
  const head = L.vertical ? ['Answers for the', 'brain, nerves', 'and muscles.'] : ['Answers for the brain,', 'nerves and muscles.'];
  return (
    <AbsoluteFill>
      {/* Logo reveal: circular mask grows, then a ring draws around it */}
      <div
        style={{
          position: 'absolute',
          left: width / 2 - P.logoSize / 2,
          top: P.logoY - P.logoSize / 2,
          width: P.logoSize,
          height: P.logoSize,
          clipPath: `circle(${logoP * 52}% at 50% 50%)`,
          opacity: 1 - e,
          transform: `scale(${0.92 + 0.08 * logoP}) translateY(${-e * 20}px)`,
        }}
      >
        <Logo size={P.logoSize} />
      </div>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: 1 - e }}>
        <circle
          cx={width / 2}
          cy={P.logoY}
          r={r}
          fill="none"
          stroke={C.soft}
          strokeWidth={3}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - ringP)}
          transform={`rotate(-90 ${width / 2} ${P.logoY})`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', top: P.headTop, left: L.margin, right: L.margin, textAlign: 'center' }}>
        {head.map((line, i) => (
          <div
            key={line}
            style={{
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: P.headSize,
              lineHeight: 1.04,
              letterSpacing: '-0.04em',
              color: C.white,
              ...riseStyle(enter(frame, fps, 14 + i * 6), e),
            }}
          >
            {line}
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          top: P.nameTop,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: L.vertical ? 34 : 30,
          color: C.soft,
          letterSpacing: '0.02em',
          ...riseStyle(enter(frame, fps, 34), e, 24),
        }}
      >
        Neuromed Clinic · Jabi, Abuja
      </div>
    </AbsoluteFill>
  );
};
