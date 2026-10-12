import React from 'react';
import { Composition } from 'remotion';
import { NeuromedVideo } from './Video';
import { DURATION, FPS } from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="NeuromedVertical" component={NeuromedVideo} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="NeuromedWide" component={NeuromedVideo} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
  </>
);
