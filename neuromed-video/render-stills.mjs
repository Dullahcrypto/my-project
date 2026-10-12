// Renders review stills for every scene in both formats into stills/.
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import fs from 'fs';
import path from 'path';

const browser = process.env.REMOTION_BROWSER_EXECUTABLE
  || (fs.existsSync('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell')
    ? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' : null);

const FRAMES = { '1-hook': 75, '2-promise': 200, '3a-eeg': 300, '3b-emg': 380, '3c-ncs': 455, '3d-seizure': 525, '3e-stroke': 625, '3f-pharmacy': 700, '4-steps': 860, '5-cta': 1010 };
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
for (const id of ['NeuromedVertical', 'NeuromedWide']) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable: browser });
  for (const [name, frame] of Object.entries(FRAMES)) {
    const output = `stills/${id === 'NeuromedVertical' ? '9x16' : '16x9'}-${name}.jpg`;
    await renderStill({ composition, serveUrl, frame, output, imageFormat: 'jpeg', jpegQuality: 88, browserExecutable: browser });
    console.log('rendered', output);
  }
}
