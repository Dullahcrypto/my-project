import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { getLayout } from '../layout';
import { waveColor, wavePath, waveStateAt } from '../wave';

export const Wave: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = getLayout(width, height);
  const st = waveStateAt(L, frame);
  const s = frame / fps;
  const color = waveColor(st.tone);
  const main = wavePath(st, s);
  const traces = st.extra > 0.01
    ? [
        { d: wavePath(st, s, -st.spread * st.extra, 1.7), o: st.extra * 0.8 },
        { d: wavePath(st, s, st.spread * st.extra, 3.1), o: st.extra * 0.8 },
      ]
    : [];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
        {/* soft glow underneath */}
        <path d={main} fill="none" stroke={color} strokeWidth={st.sw * 4} strokeOpacity={0.12 * st.opacity} strokeLinecap="round" strokeLinejoin="round" />
        {traces.map((t, i) => (
          <path key={i} d={t.d} fill="none" stroke={color} strokeWidth={st.sw * 0.8} strokeOpacity={t.o * st.opacity} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <path d={main} fill="none" stroke={color} strokeWidth={st.sw} strokeOpacity={st.opacity} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};
