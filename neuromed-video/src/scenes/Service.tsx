import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Band, getLayout } from '../layout';
import { C, MONO, SANS, SERVICES, T } from '../theme';
import { BOUNCE, enter, exitP, riseStyle } from '../components/motion';
import { pulseCenter, shapeAt, waveStateAt } from '../wave';

type Props = { index: number };

export const Service: React.FC<Props> = ({ index }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = getLayout(width, height);
  const S = L.services;
  const dur = T.services.each;
  const start = T.services.from + index * dur;
  const svc = SERVICES[index];
  const e = exitP(frame, dur, 12);
  const reveal = enter(frame, fps, 4);
  const b = S.band;
  const maxR = Math.hypot(b.x1 - b.x0, b.h) * 0.75;

  return (
    <AbsoluteFill>
      {/* Diagram: revealed through a circular mask growing from the band centre */}
      <svg
        width={width}
        height={height}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 1 - e,
          clipPath: `circle(${reveal * maxR}px at ${(b.x0 + b.x1) / 2}px ${b.cy}px)`,
        }}
      >
        <Diagram kind={svc.key} b={b} frame={frame} start={start} fps={fps} vertical={L.vertical} />
      </svg>

      {/* Text */}
      <div
        style={{
          position: 'absolute',
          top: S.eyebrowTop,
          left: S.textLeft,
          width: S.textWidth,
          fontFamily: MONO,
          fontSize: L.vertical ? 30 : 28,
          color: C.soft,
          letterSpacing: '0.04em',
          ...riseStyle(enter(frame, fps, 0), e, 20),
        }}
      >
        SERVICES · {String(index + 1).padStart(2, '0')} / 06
      </div>
      <div style={{ position: 'absolute', top: S.titleTop, left: S.textLeft, width: S.textWidth, display: 'flex', flexDirection: 'column', gap: L.vertical ? 22 : 26 }}>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: S.titleSize,
            lineHeight: 1.02,
            letterSpacing: '-0.04em',
            color: C.white,
            ...riseStyle(enter(frame, fps, 6), e),
          }}
        >
          {svc.title}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 400,
            fontSize: S.descSize,
            lineHeight: 1.3,
            color: C.mute,
            ...riseStyle(enter(frame, fps, 12), e, 28),
          }}
        >
          {svc.desc}
        </div>
      </div>
    </AbsoluteFill>
  );
};

type DProps = { kind: string; b: Band; frame: number; start: number; fps: number; vertical: boolean };

const Diagram: React.FC<DProps> = (p) => {
  switch (p.kind) {
    case 'eeg':
      return <EEG {...p} />;
    case 'emg':
      return <EMG {...p} />;
    case 'ncs':
      return <NCS {...p} />;
    case 'seizure':
      return <Seizure {...p} />;
    case 'stroke':
      return <Stroke {...p} />;
    default:
      return <Pharmacy {...p} />;
  }
};

const label = (vertical: boolean): React.SVGProps<SVGTextElement> => ({
  fontFamily: MONO,
  fontSize: vertical ? 24 : 22,
  fill: C.mute,
  letterSpacing: '0.03em',
});

// EEG: channel labels beside the three traces, plus a soft frame like a monitor.
const EEG: React.FC<DProps> = ({ b, frame, fps, vertical }) => {
  const spread = b.h * 0.3;
  const names = ['Fp1–F7', 'C3–P3', 'O1–O2'];
  return (
    <g>
      <rect x={b.x0 - 24} y={b.cy - b.h / 2} width={b.x1 - b.x0 + 48} height={b.h} rx={28} fill="none" stroke={C.soft} strokeOpacity={0.18} strokeWidth={2} />
      {names.map((n, i) => {
        const o = enter(frame, fps, 14 + i * 5);
        return (
          <text key={n} x={b.x0 + 6} y={b.cy + (i - 1) * spread - 22} opacity={o} {...label(vertical)}>
            {n}
          </text>
        );
      })}
      <text x={b.x1 - 6} y={b.cy + b.h / 2 - 22} textAnchor="end" opacity={enter(frame, fps, 28)} {...label(vertical)}>
        VIDEO EEG · REC ●
      </text>
    </g>
  );
};

// EMG: a muscle above the line that contracts with each spike.
const EMG: React.FC<DProps> = ({ b, frame, start, fps, vertical }) => {
  const s = (frame + start) / fps;
  const beat = Math.pow(Math.max(0, Math.sin(Math.PI * 2 * s * 1.8)), 4);
  const w = (b.x1 - b.x0) * 0.62;
  const h = b.h * 0.2;
  const cx = (b.x0 + b.x1) / 2;
  const cy = b.cy - b.h * 0.34;
  const sx = 1 - 0.06 * beat;
  const grow = enter(frame, fps, 8);
  return (
    <g>
      <g transform={`translate(${cx} ${cy}) scale(${sx * grow} ${(1 + 0.12 * beat) * grow})`}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={C.blue} fillOpacity={0.18} stroke={C.soft} strokeWidth={3} />
        {[-0.3, -0.1, 0.1, 0.3].map((t) => (
          <path key={t} d={`M${-w * 0.42} ${t * h} Q0 ${t * h * 1.6} ${w * 0.42} ${t * h}`} fill="none" stroke={C.soft} strokeOpacity={0.55} strokeWidth={2} />
        ))}
      </g>
      <text x={b.x1} y={b.cy + b.h * 0.44} textAnchor="end" opacity={enter(frame, fps, 24)} {...label(vertical)}>
        MOTOR UNIT POTENTIALS
      </text>
    </g>
  );
};

// Nerve conduction: stimulate at S, record at R; a glowing impulse travels between.
const NCS: React.FC<DProps> = ({ b, frame, start, fps, vertical }) => {
  const s = (frame + start) / fps;
  const { width, height } = useVideoConfig();
  const st = waveStateAt(getLayout(width, height), frame + start);
  const u = pulseCenter(s);
  const x = b.x0 + u * (b.x1 - b.x0);
  const y = b.cy + shapeAt(st, u, s);
  const sx = b.x0 + 0.1 * (b.x1 - b.x0);
  const rx = b.x0 + 0.9 * (b.x1 - b.x0);
  const r = vertical ? 30 : 28;
  const nodeP = enter(frame, fps, 10, BOUNCE);
  const by = b.cy + b.h * 0.34;
  return (
    <g>
      <circle cx={x} cy={y} r={r * 1.6} fill={C.soft} fillOpacity={0.18} />
      <circle cx={x} cy={y} r={r * 0.45} fill={C.white} />
      <g transform={`translate(${sx} ${b.cy}) scale(${nodeP})`}>
        <circle r={r} fill={C.blue} />
        <text textAnchor="middle" dy={r * 0.36} fontFamily={MONO} fontSize={r} fill={C.white}>S</text>
      </g>
      <g transform={`translate(${rx} ${b.cy}) scale(${nodeP})`}>
        <circle r={r} fill={C.white} />
        <text textAnchor="middle" dy={r * 0.36} fontFamily={MONO} fontSize={r} fill={C.navy}>R</text>
      </g>
      <g opacity={enter(frame, fps, 22)}>
        <path d={`M${sx} ${by - 12} V${by} H${rx} V${by - 12}`} fill="none" stroke={C.mute} strokeWidth={2} />
        <text x={(sx + rx) / 2} y={by + 40} textAnchor="middle" {...label(vertical)}>
          STIMULUS → RESPONSE
        </text>
      </g>
    </g>
  );
};

// Seizure: highlight the burst, then let it fade as the rhythm settles.
const Seizure: React.FC<DProps> = ({ b, frame, fps, vertical }) => {
  const inP = enter(frame, fps, 8);
  const fade = interpolate(frame, [34, 56], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const calm = enter(frame, fps, 50);
  const w = b.x1 - b.x0;
  return (
    <g>
      <rect
        x={b.x0 + w * 0.3}
        y={b.cy - b.h * 0.34}
        width={w * 0.4}
        height={b.h * 0.68}
        rx={18}
        fill={C.blue}
        fillOpacity={0.16 * inP * fade}
        stroke={C.soft}
        strokeOpacity={0.4 * inP * fade}
        strokeDasharray="10 10"
      />
      <text x={b.x0 + w * 0.5} y={b.cy - b.h * 0.4} textAnchor="middle" opacity={inP * fade} {...label(vertical)}>
        SPIKE-AND-WAVE
      </text>
      <text x={b.x1} y={b.cy + b.h * 0.44} textAnchor="end" opacity={calm} {...label(vertical)}>
        STEADY RHYTHM
      </text>
    </g>
  );
};

// Stroke: a brain outline draws on; blood flow travels along a vessel.
const BRAIN =
  'M52 118 C26 116 14 92 22 72 C18 48 36 28 60 26 C70 10 98 4 118 14 C140 6 168 14 176 36 C196 46 200 72 188 90 C192 108 176 122 156 120 C150 128 138 130 128 126 L124 142 C122 150 112 150 110 142 L108 128 C92 132 72 128 62 122 C58 120 55 119 52 118 Z';
const SULCI = ['M104 18 C98 40 112 52 104 76', 'M62 40 C78 48 76 62 92 70', 'M142 26 C134 44 148 56 140 74', 'M46 96 C70 88 98 96 122 90', 'M150 94 C160 102 172 100 182 92'];
const VESSEL = 'M58 108 C80 96 106 92 132 80 C148 72 162 70 176 74';

const Stroke: React.FC<DProps> = ({ b, frame, fps }) => {
  const size = Math.min(b.h * 1.05, (b.x1 - b.x0) * 0.62);
  const scale = size / 200;
  const cx = (b.x0 + b.x1) / 2;
  const cy = b.cy - b.h * 0.08;
  const draw = enter(frame, fps, 6);
  const flow = interpolate(frame, [20, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const LEN = 900;
  return (
    <g transform={`translate(${cx - 100 * scale} ${cy - 75 * scale}) scale(${scale})`}>
      <path d={BRAIN} fill={C.navy2} fillOpacity={0.6} stroke={C.soft} strokeWidth={3 / scale * 1.4} strokeDasharray={LEN} strokeDashoffset={LEN * (1 - draw)} strokeLinejoin="round" />
      {SULCI.map((d) => (
        <path key={d} d={d} fill="none" stroke={C.soft} strokeOpacity={0.5 * draw} strokeWidth={2 / scale * 1.4} strokeLinecap="round" />
      ))}
      <path d={VESSEL} fill="none" stroke={C.mute} strokeOpacity={0.35} strokeWidth={5 / scale} strokeLinecap="round" />
      <path d={VESSEL} fill="none" stroke={C.white} strokeWidth={4 / scale} strokeLinecap="round" strokeDasharray="160" strokeDashoffset={160 * (1 - flow)} />
    </g>
  );
};

// Pharmacy: the line becomes a shelf; medication lands on it.
const Pharmacy: React.FC<DProps> = ({ b, frame, fps, vertical }) => {
  const shelf = b.cy + b.h * 0.28;
  const w = b.x1 - b.x0;
  const unit = Math.min(b.h * 0.42, w * 0.2);
  const drop = (d: number) => {
    const p = enter(frame, fps, d, BOUNCE);
    return { t: (1 - p) * -b.h * 0.7, o: Math.min(1, p * 1.6) };
  };
  const a = drop(10);
  const c = drop(18);
  const d = drop(26);
  const x1 = b.x0 + w * 0.2;
  const x2 = b.x0 + w * 0.5;
  const x3 = b.x0 + w * 0.8;
  return (
    <g>
      {/* bottle */}
      <g transform={`translate(${x1} ${shelf + a.t})`} opacity={a.o}>
        <rect x={-unit * 0.36} y={-unit * 1.2} width={unit * 0.72} height={unit * 1.2} rx={unit * 0.12} fill={C.navy2} stroke={C.soft} strokeWidth={3} />
        <rect x={-unit * 0.28} y={-unit * 1.42} width={unit * 0.56} height={unit * 0.22} rx={unit * 0.05} fill={C.soft} />
        <path d={`M0 ${-unit * 0.8} v${unit * 0.36} M${-unit * 0.18} ${-unit * 0.62} h${unit * 0.36}`} stroke={C.white} strokeWidth={4} strokeLinecap="round" />
      </g>
      {/* capsule */}
      <g transform={`translate(${x2} ${shelf - unit * 0.3 + c.t}) rotate(-28)`} opacity={c.o}>
        <path d={`M${-unit * 0.6} 0 a${unit * 0.28} ${unit * 0.28} 0 0 1 ${unit * 0.28} ${-unit * 0.28} h${unit * 0.32} v${unit * 0.56} h${-unit * 0.32} a${unit * 0.28} ${unit * 0.28} 0 0 1 ${-unit * 0.28} ${-unit * 0.28}z`} fill={C.blue} />
        <path d={`M${unit * 0.6} 0 a${unit * 0.28} ${unit * 0.28} 0 0 1 ${-unit * 0.28} ${unit * 0.28} h${-unit * 0.32} v${-unit * 0.56} h${unit * 0.32} a${unit * 0.28} ${unit * 0.28} 0 0 1 ${unit * 0.28} ${unit * 0.28}z`} fill={C.sky} />
      </g>
      {/* blister pack */}
      <g transform={`translate(${x3} ${shelf + d.t})`} opacity={d.o}>
        <rect x={-unit * 0.55} y={-unit * 0.9} width={unit * 1.1} height={unit * 0.9} rx={unit * 0.1} fill={C.navy2} stroke={C.soft} strokeWidth={3} />
        {[0, 1, 2].map((col) =>
          [0, 1].map((row) => (
            <circle key={`${col}${row}`} cx={-unit * 0.32 + col * unit * 0.32} cy={-unit * 0.65 + row * unit * 0.4} r={unit * 0.11} fill={C.soft} fillOpacity={0.85} />
          )),
        )}
      </g>
      <text x={b.x1} y={shelf + 56} textAnchor="end" opacity={enter(frame, fps, 34)} {...label(vertical)}>
        READY WHEN YOU LEAVE
      </text>
    </g>
  );
};
