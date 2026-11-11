# 開発checkpointの検証記録

2026-11-11。対象appはcommit `7a2798ce3dcabdb4e1a19eb800644684ce936079`。
`index.html` のSHA-256は `8d17e0a73f512a415c8a6b9518a3fd142ffe3b656e7adcd977967f86251d31b3`。
このページと出典整備は後続のdocumentation commitで追加しています。

**自己検証（self-verified）であり、完成・外部レビュー合格・聴感受入ではありません。** データは [verification.json](verification.json)、文献と近似は [sources.md](sources.md) に分けています。

## コード上の試験

```sh
node --test tests/*.test.cjs
```

実行時は17試験成功。inline JavaScriptの `node --check` と `git diff --check` もexit 0。
[試験ファイル](../tests) は以下です。

- playback-loop：STOP後のループ予約取り消し、明示的な新規再生、通常ループの維持。
- quality-core：設定正規化、整数倍音の重複／Nyquist外の除外、周期パルス、独立seedと変動範囲、反射geometryと合成IR。
- quality-routing：共有scene、convolverの差替え、voice→roomの経路、WAVのtail領域。

routingは簡略なAudioContext/AudioParamの代役を使う部品試験を含みます。native Web Audio、スピーカー、全UI操作の代わりにはしていません。

## native OfflineAudioContext：manual/formant

44.1kHz、母音「あ」、F0=118Hz、pulse開放比0.4／閉鎖比0.08。独立ゆらぎは0。追加帯域は第6・10・14倍音、重みは各1、mix 0.9、帯域幅の目安30Hzです。これは標準プリセットの第4・6・10倍音とは異なる**計測用の条件**です。

出力はAudioContext/OfflineAudioContext自身が計算した未正規化Float32 PCM。ライブ出力は音量0の下流ノードへ迂回し、WAVのFloat32値を16bit符号化前に計測しました。マイク・スピーカーから録音した実測音ではありません。

| 条件 | 秒 | 全長RMS | peak | nonfinite | clip候補 | 1.5–1.8秒RMS |
|---|---:|---:|---:|---:|---:|---:|
| pulse-dry | 1.23 | 0.034307644 | 0.101353168 | 0 | 0 | 0.000000000 |
| three-partials | 1.23 | 0.010713189 | 0.021992028 | 0 | 0 | 0.000000000 |
| room-small | 3.01 | 0.016470948 | 0.074529052 | 0 | 0 | 0.000441387 |
| room-hall | 4.53 | 0.011398680 | 0.067171693 | 0 | 0 | 0.001673204 |

clip候補は `abs(sample) >= 1`、非有限値はNaN/Infinity。room行は追加倍音OFFで空間だけを変更し、小堂はRT設定1.4秒・wet 0.24、大堂はRT設定2.6秒・wet 0.34。各presetの寸法・dampingも異なります。末尾の非ゼロ値は**tailの存在**の確認であり、RT60の実測一致や音の良さの証明ではありません。

### 倍音の限定比較

0.3秒から最大0.5秒をHann窓で切り出し、F0の整数倍のDFT振幅を求めました。対象倍音の振幅を両隣の倍音の振幅平均で割った値について、追加帯域ON/OFFの変化をdBで比較しています。

| 対象の次数 | 隣接倍音に対するコントラストの変化 |
|---|---:|
| 6 | 11.179529 dB |
| 10 | 11.154184 dB |
| 14 | 11.304748 dB |

3条件とも3dBを超えることをassertしました。**全体音量の増加を表す値ではありません。** 実際にON側の全長RMSは小さく、聴感上の音量合わせもしていません。この数値を新しい標準プリセット、全母音、全F0、管モデル、合唱へ一般化しません。

### 手動で追試する条件

1. manualで「あ」、F0を118Hzにする。「倍音3本」から次数だけ6/10/14に変更し、source pulse、open 0.4、close 0.08、mix 0.9、幅30、human 0、room OFFを確認。
2. 追加倍音OFFのWAVとONのWAVを書き出す。
3. 追加倍音をOFFに戻し、空間の個別選択を小堂／大堂へ変えて、それぞれWAVを書き出す。全体プリセットを変えると別条件になります。
4. 同じ窓・DFT・clip規則でPCMを解析する。ブラウザ実装の違いによる微小な数値差はあり得ます。

## 未検証・未受入

- 新しい管モデルと追加帯域・独立ゆらぎ・空間を合わせたnative経路。
- 新しい合唱変動のnative統合、全曲／最大合唱、全てのUI切替え、3Dの見た目の最終確認。
- ヘッドホン／スピーカーでの本人の聴感、知覚的な音量合わせ、ハードウェア録音。
- 実測寺院IR・HRTF・C50/C80・EDT/STI、全生成IRの実測RT60。
- 既存の生理・解剖定数の原典照合、医学的受入。

コード実装後の独立レビューは利用上限で結果を得られていません。PASSと表記せず、WIPとして保存しています。本番mainへのmerge・リリース・デプロイはこの保存に含めません。
