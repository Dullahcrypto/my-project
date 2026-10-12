# Neuromed Clinic: motion-design explainer

A 35-second animated explainer of Neuromed Clinic's services, built with
[Remotion](https://www.remotion.dev/) (React → video).

| File | Format | Use it for |
|---|---|---|
| `out/neuromed-9x16.mp4` | 1080×1920, 9:16 | WhatsApp Status, Instagram Reels, TikTok |
| `out/neuromed-16x9.mp4` | 1920×1080, 16:9 | Website, YouTube, Facebook |

Both are H.264, 30 fps, 39.9 s, with an ElevenLabs voiceover (AAC audio). Every key
line also appears as on-screen text, so they still work with the sound off. `stills/` holds a review
frame from every scene in both formats.

## Storyboard

| Time | Scene |
|---|---|
| 0–4 s | Hook: "Seizures. Numbness. Weakness. Stroke." over a live brain-wave line |
| 4–8 s | Promise: logo reveal, "Answers for the brain, nerves and muscles." |
| 8–24 s | Six services, ~2.7 s each, each with its own animated diagram |
| 24–30 s | Your visit: Book → Consult → Test on-site → Treat & follow up |
| 30–35 s | Call to action: Book on WhatsApp 0813 102 6221, address, hours (holds ~3.5 s) |

The **signature line** (`src/wave.ts`) is one continuous EEG-style line that runs
through the whole film. It changes shape per scene (three EEG traces, EMG spikes,
a travelling nerve impulse, a seizure burst that settles, a pharmacy shelf, the
visit timeline) and ends by underlining the WhatsApp number.

## Voiceover (ElevenLabs)

The narration script is in `voiceover/SCRIPT.md`; the exact lines and timings are in
`voiceover/lines.json`. The video stays silent until voice clips are generated.

1. Put your ElevenLabs API key in the environment as `ELEVENLABS_API_KEY`
   (cloud environment settings → secrets / environment variables; never in the repo or a chat).
2. Choose a voice: `npm run voices` lists the voices in your account plus
   Nigerian-accent voices from the ElevenLabs library.
3. Generate: `ELEVENLABS_VOICE_ID=<voice id> npm run voice`
   - saves one MP3 per line to `public/voice/` and writes `src/voice-manifest.json`
   - lines that run long are sped up slightly (max ×1.12) to fit their scene
   - the end card stretches so the WhatsApp number is never cut off
4. `npm run render` to re-render both MP4s with the voice.

To go back to silent, set `"enabled": false` in `src/voice-manifest.json`.

**Current voice:** a single ElevenLabs recording (voice "Gemnda", Podcast Narrative),
kept in `voiceover/source/elevenlabs-full.mp3`. `python3 voiceover/fit_recording.py`
levels it to ~-16 LUFS, cuts it at the pauses into the ten scene lines and places each
on its scene; the end card stretches so the video runs 39.9 s. To use a new recording of
the same script, replace that file, adjust the cut times in `fit_recording.py` if the
pauses moved, and re-run it before `npm run render`.

Commercial use of ElevenLabs audio requires a paid ElevenLabs plan.

## Edit

| To change… | Edit |
|---|---|
| Service names / descriptions, scene timing | `src/theme.ts` (`SERVICES`, `T`) |
| Colours | `src/theme.ts` (`C`) |
| Positions and sizes per format | `src/layout.ts` |
| The line's shape in each scene | `keyframes()` in `src/wave.ts` |
| Phone, address, hours | `src/scenes/CTA.tsx` |
| Scene artwork | `src/scenes/*.tsx` |

## Preview and render

```sh
cd neuromed-video
npm install
npm run studio     # live preview in the browser
npm run stills     # review frames → stills/
npm run render     # both MP4s → out/
```

On a cloud session the preinstalled headless Chromium is used automatically
(see `remotion.config.ts`); elsewhere Remotion downloads its own browser.

## Credits and licences

- Fonts: Geist and Geist Mono by Vercel, SIL Open Font License 1.1 (bundled in `public/fonts/`).
- Logo: Neuromed Clinic's own.
- All illustrations and animation are original to this project. No stock footage, no audio.
- Remotion is free for individuals and companies of up to 3 people; larger companies
  need a Remotion company licence (https://www.remotion.dev/license).
