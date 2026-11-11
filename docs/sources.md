# SOUND LAB：出典・使い方・近似の境界

2026-11-11 の開発途中版。アプリは [index.html](../index.html)、検証状況は [verification.md](verification.md) を参照。

**論文の存在・書誌の確認、本文の確認、実装の検証、聴感の評価は別です。** このページで一次文献の本文を未読と記したものを、数値の裏づけとして扱いません。既存の解剖定数や経文・楽曲の出典は [README の出典一覧](../README.md#出典一覧) に残しています。

## まず聴き比べる

1. 原音を確認してから「倍音2本」「倍音3本」を選ぶ。声源は `pulse`、追加帯域は既定プリセットで第4・6・10倍音。次数・重み・ミックス・帯域幅を個別に変えられます。
2. 合唱人数と「独立ゆらぎ」を変える。同じ設定・seedなら同じ変動列になります。描画人数と独立した合成音声の数は同じではなく、音声はデュエットを含め最大12系統です。
3. 同じ声源・倍音条件で、空間だけを OFF→小堂→大堂へ変える。「明瞭な小堂」「包まれる大堂」の全体プリセットは声源・倍音・ゆらぎも変えるため、部屋だけの比較には空間の個別選択を使ってください。
4. 次の再生・WAVで設定を比較する。音量は自動で聴感上の大きさを揃えていません。小さい音量から始めてください。

SOUND LABの追加帯域は両エンジンの出力へ掛ける設計ですが、新しい管モデル経路のnative統合検証は未完了です。従来の「倍音ボイス」のF2帯域幅調整は別機能で、管モデル自身の損失・帯域幅を変更するものではありません。

## 実装と資料の対応

| 対象 | 読んだ／照合した範囲 | 今回の採用と限界 |
|---|---|---|
| Web Audio API | W3C Recommendation の関連するAPI仕様を本文確認。[1] | `PeriodicWave`、`BiquadFilterNode`、`ConvolverNode`、`AudioParam`、`OfflineAudioContext`を使用。仕様の確認はブラウザ実装の全条件の動作保証ではありません。 |
| 複数倍音・声道共鳴 | Sundberg, Lindblom, Hefele の ASA 解説本文を確認。実際の倍音唱法における声道共鳴の説明を参照。[2] | 整数倍音を選ぶ最大3本の並列バンドパス。生体のF2/F3が融合する二重フォルマントそのものや、その解剖学的再現ではありません。 |
| 声源パルス | Rosenberg原著はCrossref登録要旨・書誌まで。Praatの書誌も確認。原著本文の式・数値は未照合。[6][11] | 従来コードの開放／閉鎖パルスを音源選択へ拡張。開放比・閉鎖比は音作りの設定で、論文の実測値や最良値ではありません。 |
| 合唱の個別変動 | Ternström原著は書誌確認のみ。Hyodoらは序論・関連研究など本文の一部を確認。[13][10] | 声別seedの滑らかなpitch/gain変動。人間の相互聴取・相互同期を学習したモデルではなく、DNNや学習データも使っていません。 |
| 反射・合成残響 | Allen–BerkleyはCrossref登録要旨・書誌まで。原著本文・FORTRAN実装は未確認。[17] | 矩形室の一次鏡像6経路と独自の後期残響近似。完全な高次image法、実在する壁材の同定、実測寺院IRの移植ではありません。 |
| 日本の読経 | Soetaらのリポジトリ投稿原稿本文を確認。出版書誌はCrossrefでも照合。[4][15] | 読経を普通の話声と同じに扱わないための背景資料。対象は浄土真宗の表白・念仏和讃・御文であり、般若心経のF0・帯域幅・最適な室を直接決める資料ではありません。 |

## パラメータの由来

以下は**この実装の定義／工学的仮置き値**です。上記論文の被験者平均、日本人の生理実測値、宗派固有の特性として引用していません。

### 声源・倍音

- `classic` は従来音源、`pulse` は開放／閉鎖の山形パルスから作る周期声源です。共鳴3本方式はFourier係数から `PeriodicWave` を作り、管モデルはworklet内でパルスを生成します。両者の最終波形が標本ごとに同一という意味ではありません。
- 波形キャンバスは**声源モデルの1周期の近似図**。録音、声門の実測、合唱・残響まで通った出力波形ではありません。
- コアの初期値は開放比0.4・閉鎖比0.16。追加倍音プリセットでは閉鎖比0.08。医学的な最適性は示していません。
- 同じ次数は統合し、レベル0は除外、設定サンプルレートの0.48倍以上になる帯域は生成しません。帯域幅つまみは `Q = 周波数 / 幅` で与える目安で、全周波数で実測した厳密な −3dB 幅ではありません。
- 3Dの星・次数表示は目標値のマーカー。出力スペクトルのFFTと、目標／近似図を混同しないでください。

### 合唱

- 最大設定量でpitchは±12 cents、gainは1±0.08の範囲。乱数列を滑らかにつなぐDSP上の設定で、人間の合唱を測った分布・標準偏差ではありません。
- 既存の声道長・固定detune・出だしのずれに、時間変化を追加しています。全員共通の1本のLFOではありません。
- 他の歌い手を聴いて修正する相互作用、呼吸の協調、子音の相互タイミング、独立した108人の声は未実装です。

### 仮想空間

- 小堂は8×10×4m、大堂は14×20×7mの仮想矩形室。音速350m/s、音源／受音点の高さ1.2mなども今回の仮置きで、実寺院の採寸値ではありません。
- 直接音の距離を基準に、鏡像距離との差を音速で割って6本の反射の相対遅延を求めます。後期残響は距離差に応じた開始時刻を持つ合成ノイズです。
- 低域と高域を分け、高域の包絡を早く減衰させる近似。反射の強さ、1200Hzの分割目安、mix、dampingは壁材や空気吸収の測定結果ではありません。
- 「RT60」つまみは包絡のパラメータです。振幅包絡が設定時間で1/1000になる式を使いますが、直接音・初期反射を含む生成IR全体の実測RT60や、ISOに基づく室測定の結果を保証しません。
- roomのノイズseedは固定で、合唱のseedから分離。全員が同じroom busへ入り、合唱人数分だけ残響器を重ねません。STOPで古いtailを破棄し、WAVには末尾領域を確保します。
- **「唯一のベスト空間」は決めていません。** 小堂／大堂は明瞭さと残響の比較用プリセット。C50/C80・EDT・STIの測定、現地評価、HRTF、実スピーカー／聴取室の校正は未実施です。

## 文献と公開先

### API仕様

**W3C (2021), Web Audio API, Recommendation, 17 June 2021.** 関連APIの仕様本文を確認。[1]

### 倍音唱法

**Johan Sundberg, Björn Lindblom, Anna-Maria Hefele (2021), “One Singer, Two Voices,” Acoustics Today 17(1), 43–50.** ASAの公開PDFを本文確認。解説記事であり、別誌の原著を全文確認したという意味ではありません。[2]

### 声源

**A. E. Rosenberg (1971), “Effect of Glottal Pulse Shape on the Quality of Natural Vowels,” JASA 49(2B), 583–590.** [原著DOI](https://doi.org/10.1121/1.1912389)。書誌・登録要旨まで、原著本文と本コードの式の照合は未完了。Praatは書誌の確認先で、原著全文ではありません。[6][11]

### 合唱

**Sten Ternström (1991), “Physical and acoustic factors that interact with the singer to produce the choral sound,” Journal of Voice 5(2), 128–143.** [原著DOI](https://doi.org/10.1016/s0892-1997(05)80177-8)。今回の確認はCrossref書誌まで。±12 centsや±0.08の定量根拠として使っていません。[13]

**Hiroaki Hyodo, Shinnosuke Takamichi, Tomohiko Nakamura, Junya Koguchi, Hiroshi Saruwatari (2024), “DNN-Based Ensemble Singing Voice Synthesis with Interactions Between Singers,” arXiv:2409.09988v1.** 序論・関連研究など本文の一部を確認。プレプリントとして扱い、この論文の学習法・実験結果を本アプリで再現したとは主張しません。[10]

### 室内音響

**J. B. Allen, D. A. Berkley (1979), “Image method for efficiently simulating small-room acoustics,” JASA 65(4), 943–950.** [原著DOI](https://doi.org/10.1121/1.382599)。書誌・登録要旨はCrossrefで確認。本文や原著コードの再現検証は未実施です。[17]

### 読経

**Yoshiharu Soeta, Ryota Shimokura, Yong Hee Kim, Tomohiro Ohsawa, Ken Ito (2015), “Characteristics of Buddhist chanting in Japanese temples,” Applied Acoustics 91, 73–76.** [出版版DOI](https://doi.org/10.1016/j.apacoust.2014.12.007)。本文を読んだのは島根大学の投稿原稿（APAC-D-14-00315）で、出版最終版の同一性を確認したものではありません。[4][15]

## 取得できなかった資料・未完了の照合

- 調査候補のActa Acustica記事はHTTP403で本文取得できず。今回の実装を支持する本文根拠に使っていません。
- 取得途中でtimeoutしたISMIR 2016の候補PDFは、本文読了・証拠取得の完了として扱っていません。
- 既存の日本語母音・声道長・声帯長などの「公表平均」というコード注記は原典照合未完了です。今回の音響処理と引用整理は、それらの値や3D解剖表示の妥当性を新たに検証するものではありません。
- 書誌・引用形式の検査に合格しても、科学的妥当性・聴感・医学的受入の合格にはなりません。

<!-- Sources below are generated from the task citation ledger. -->

## Sources

[1] https://www.w3.org/TR/2021/REC-webaudio-20210617
[2] https://acousticstoday.org/wp-content/uploads/2021/03/One-Singer-Two-Voices-Johan-Sundberg.pdf
[4] https://ir.lib.shimane-u.ac.jp/38392/files/5023
[6] https://www.fon.hum.uva.nl/praat/manual/Rosenberg__1971_.html
[10] https://arxiv.org/pdf/2409.09988
[11] https://api.crossref.org/works?query.bibliographic=Effect+of+Glottal+Pulse+Shape+on+the+Quality+of+Natural+Vowels&rows=1
[13] https://api.crossref.org/works?query.bibliographic=Physical+and+acoustic+factors+that+interact+with+the+singer+to+produce+the+choral+sound&rows=1
[15] https://api.crossref.org/works/10.1016/j.apacoust.2014.12.007
[17] https://api.crossref.org/works/10.1121/1.382599
