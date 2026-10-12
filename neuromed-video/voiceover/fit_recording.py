"""Cut one full ElevenLabs recording into the ten scene lines and place them on the video.

Usage (from neuromed-video/):  python3 voiceover/fit_recording.py
Reads voiceover/source/elevenlabs-full.mp3, writes public/voice/*.mp3 and src/voice-manifest.json.
Cut points were found with ffmpeg silencedetect on the pauses between lines.
"""
import json
import subprocess

FPS = 30
SRC = 'voiceover/source/elevenlabs-full.mp3'
# id, start s, end s (in the recording), place at s (in the video), tempo
CUTS = [
    ('01-hook', 0.00, 4.07, 0.00, 1.00),
    ('02-promise', 4.56, 8.80, 4.12, 1.06),
    ('03-eeg', 9.12, 10.61, 8.25, 1.00),
    ('04-emg', 10.97, 13.43, 10.75, 1.00),
    ('05-ncs', 13.72, 15.28, 13.40, 1.00),
    ('06-seizure', 15.53, 17.25, 16.05, 1.00),
    ('07-stroke', 17.53, 18.59, 18.75, 1.00),
    ('08-pharmacy', 18.77, 21.04, 21.40, 1.00),
    ('09-steps', 21.39, 26.14, 24.10, 1.00),
    ('10-cta', 26.45, 34.69, 30.05, 1.00),
]
PAD_IN, PAD_OUT = 0.04, 0.12
CTA_START = 900


def run(*args):
    return subprocess.run(['npx', 'remotion', *args], check=True, capture_output=True, text=True).stdout


# Level the whole recording once (speech at about -16 LUFS, peaks below -1.5 dBTP) so every
# clip shares one consistent, phone-friendly loudness.
NORM = 'voiceover/source/.normalized.wav'
run('ffmpeg', '-y', '-v', 'error', '-i', SRC, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'pcm_s16le', NORM)

lines = []
for cid, a, b, at, tempo in CUTS:
    a0, b0 = max(0.0, a - PAD_IN), b + PAD_OUT
    # Cuts fall inside the silences between lines, so no fades are needed.
    out = f'public/voice/{cid}.mp3'
    tempo_args = ['-af', f'atempo={tempo}'] if tempo != 1.0 else []
    run('ffmpeg', '-y', '-v', 'error', '-ss', f'{a0:.3f}', '-to', f'{b0:.3f}', '-i', NORM, *tempo_args, '-c:a', 'libmp3lame', '-b:a', '192k', out)
    real = float(run('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', out).strip())
    lines.append({'id': cid, 'file': f'voice/{cid}.mp3', 'from': round(at * FPS), 'frames': int(real * FPS + 0.999)})
    print(f'{cid:12s} at {at:5.2f}s  {real:4.2f}s')

last = lines[-1]
cta_frames = max(150, last['from'] + last['frames'] + 45 - CTA_START)
manifest = {'enabled': True, 'source': 'ElevenLabs recording (voice: Gemnda, Podcast Narrative)', 'lines': lines, 'ctaFrames': cta_frames}
with open('src/voice-manifest.json', 'w') as f:
    json.dump(manifest, f, indent=2)
    f.write('\n')
print(f'video length: {(CTA_START + cta_frames) / FPS:.1f}s')
