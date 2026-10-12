import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

const faces: Array<[string, string, string]> = [
  ['Geist', 'geist-sans-latin-400-normal.woff2', '400'],
  ['Geist', 'geist-sans-latin-500-normal.woff2', '500'],
  ['Geist', 'geist-sans-latin-600-normal.woff2', '600'],
  ['Geist', 'geist-sans-latin-700-normal.woff2', '700'],
  ['Geist Mono', 'geist-mono-latin-400-normal.woff2', '400'],
  ['Geist Mono', 'geist-mono-latin-500-normal.woff2', '500'],
];

for (const [family, file, weight] of faces) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight, format: 'woff2' });
}
