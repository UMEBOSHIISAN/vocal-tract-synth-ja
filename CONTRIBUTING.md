# Contributing / 開発への参加

- Open `index.html`, or serve this directory with `python3 -m http.server 8000 --bind 127.0.0.1`. No build or runtime dependencies.
- Run `node --test tests/*.test.cjs` (the recorded verification uses Node 24). Add a failing regression before changing playback, cancellation, export or locale behaviour.
- Keep UI translations embedded in `UI_TRANSLATIONS`. Use explicit `uiText` / `uiHTML` and the app-owned canvas helpers for dynamic copy. Do not translate form values, kana/phonemes, scripture or input/error payloads; use `data-i18n-preserve` for content. Check JA→EN→JA and both short and long labels.
- Do not use a global DOM observer or browser/prototype patch as a translation shortcut. Preserve current controls, selection, timeline and AudioContext when switching language.
- Keep the app usable without an initial network request. External citation links are fine; new remote assets/services require a separate design decision.
- Preserve complete original and third-party MIT notices in HTML-only distributions. New demo material needs a documented source and permission; public visibility alone is not permission. Do not reintroduce excluded translations/recordings from old history.
- Model/anatomy/acoustic changes need their own evidence. Keep illustrative parameters distinct from measured data; do not weaken tests to obtain green.
- Report bugs with browser/version, mode/engine, reproducible steps and a short synthetic example. Do not upload credentials, private recordings or personal information.

日本語: 小さな変更と再現手順を歓迎します。言語切替は表示のみ、音響・解剖の変更は別に検証してください。未照合の出典を確認済みとせず、MITと第三者コンテンツの権利範囲を分離してください。現行の検証範囲は [docs/release-readiness.md](docs/release-readiness.md) を参照してください。
