import { Easing, interpolate, interpolateColors } from 'remotion';
import { C, T } from './theme';
import type { Layout } from './layout';

// One line runs through the whole film. Its shape is a blend of these patterns.
export type WaveState = {
  y: number; // baseline
  x0: number; // left end
  x1: number; // right end
  amp: number; // amplitude in px
  eeg: number; // irregular brain rhythm
  spike: number; // EMG motor-unit spikes
  pulse: number; // single travelling nerve impulse
  burst: number; // spike-and-wave seizure burst
  blip: number; // single heartbeat-style blip in the middle
  extra: number; // 0..1: splits into three EEG traces
  spread: number; // vertical gap between the three traces
  draw: number; // 0..1 draw-on
  sw: number; // stroke width
  tone: number; // 0 = soft blue (on navy), 1 = brand blue (on sky)
  opacity: number;
};

const TAU = Math.PI * 2;
const frac = (v: number) => v - Math.floor(v);
const gauss = (v: number, w: number) => Math.exp(-((v / w) ** 2));
const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const eeg = (u: number, s: number) =>
  0.55 * Math.sin(TAU * (5 * u - 0.6 * s)) +
  0.3 * Math.sin(TAU * (11 * u + 0.4 * s) + 1.3) +
  0.15 * Math.sin(TAU * (23 * u - 1.1 * s) + 0.7);

export const spike = (u: number, s: number) => {
  const p = frac(u * 5 - s * 0.9);
  return gauss(p - 0.5, 0.018) * 1.1 - 0.6 * gauss(p - 0.545, 0.028) + 0.06 * Math.sin(TAU * (31 * u + s));
};

// Where the nerve impulse is (0..1 along the line). Shared with the NCS scene.
export const pulseCenter = (s: number) => 0.1 + 0.8 * smooth(0, 1, frac(s * 0.5));

export const pulse = (u: number, s: number) => {
  const c = pulseCenter(s);
  return -(gauss(u - c, 0.03) - 0.35 * gauss(u - c - 0.05, 0.04));
};

export const burst = (u: number, s: number) => {
  const q = frac(u * 16 - s * 0.6);
  const sw = 1.25 * gauss(q - 0.3, 0.035) - 0.55 * gauss(q - 0.62, 0.11);
  return sw * gauss(u - 0.5, 0.15) + 0.2 * eeg(u, s);
};

export const blip = (u: number) => -(gauss(u - 0.5, 0.012) - 0.45 * gauss(u - 0.525, 0.016)) + 0.3 * gauss(u - 0.47, 0.01);

export function shapeAt(st: WaveState, u: number, s: number, phase = 0) {
  const env = smooth(0, 0.06, u) * smooth(1, 0.94, u);
  const v =
    st.eeg * eeg(u, s + phase) +
    st.spike * spike(u, s) +
    st.pulse * pulse(u, s) +
    st.burst * burst(u, s) +
    st.blip * blip(u);
  return st.amp * env * v;
}

export function wavePath(st: WaveState, s: number, offset = 0, phase = 0, samples = 260) {
  const pts: string[] = [];
  const last = Math.max(1, Math.round((samples - 1) * st.draw));
  for (let i = 0; i <= last; i++) {
    const u = i / (samples - 1);
    const x = st.x0 + u * (st.x1 - st.x0);
    const y = st.y + offset + shapeAt(st, u, s, phase);
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

const base = (L: Layout): WaveState => ({
  y: L.hook.waveY, x0: 0, x1: L.W, amp: L.hook.amp,
  eeg: 1, spike: 0, pulse: 0, burst: 0, blip: 0, extra: 0, spread: 0,
  draw: 1, sw: L.vertical ? 7 : 6, tone: 0, opacity: 1,
});

// Keyframes: the line eases from one state to the next between them.
export function keyframes(L: Layout): Array<{ f: number; s: Partial<WaveState> }> {
  const b = L.services.band;
  const S = T.services.from;
  const E = T.services.each;
  const svc = (i: number) => S + i * E;
  const inBand = { y: b.cy, x0: b.x0, x1: b.x1 };
  const zero = { eeg: 0, spike: 0, pulse: 0, burst: 0, blip: 0, extra: 0, spread: 0 };
  const k: Array<{ f: number; s: Partial<WaveState> }> = [
    { f: 0, s: { draw: 0 } },
    { f: 42, s: { draw: 1 } },
    { f: 108, s: {} },
    { f: 138, s: { y: L.promise.waveY, amp: L.promise.amp } },
    { f: 228, s: { y: L.promise.waveY, amp: L.promise.amp } },
    // EEG: the line splits into three brain-wave traces
    { f: svc(0) + 14, s: { ...inBand, ...zero, eeg: 1, amp: b.h * 0.09, extra: 1, spread: b.h * 0.3 } },
    { f: svc(0) + 66, s: { ...inBand, ...zero, eeg: 1, amp: b.h * 0.09, extra: 1, spread: b.h * 0.3 } },
    // EMG: spikes
    { f: svc(1) + 12, s: { ...inBand, ...zero, spike: 1, amp: b.h * 0.24 } },
    { f: svc(1) + 66, s: { ...inBand, ...zero, spike: 1, amp: b.h * 0.24 } },
    // Nerve conduction: a calm nerve with one travelling impulse
    { f: svc(2) + 12, s: { ...inBand, ...zero, pulse: 1, amp: b.h * 0.2 } },
    { f: svc(2) + 66, s: { ...inBand, ...zero, pulse: 1, amp: b.h * 0.2 } },
    // Seizure: a burst that settles into a calm rhythm
    { f: svc(3) + 12, s: { ...inBand, ...zero, burst: 1, amp: b.h * 0.22 } },
    { f: svc(3) + 30, s: { ...inBand, ...zero, burst: 1, amp: b.h * 0.22 } },
    { f: svc(3) + 62, s: { ...inBand, ...zero, burst: 0, eeg: 0.55, amp: b.h * 0.12 } },
    // Stroke: steady line beneath the brain
    { f: svc(4) + 12, s: { ...inBand, ...zero, y: b.cy + b.h * 0.34, eeg: 0.5, amp: b.h * 0.05 } },
    { f: svc(4) + 66, s: { ...inBand, ...zero, y: b.cy + b.h * 0.34, eeg: 0.5, amp: b.h * 0.05 } },
    // Pharmacy: flattens into a shelf
    { f: svc(5) + 12, s: { ...inBand, ...zero, y: b.cy + b.h * 0.28, amp: 0, sw: L.vertical ? 8 : 7 } },
    { f: svc(5) + 66, s: { ...inBand, ...zero, y: b.cy + b.h * 0.28, amp: 0, sw: L.vertical ? 8 : 7 } },
    // Your visit: becomes the timeline
    { f: T.steps.from + 14, s: { y: L.steps.y, x0: L.steps.x0, x1: L.steps.x1, ...zero, amp: 0, sw: L.vertical ? 6 : 5 } },
    { f: T.steps.from + T.steps.len - 14, s: { y: L.steps.y, x0: L.steps.x0, x1: L.steps.x1, ...zero, amp: 0 } },
    // Call to action: underlines the WhatsApp number with a single blip
    {
      f: T.cta.from + 30,
      s: {
        y: L.cta.underY, x0: L.W / 2 - L.cta.underHalf, x1: L.W / 2 + L.cta.underHalf,
        ...zero, blip: 1, amp: L.vertical ? 36 : 32, tone: 1, sw: L.vertical ? 7 : 6,
      },
    },
    { f: T.cta.from + T.cta.len, s: {} },
  ];
  return k;
}

const EASE = Easing.bezier(0.65, 0, 0.35, 1);
const NUM_KEYS: Array<keyof WaveState> = [
  'y', 'x0', 'x1', 'amp', 'eeg', 'spike', 'pulse', 'burst', 'blip', 'extra', 'spread', 'draw', 'sw', 'tone', 'opacity',
];

export function waveStateAt(L: Layout, frame: number): WaveState {
  const ks = keyframes(L);
  // Resolve each keyframe to a full state (carry values forward).
  const full: Array<{ f: number; s: WaveState }> = [];
  let cur = base(L);
  for (const k of ks) {
    cur = { ...cur, ...k.s };
    full.push({ f: k.f, s: cur });
  }
  if (frame <= full[0].f) return full[0].s;
  for (let i = 0; i < full.length - 1; i++) {
    const a = full[i];
    const b = full[i + 1];
    if (frame >= a.f && frame <= b.f) {
      const t = EASE((frame - a.f) / Math.max(1, b.f - a.f));
      const out = { ...a.s };
      for (const key of NUM_KEYS) {
        (out[key] as number) = interpolate(t, [0, 1], [a.s[key] as number, b.s[key] as number]);
      }
      return out;
    }
  }
  return full[full.length - 1].s;
}

export const waveColor = (tone: number) => interpolateColors(tone, [0, 1], [C.soft, C.blue]);
