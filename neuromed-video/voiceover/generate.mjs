// Generates the voiceover with ElevenLabs and wires it into the video.
//
//   ELEVENLABS_API_KEY=... node voiceover/generate.mjs            # generate with the chosen voice
//   ELEVENLABS_API_KEY=... node voiceover/generate.mjs --voices   # list voices (incl. Nigerian-accent library voices)
//   ELEVENLABS_VOICE_ID=<id> ...                                   # pick a voice
//
// Writes public/voice/*.mp3 and src/voice-manifest.json, which the video reads.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.ELEVENLABS_API_KEY;
const API = 'https://api.elevenlabs.io';
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const FPS = 30;
const BASE_CTA_FRAMES = 150; // end card length without voice
const MAX_SPEEDUP = 1.12; // never speed a line up more than this

if (!KEY) {
  console.error('ELEVENLABS_API_KEY is not set. Add it to your environment (never paste it into a chat).');
  process.exit(1);
}

const headers = { 'xi-api-key': KEY };

async function api(p, init = {}) {
  const res = await fetch(API + p, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${p} → ${res.status} ${await res.text()}`);
  return res;
}

if (process.argv.includes('--voices')) {
  const mine = await (await api('/v2/voices?page_size=100')).json();
  console.log('\nVoices in your account:');
  for (const v of mine.voices || []) console.log(`  ${v.voice_id}  ${v.name}  ${JSON.stringify(v.labels || {})}`);
  try {
    const shared = await (await api('/v1/shared-voices?page_size=30&language=en&accent=nigerian')).json();
    console.log('\nNigerian-accent voices in the ElevenLabs library:');
    for (const v of shared.voices || []) console.log(`  ${v.voice_id}  ${v.name}  (${v.gender || '?'}, ${v.age || '?'}) ${v.descriptive || v.use_case || ''}`);
  } catch (e) {
    console.log('\n(Could not search the voice library: ' + e.message + ')');
  }
  process.exit(0);
}

const VOICE = process.env.ELEVENLABS_VOICE_ID;
if (!VOICE) {
  console.error('Set ELEVENLABS_VOICE_ID. Run with --voices to see options.');
  process.exit(1);
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { lines, voiceSettings } = JSON.parse(fs.readFileSync(path.join(root, 'voiceover/lines.json'), 'utf8'));
const outDir = path.join(root, 'public/voice');
fs.mkdirSync(outDir, { recursive: true });

const remotion = (args) => execFileSync('npx', ['remotion', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const durationOf = (file) =>
  parseFloat(remotion(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).trim());

const manifest = { enabled: true, voiceId: VOICE, model: MODEL, lines: [], ctaFrames: BASE_CTA_FRAMES };

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const file = path.join(outDir, `${line.id}.mp3`);
  const body = {
    text: line.text,
    model_id: MODEL,
    voice_settings: voiceSettings,
    previous_text: lines[i - 1]?.text,
    next_text: lines[i + 1]?.text,
  };
  const res = await api(`/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify(body),
  });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  let dur = durationOf(file);

  // The call to action may run long: the end card stretches to fit instead.
  const isLast = i === lines.length - 1;
  if (!isLast && dur > line.slot) {
    const factor = Math.min(MAX_SPEEDUP, dur / line.slot);
    const tmp = file.replace('.mp3', '.tmp.mp3');
    remotion(['ffmpeg', '-y', '-v', 'error', '-i', file, '-filter:a', `atempo=${factor.toFixed(3)}`, tmp]);
    fs.renameSync(tmp, file);
    dur = durationOf(file);
    console.log(`  ${line.id}: sped up ×${factor.toFixed(2)} to fit`);
  }
  if (!isLast && dur > line.slot + 0.15) console.warn(`  ⚠ ${line.id} is ${dur.toFixed(2)}s for a ${line.slot}s slot; consider shortening the text.`);

  manifest.lines.push({ id: line.id, file: `voice/${line.id}.mp3`, from: Math.round(line.at * FPS), frames: Math.ceil(dur * FPS) });
  console.log(`✓ ${line.id}  ${dur.toFixed(2)}s  "${line.text}"`);
}

// End card: hold at least 1.5 s after the last word.
const last = manifest.lines[manifest.lines.length - 1];
const ctaStart = 900;
manifest.ctaFrames = Math.max(BASE_CTA_FRAMES, last.from + last.frames + 45 - ctaStart);
fs.writeFileSync(path.join(root, 'src/voice-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nVideo length with voice: ${((ctaStart + manifest.ctaFrames) / FPS).toFixed(1)}s. Now run: npm run render`);
