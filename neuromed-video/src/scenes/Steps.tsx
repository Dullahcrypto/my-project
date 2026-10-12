import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { getLayout } from '../layout';
import { C, MONO, SANS, T } from '../theme';
import { BOUNCE, enter, exitP, riseStyle } from '../components/motion';

const STEPS = ['Book', 'Consult', 'Test on-site', 'Treat & follow up'];

export const Steps: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = getLayout(width, height);
  const P = L.steps;
  const e = exitP(frame, T.steps.len, 16);
  const gap = (P.x1 - P.x0) / (STEPS.length - 1);
  const stepAt = (i: number) => 26 + i * 26;
  // Progress fill eases from dot to dot as each step lands.
  const reached = interpolate(
    frame,
    STEPS.map((_, i) => stepAt(i)),
    STEPS.map((_, i) => i),
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const fillTo = P.x0 + gap * Math.min(STEPS.length - 1, Math.max(0, reached));
  const r = L.vertical ? 22 : 20;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: P.eyebrowTop,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: L.vertical ? 30 : 28,
          letterSpacing: '0.04em',
          color: C.soft,
          ...riseStyle(enter(frame, fps, 0), e, 20),
        }}
      >
        YOUR VISIT
      </div>
      <div
        style={{
          position: 'absolute',
          top: P.headTop,
          left: L.margin,
          right: L.margin,
          textAlign: 'center',
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: P.headSize,
          lineHeight: 1.04,
          letterSpacing: '-0.04em',
          color: C.white,
          ...riseStyle(enter(frame, fps, 6), e),
        }}
      >
        Four simple steps.
      </div>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0, opacity: 1 - e }}>
        <line x1={P.x0} y1={P.y} x2={fillTo} y2={P.y} stroke={C.blue} strokeWidth={L.vertical ? 10 : 9} strokeLinecap="round" />
        {STEPS.map((_, i) => {
          const p = enter(frame, fps, stepAt(i), BOUNCE);
          const done = reached >= i - 0.01;
          return (
            <g key={i} transform={`translate(${P.x0 + gap * i} ${P.y}) scale(${p})`}>
              <circle r={r * 1.9} fill={C.blue} fillOpacity={done ? 0.18 : 0} />
              <circle r={r} fill={done ? C.blue : C.navy} stroke={C.white} strokeWidth={4} />
            </g>
          );
        })}
      </svg>
      {STEPS.map((s, i) => {
        const p = enter(frame, fps, stepAt(i) + 4);
        const x = P.x0 + gap * i;
        return (
          <React.Fragment key={s}>
            <div
              style={{
                position: 'absolute',
                top: P.y - (L.vertical ? 110 : 100),
                left: x - P.labelWidth / 2,
                width: P.labelWidth,
                textAlign: 'center',
                fontFamily: MONO,
                fontSize: L.vertical ? 30 : 28,
                color: C.soft,
                ...riseStyle(p, e, 20),
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </div>
            <div
              style={{
                position: 'absolute',
                top: P.y + (L.vertical ? 62 : 56),
                left: x - P.labelWidth / 2,
                width: P.labelWidth,
                textAlign: 'center',
                fontFamily: SANS,
                fontWeight: 600,
                fontSize: P.labelSize,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: C.white,
                ...riseStyle(p, e, 24),
              }}
            >
              {s}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
