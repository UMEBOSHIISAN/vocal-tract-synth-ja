# 公開候補の検証 / Verification scope

この資料は今回の**技術的な検査範囲**です。リリース承認、医学的妥当性、全世界での第三者権利clearanceを意味しません。古い検証記録は [model-notes.ja.md](model-notes.ja.md) と各履歴文書に分けています。

- 測定日: 2026-11-14（JST）。検査実行と集計は実装者による **self-verified**。
- 対象 `index.html` SHA-256: `995d95a0f510151443f97f85748ded0e4fee35036babbbf9eaf6fe44032d0494`
- ブラウザ: **Chrome/157.0.8103.52 / HeadlessChrome**。実デバイスの操作・聴感確認ではありません。
- Node: **v24.22.1**。ビルドやnpmパッケージのインストールは不要です。
- 構成・数値・保存WAVのハッシュは [release-readiness.json](release-readiness.json) にあります。所有者用の生ログ・レビュー入力・ローカル絶対パスは公開用資料へ含めません。

## 確認したこと

| 項目 | 観測結果 |
|---|---|
| 回帰試験 | `node --test tests/*.test.cjs`、**63/63 PASS**、exit 0。失敗・取消・skipは0。旧baseline36件も維持。 |
| JS構文 | 単一inline scriptの抽出数を1とassertし、全体を `vm.Script` でcompile。 |
| 単体HTMLの起動 | `file:` の英語UIとlocalhost HTTPの起動を確認。どちらも初期AudioContextなし、観測した初期外部HTTP(S) resourceなし。管モデルの音声検査はlocalhostで実施。 |
| ブラウザ自動翻訳 | app所有の言語切替を上書きしないよう `translate="no"` とChrome向けmetaを追加。検査profileで生じていた `translated-ltr` / 注入font要素は再検査時に0。 |
| 小画面 | JA/EN × 320/390/1280 CSS px ×4 modes×4 visualization tabs、**96 unique cases / failure0**。最大108人の表示設定も含む。rootと対象controlの横はみ出し・設定だけでのAudioContext生成なし。実スマホ試験ではない。 |
| 再生と言語 | manual/12声を両engineで実再生。管モデルは実AudioWorkletとroute flagも確認。再生中の同じsegmentでEN→JA→ENしてcontext/animation/generation/display keyを保持。 |
| 試聴とWAVの分離 | 導師以外の一人だけを試聴して全員へ戻るgainを確認。一人の選択を保持した12声offline生成でも全graphにlive試聴gateがなく、管モデル12 nodeを確認。 |
| 内容置換 | 独立音階スキャットとTwinkleソルフェージュを実際の選曲・再生controlから短時間再生。nonzero/finite/no-clipのanalyser windowを確認。 |
| エラーと排他 | 単体/一括の相互排他、false/reject/同期throw、post-render encode/URL/提出失敗とbatch途中件数を回帰。実ブラウザでもencode失敗を意図的に起こし、保存ファイル増加なし・両button復帰・英語エラー表示・unhandled errorなしを確認。 |
| 入力保護 | 読めない入力を可視表示し、`<` / `&` / 漢字を含む入力を言語切替でも保持。エラー表示に要素として注入しない。 |
| 配布条件 | 所有者MITとChimeraの必要なMIT全文をHTML内にも保持。外部font/preconnectなし。未確認の現代日本語訳詞と録画起こしを現行demoで置換。 |

## Native PCMと保存WAV

同じソースの**native OfflineAudioContext出力をWAV化する前**に全channelを検査し、非有限値と `abs(sample) >= 1` はすべて0でした。保存された4 WAVも別に開き、44.1kHz/16bit PCM、channel数、frame数、全channelの非zero RMS/clip0、stereoの左右差、bytes/SHA-256を検査しています。ブラウザへの保存要求だけを保存成功の証拠にはしていません。

| 条件 | ch | frames | 秒 | offline worklet数 | Float32 peak（ch順） |
|---|---:|---:|---:|---:|---|
| `manual-tube-ui` | 1 | 54,243 | 1.230000 | 1 | 0.272098 |
| `manual-formant-ui` | 1 | 54,243 | 1.230000 | 0 | 0.341777 |
| `12voice-tube-short-fixture` | 2 | 132,962 | 3.015011 | 12 | 0.328685 / 0.253624 |
| `12voice-formant-short-fixture` | 2 | 132,962 | 3.015011 | 0 | 0.198904 / 0.230741 |

- Manual: fresh defaultのclassic声源、F0 118Hz、VTL 15.8cm、追加倍音/個別ゆらぎ/roomはoff。
- 12声: 「十二人の堂 — おすすめ」のpulse声源、倍音4/6/10、human amount0.65・seed20261111、合成room rt1.4/wet0.22。設定は `qualityConfig(ANAT.quality)` を通して非同期render前に記録しています。
- 12声は各scoreの**先頭1.2秒だけの検査用抜粋**です。通常のapp envelope・voice delay・room tailを残して約3.015秒。後処理の音量正規化や追加fadeは行っていません。全文・全曲の書き出し検査ではありません。
- liveは最終analyserの**後**にtest-only zero-gain sinkを置いて音を外へ出さず測定。offline destinationはmuteしていません。個々の声の自然さ、全員の音量が等しいこと、speaker再生音を測定したことは意味しません。

## 未実施・残る限界

- Safari / Firefox / 実iOS・Android、全曲・全preset・長時間・全background-tab状態、全targetを含む実ブラウザ一括保存の完走。
- 人間の聴感受入、自然な英語TTS、発音明瞭度、絶対音圧、実際の人物・寺院・身体の再現精度。
- 3Dの小さな注記は狭い領域で重なったり切れたりする場合があります。今回のlayout matrixはCanvas内の全注記配置の保証ではありません。
- 数値PASSを医学・生理・音声学の妥当性や権利の包括的許諾へ読み替えません。[第三者表記](../THIRD_PARTY_NOTICES.md)を併読してください。
- current-treeの配布物にはGit履歴、任意の `media/`、所有者ローカルの生ログ/参照資料/録画を含めません。過去Git履歴の書換えや、そこに残る素材の再配布許諾はしていません。

## 自分で確認する

リポジトリ一式で `node --test tests/*.test.cjs`。ブラウザは `python3 -m http.server 8000 --bind 127.0.0.1` で開き、音量を下げ、短いsoloから始めてください。[CONTRIBUTING](../CONTRIBUTING.md)に変更時の境界があります。検査用instrumentationは製品HTMLへ埋め込まず、owned pageだけで使い、終了後にcontext/tabを閉じています。

**English:** 63 Node regressions and 96 emulated layout cases passed. Native live/offline checks and four saved-WAV readbacks cover the exact source hash above. Choir WAVs are short laboratory excerpts, not complete performances; live audio was measured before a test-only hardware mute. This is not physical-device, human-listening, medical, universal-content-rights or release approval.
