import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import './fonts';
import { Background } from './components/Background';
import { BrandMark } from './components/BrandMark';
import { Wave } from './components/Wave';
import { CTA, CTASky } from './scenes/CTA';
import { Hook } from './scenes/Hook';
import { Promise as PromiseScene } from './scenes/Promise';
import { Service } from './scenes/Service';
import { Steps } from './scenes/Steps';
import { SERVICES, T, VOICE } from './theme';

export const NeuromedVideo: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <Sequence from={T.cta.from} durationInFrames={T.cta.len} name="5 Sky">
      <CTASky />
    </Sequence>
    {/* The signature line flows between scenes; scene artwork sits on top of it */}
    <Wave />
    <Sequence from={T.hook.from} durationInFrames={T.hook.len} name="1 Hook">
      <Hook />
    </Sequence>
    <Sequence from={T.promise.from} durationInFrames={T.promise.len} name="2 Promise">
      <PromiseScene />
    </Sequence>
    {SERVICES.map((s, i) => (
      <Sequence key={s.key} from={T.services.from + i * T.services.each} durationInFrames={T.services.each} name={`3.${i + 1} ${s.title}`}>
        <Service index={i} />
      </Sequence>
    ))}
    <Sequence from={T.steps.from} durationInFrames={T.steps.len} name="4 Your visit">
      <Steps />
    </Sequence>
    <Sequence from={T.cta.from} durationInFrames={T.cta.len} name="5 Call to action">
      <CTA />
    </Sequence>
    <BrandMark />
    {VOICE.enabled &&
      VOICE.lines.map((l) => (
        <Sequence key={l.id} from={l.from} durationInFrames={l.frames + 6} name={`Voice ${l.id}`}>
          <Audio src={staticFile(l.file)} />
        </Sequence>
      ))}
  </AbsoluteFill>
);
