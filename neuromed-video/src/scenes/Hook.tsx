import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { getLayout } from '../layout';
import { C, SANS, T } from '../theme';
import { enter, exitP, riseStyle } from '../components/motion';

const WORDS = ['Seizures.', 'Numbness.', 'Weakness.', 'Stroke.'];

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = getLayout(width, height);
  const e = exitP(frame, T.hook.len, 16);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: L.hook.top,
          left: L.margin,
          right: L.margin,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: L.hook.size * 0.32,
          rowGap: L.hook.size * 0.05,
        }}
      >
        {WORDS.map((w, i) => {
          // one word per beat (every 16 frames ≈ 0.53s)
          const p = enter(frame, fps, 14 + i * 16);
          return (
            <span
              key={w}
              style={{
                fontFamily: SANS,
                fontWeight: 600,
                fontSize: L.hook.size,
                lineHeight: 1.05,
                letterSpacing: '-0.045em',
                color: i === 3 ? C.soft : C.white,
                ...riseStyle(p, e, 44),
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
