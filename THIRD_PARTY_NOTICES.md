# Third-party notices / 第三者資料と権利の範囲

The MIT license in `LICENSE` applies to the original software and documentation contributed to this project. It does not grant rights in third-party works, modern editions/translations, recordings, trademarks, or the optional owner media. No worldwide legal clearance is asserted.

`LICENSE` は本プロジェクトの独自ソフトウェア・文書へのMIT許諾です。第三者作品、現代の版・翻訳・録音、商標、別扱いの動画の権利を新たに与えるものではありません。全世界での権利確認済みという主張はしません。

## Chimera inspiration and copied demo data

- Project: [jamesondh/chimera-vocal-synth](https://github.com/jamesondh/chimera-vocal-synth)
- Author: Jameson Hodge.
- The synthesizer here is an independent implementation inspired by Chimera, not a port of its full acoustic engine.
- `Made of air` and `Twinkle, twinkle` note/beat data and the source English lyrics are adapted from [`crates/chimera/src/phonetics/songs.rs`](https://github.com/jamesondh/chimera-vocal-synth/blob/cd98192b421dcbbe0738798f6ef7f56ca9ed9ac3/crates/chimera/src/phonetics/songs.rs).
- License and data were checked at revision `cd98192b421dcbbe0738798f6ef7f56ca9ed9ac3`. Upstream identifies Made of air as original and Twinkle as traditional/public domain. The upstream license is reproduced verbatim below and inside `index.html`, so an HTML-only copy retains it.
- Japanese mora substitutions approximate the English syllables; they are not authentic English pronunciation. Song pitch is retained rather than applying upstream's speaker-dependent octave selection.

```text
MIT License

Copyright (c) 2026 Jameson Hodge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Other content / その他のコンテンツ

| Material | Provenance and boundary |
|---|---|
| Furusato / ふるさと | Credited to lyricist Tatsuyuki Takano and composer Teiichi Okano; a historical Japanese school song. The existing kana/score implementation is retained. No modern recording, score engraving or accompanying performance is bundled. This is not an assertion of worldwide public-domain status. See the [model/source notes](docs/model-notes.ja.md) and the [National Diet Library reference record](https://crd.ndl.go.jp/reference/entry/index.php?id=1000019084&page=ref_view), which identifies the authors and records their life dates. |
| Heart Sutra / 般若心経 | Ancient Chinese text in the Xuanzang tradition, rendered with a traditional Japanese reading and mantra transliteration. Source links are documented in the [model/source notes](docs/model-notes.ja.md). The project does not relicense modern editions, annotations, translations, PDFs or recordings. The reading/timing and chant voicing are a synthesis approximation, not an official ritual edition. |
| SHOO BEE DOO and scale scat exercise | Synthetic exercise data in this app; no recorded singer is embedded. The scale exercise replaces a recording-derived demo whose redistribution permission was not established. The legacy internal song ID `honke` is retained only for control compatibility. |
| Twinkle solfege | Uses do/re/mi syllables over the same upstream pitch/beat sequence. The former modern Japanese lyric translation was excluded because its permission was not established by the upstream software license. |
| Fonts and illustrations | System fonts only. SVG/canvas drawings are programmatic schematics; no remote font, anatomy scan, third-party illustration, MRI dataset, downloaded paper, or real room impulse response is included in the standalone app. |
| `media/` | Optional owner-generated demonstration media already in the repository; excluded from the small release candidate ZIP and outside the license grant made by this notice. Check with the owner before redistributing those files. |

### Current tree versus Git history

The current candidate removes the unconfirmed Japanese Twinkle lyric and the recording-derived scat data. Earlier repository commits may still contain them. This preparation does **not** rewrite shared Git history, and the release ZIP is built from an explicit current-file allowlist, not from a Git bundle or historical archive. Do not treat this notice as permission to redistribute excluded historical content.

今回の候補のHTMLと配布ZIPから、許諾を確認できない日本語訳詞と録画由来のスキャットデータを除外しました。既存Git履歴は書き換えていません。除外した過去素材をこのMIT許諾で再配布できるとは解釈しないでください。

## References are not bundled assets

Clickable source links are citations, not copied source publications or automatic network requests. References and anatomy/acoustics assumptions are separated in [docs/sources.md](docs/sources.md) and [docs/model-notes.ja.md](docs/model-notes.ja.md). Neither a public webpage nor this project license grants permission for an unrelated recording or modern arrangement.
