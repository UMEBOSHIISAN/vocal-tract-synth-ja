# Vocal Tract Simulator — Japanese sounds, Japanese / English UI

**[日本語](README.md)** · [Sources and limitations](docs/sources.md) · [Verification scope](docs/release-readiness.md) · [Third-party notices](THIRD_PARTY_NOTICES.md)

Explore voice production with synthesized audio and moving articulators. Switch the interface between **Japanese and English** without changing the Japanese phonemes, user input, song, settings or playback. This is not speech recognition or natural English text-to-speech.

- One self-contained `index.html`: no build, npm runtime, API key, account, voice sample or microphone.
- No external fonts, CDN or analytics on initial load. Clicking a citation opens an external site.
- Formant synthesis, an experimental tube model, manual articulation, harmonic mixing, choir voices, synthetic rooms, 2D/3D views and WAV generation.
- **An approximate educational instrument**, not a medical/diagnostic tool or a reconstruction of a real person's physiology, voice, religious performance or temple.

## Quick start

1. Open `index.html` in a browser. If local-file AudioWorklet loading is unavailable, use the localhost method below.
2. **Turn down your device volume first**, then choose Pronounce. STOP ends live playback and its room tail. Nothing autoplays, but vowel, mora, word and tongue-twister buttons are also playback actions.
3. For the choir, select **Sing**, choose **Hall of Twelve — recommended**, then **▶ Pronounce**. Audition the lead or an individual singer and return to All voices.
4. Use **日本語 / English** at the top. `?lang=en` or `?lang=ja` takes priority over a valid saved preference; the default is Japanese. Denied/unavailable preference storage is harmless.

### Serve locally (the recommended verification route)

From this directory:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. Python is only an optional static server, not a build dependency. The tube engine needs AudioWorklet support and a suitable secure context such as HTTPS or localhost. If preparation fails, read the visible error and select the formant engine; the app does not silently substitute another engine for a selected tube export/start.

## Controls

| Area | Behaviour |
|---|---|
| Namamugi | A Japanese tongue twister, with individual mora/word/vowel playback. Kana stays Japanese in either interface. |
| Free input | Hiragana and katakana, not kanji-to-reading conversion or English TTS. Unsupported characters are reported as skipped input and are not translated. |
| Song | Furusato, scat/scale exercises, Twinkle, Made of air and the Heart Sutra. |
| Manual | Move articulators, then choose Start voice. STOP invalidates pending tube preparation. |
| Speaker / VTL / duet | Shared approximate model parameters, not an individual anatomical measurement. |
| Choir / 3D | Up to 108 illustrated figures, but at most 12 synthesized signal paths including duet. Selecting settings does not itself start audio. |
| Low chant | An artistic bass/fifth/octave voicing for the chant ensemble; unison is also available. Not proof of a prescribed religious tuning. |
| Sound Lab | Source shape, extra harmonics, independent variation and a synthetic room. No measured room IR, calibrated SPL or HRTF. |

Waveforms are **relative output**, and airflow/body/breathing views are schematic. The formant targets and 3D cross sections are not a single MRI-measured acoustic model. Detailed provenance, including full-text/abstract/unverified distinctions, remains in the [Japanese model notes](docs/model-notes.ja.md) and [sources](docs/sources.md).

## WAV export

Export the selected phrase/song or manual pose as 44.1 kHz / 16-bit PCM. Extra choir voices produce stereo; other output is mono. **Auditioning one singer does not remove the others from the exported WAV.**

- Single and batch export share one busy boundary. A failed batch stops at that item, reports the generated/download-requested count and restores both controls.
- A download request is not proof that a browser saved the bytes. Check your download directory and permit multiple downloads if required.
- Long songs, tube synthesis and large choirs can be expensive. Start with a short solo. Avoid changing settings during batch generation. STOP controls live audio; it does not cancel an in-progress offline render.

## License and content

Original software/documentation: **[MIT](LICENSE)**. Copied Chimera demo data retains its full upstream MIT notice, including inside the standalone HTML. Read [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for material-specific scope.

An uncleared modern Japanese Twinkle translation was replaced with solfege over the same notes/beats. A recording-derived demo was replaced with an independent scale exercise. Ancient text/historical songs, modern editions/recordings and optional owner `media/` have distinct provenance; this is not a claim of worldwide rights clearance. Shared Git history was not rewritten, and no permission to redistribute excluded historical material is implied.

## Development and evidence

```sh
node --test tests/*.test.cjs
```

No runtime package installation or build is required. See [verification scope](docs/release-readiness.md) for the actual browser/viewport/audio checks and untested devices/listening. Passing tests do not prove naturalness, phonetic accuracy or medical validity. See [CONTRIBUTING.md](CONTRIBUTING.md).
