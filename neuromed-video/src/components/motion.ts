import { Easing, interpolate, spring } from 'remotion';

// Calm, no-overshoot spring used for almost everything.
export const SOFT = { damping: 200, mass: 0.9, stiffness: 120 };
// A little bounce, used only for objects landing (pharmacy items, step dots).
export const BOUNCE = { damping: 13, mass: 0.8, stiffness: 140 };

export const enter = (frame: number, fps: number, delay = 0, config = SOFT) =>
  spring({ frame: frame - delay, fps, config });

const EXIT_EASE = Easing.bezier(0.55, 0, 0.75, 0.2);
export const exitP = (frame: number, dur: number, len = 14) =>
  interpolate(frame, [dur - len, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EXIT_EASE });

// Standard text rise: comes up from below, leaves upwards.
export const riseStyle = (p: number, e: number, dist = 36): React.CSSProperties => ({
  opacity: Math.min(p, 1) * (1 - e),
  transform: `translateY(${(1 - p) * dist - e * dist * 0.6}px)`,
});
