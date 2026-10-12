import { Config } from '@remotion/cli/config';
import fs from 'fs';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);

// Cloud sessions ship a headless Chromium; use it when present so nothing is downloaded.
const bundled = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
} else if (fs.existsSync(bundled)) {
  Config.setBrowserExecutable(bundled);
}
