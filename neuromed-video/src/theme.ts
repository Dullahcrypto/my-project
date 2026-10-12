export const C = {
  navy: '#07122B',
  navy2: '#0D1D42',
  blue: '#2457F5',
  sky: '#D6E6FF',
  soft: '#7FA6FF',
  white: '#FFFFFF',
  mute: '#A9B8D9',
  ink2: '#3E4B66',
  wa: '#157A41',
};

export const SANS = "'Geist', 'Helvetica Neue', Arial, sans-serif";
export const MONO = "'Geist Mono', ui-monospace, monospace";

import voice from './voice-manifest.json';

export const FPS = 30;

// Scene timeline (frames at 30 fps)
export const T = {
  hook: { from: 0, len: 120 },
  promise: { from: 120, len: 120 },
  services: { from: 240, len: 480, each: 80 },
  steps: { from: 720, len: 180 },
  // The end card stretches to fit the voiceover's call to action (see voiceover/generate.mjs).
  cta: { from: 900, len: Math.max(150, voice.ctaFrames || 150) },
};
export const DURATION = T.cta.from + T.cta.len;

export type VoiceLine = { id: string; file: string; from: number; frames: number };
export const VOICE: { enabled: boolean; lines: VoiceLine[] } = { enabled: !!voice.enabled, lines: (voice.lines || []) as VoiceLine[] };

export const SERVICES = [
  { key: 'eeg', title: 'EEG & Video EEG', desc: 'Records your brain’s electrical activity' },
  { key: 'emg', title: 'Electromyography (EMG)', desc: 'How muscles respond to nerve signals' },
  { key: 'ncs', title: 'Nerve conduction studies', desc: 'How fast signals travel along nerves' },
  { key: 'seizure', title: 'Seizure & epilepsy care', desc: 'Diagnosis, medication and follow-up' },
  { key: 'stroke', title: 'Stroke management', desc: 'Recovery and prevention' },
  { key: 'pharmacy', title: 'In-house pharmacy', desc: 'Your medication before you leave' },
] as const;
