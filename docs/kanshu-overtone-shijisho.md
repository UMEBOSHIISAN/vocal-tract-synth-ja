# 指示書：実測のつまみを倍音ボイスに足す

`docs/kanshu-overtone-gin.md`（読経の経験者への聞き取りと録音の実測）のうち、**値が測れたもの**だけを、倍音ボイスの調整つまみとして足す手順です。AI にこの文書だけを渡して作業させる前提で書いてあります。

## 決まり（先に読む）

- **既定値では音を変えません。** 足すつまみは、初期値のままなら今と同じ音になります。実測の値は「実測の値」ボタンを押したときだけ入ります。既定の音はオーナーが 2026-11-10 に確認済みなので、変えるかどうかはオーナーが決めます。
- **上から順に、1手順ずつ**やります。手順の中の置き換えは全部やってから確認します。
- 置き換えは、**「探す」の文字列をファイルの中で探し、「置き換える」の文字列にそのまま差し替える**だけです。字下げ（行頭の空白）も含めてそのまま使います。
- 「探す」の文字列は、ファイルの中に**ちょうど1か所**あります。0か所または2か所以上なら、**そこで止めて報告**します。似た場所を自分で探して直さないでください。
- 行番号は目安です（コミット `d04ed3b` の `index.html`）。前の手順で行が増えるので、行番号ではなく文字列で探します。
- 各手順の「確認」が通ったら、その手順だけを commit します。通らなければ、その手順の変更を元に戻して報告します。
- **この文書に書いていない変更はしません。** 既存の値、既存の試験、ほかの関数は触りません。「やらないこと」の節にあるものは実装しません。

毎回の確認に使うコマンド：

```bash
node --test tests/*.test.cjs
```

作業の前に一度走らせ、`pass 43`・`fail 0` であることを確かめます。違っていたら、作業を始めずに報告します。

## 足すつまみ

| 名前 | 意味 | 初期値（今と同じ音） | 実測の値 |
|---|---|---|---|
| `f0Midi`（既存） | 声の高さ | 43（98Hz） | 53（175Hz。実測は約180Hz） |
| `snap` | F2 を倍音に合わせるか | 1（合わせる） | 0（合わせない） |
| `root` | 舌の根。F2 と F3 を母音と切り離して動かす | -0.1（使わない） | -0.1（ふだんの読経では使わない） |
| `rise` | 読み始めから終わりまでに上がる量（セント） | 0 | 83 |
| `vibCents` | 声の揺れの幅（±セント） | 0 | 50 |
| `vibRate` | 声の揺れの速さ（回/秒） | 5.5 | 5.5 |

`root` は 0 で F2＝1000Hz・F3＝3500Hz、1 で F2＝2300Hz・F3＝2500Hz です（母音「あ」を約180Hz で伸ばした録音の実測）。

---

## 手順1：値を置く場所を足す

ファイル：`index.html`（965行目あたり）

探す：

```js
        overtone: { f0Midi: 43, bw: [150, 25, 220], gains: [0.8, 4.2, 0.35], lpf: 5200, noise: 0.2, hop: 0.008 },
```

置き換える：

```js
        overtone: { f0Midi: 43, bw: [150, 25, 220], gains: [0.8, 4.2, 0.35], lpf: 5200, noise: 0.2, hop: 0.008,
                    snap: 1, root: -0.1, rise: 0, vibRate: 5.5, vibCents: 0 },
```

確認：`node --test tests/*.test.cjs` が `pass 43`・`fail 0`。

## 手順2：計算する関数を2つ足す

ファイル：`index.html`（1005行目あたり。`function otSnap` のすぐ下）

探す：

```js
      var speakerKey = "male";
```

置き換える：

```js
      /* 監修（2026-11-16）のつまみ。既定値では従来と同じ結果を返す。docs/kanshu-overtone-shijisho.md */
      function otVowelF(f, f0, ot) {
        var g = f;
        if (ot.root >= 0) g = [f[0], 1000 + 1300 * ot.root, 3500 - 1000 * ot.root];
        return ot.snap ? otSnap(g, f0) : g;
      }
      function otRise(segs, cents, snap) {
        if (!cents) return segs;
        var total = segs.reduce(function (a, s) { return a + s.dur; }, 0), acc = 0;
        segs.forEach(function (s) {
          var k = Math.pow(2, cents * (total ? acc / total : 0) / 1200);
          acc += s.dur;
          s.f0a = s.f0a * k; s.f0b = s.f0b * k;
          if (snap && s.type === "vowel" && s.f) s.f = [s.f[0], s.f[1] * k, s.f[2]];
        });
        return segs;
      }
      var speakerKey = "male";
```

確認：`node --test tests/*.test.cjs` が `pass 43`・`fail 0`。

## 手順3：読経の譜面づくりで、その関数を使う

ファイル：`index.html`（`function buildChantScore` の中。置き換えは2つ）

探す（1つ目）：

```js
            segment(dur - used, "vowel", gi, VPOSE[m.vowel], otSnap(f, f0),
```

置き換える（1つ目）：

```js
            segment(dur - used, "vowel", gi, VPOSE[m.vowel], otVowelF(f, f0, ot),
```

探す（2つ目）：

```js
        pause(0.18);
        return segs;
```

置き換える（2つ目）：

```js
        pause(0.18);
        return otRise(segs, ot.rise, ot.snap);
```

確認：`node --test tests/*.test.cjs` が `pass 43`・`fail 0`。

## 手順4：声の揺れを足す

声の高さを、ゆっくりした波（1秒に `vibRate` 回、幅 ±`vibCents` セント）で揺らします。幅の初期値は 0 なので、既定では揺れません。

ファイル：`index.html`（置き換えは5つ）

探す（1つ目。`buildGraph` の中）：

```js
        osc.connect(oscGain); oscGain.connect(lp);
```

置き換える（1つ目）：

```js
        osc.connect(oscGain); oscGain.connect(lp);
        var vib = ctx.createOscillator(); vib.type = "sine"; vib.frequency.value = 5.5;
        var vibG = ctx.createGain(); vibG.gain.value = 0;
        vib.connect(vibG); vibG.connect(osc.detune);
```

探す（2つ目）：

```js
        osc.start(); noise.start();
```

置き換える（2つ目）：

```js
        osc.start(); noise.start(); vib.start();
```

探す（3つ目。長い行の終わりの部分）：

```js
f1: f1, f2: f2, f2b: f2b, f3: f3, nasG: nasG, noiseBP: noiseBP, noiseG: noiseG };
```

置き換える（3つ目）：

```js
f1: f1, f2: f2, f2b: f2b, f3: f3, nasG: nasG, noiseBP: noiseBP, noiseG: noiseG, vib: vib, vibG: vibG };
```

探す（4つ目。管モデルを使うときも揺れるようにする）：

```js
            node.connect(G.master); G.tube = node; G.tubeFs = ctx.sampleRate;
```

置き換える（4つ目）：

```js
            node.connect(G.master); G.tube = node; G.tubeFs = ctx.sampleRate;
            if (G.vibG && node.parameters.get("detune")) G.vibG.connect(node.parameters.get("detune"));
```

探す（5つ目。`scheduleSegG` の中）：

```js
          G.lp.frequency.setTargetAtTime(ot2 ? seg.lpf : 1250, t, 0.02);
```

置き換える（5つ目）：

```js
          G.lp.frequency.setTargetAtTime(ot2 ? seg.lpf : 1250, t, 0.02);
          if (G.vibG) {
            G.vib.frequency.setTargetAtTime(ANAT.overtone.vibRate, t, 0.05);
            G.vibG.gain.setTargetAtTime(ot2 ? ANAT.overtone.vibCents : 0, t, 0.05);
          }
```

注意：1つ目の `vib.frequency.value = 5.5` を `ANAT.overtone.vibRate` に書き換えないでください。既存の試験は `ANAT.overtone` のない環境で `buildGraph` を呼ぶので、試験が落ちます。

確認：`node --test tests/*.test.cjs` が `pass 43`・`fail 0`。

## 手順5：つまみを画面に足す

ファイル：`index.html`（2795行目あたり。`var OT_CTL = [` の最後の行）

探す：

```js
        { k: "lpf", lab: "音源の高域上限 (Hz)", min: 1500, max: 8000, step: 100, get: function (o) { return o.lpf; }, set: function (o, v) { o.lpf = v; } }
      ];
```

置き換える：

```js
        { k: "lpf", lab: "音源の高域上限 (Hz)", min: 1500, max: 8000, step: 100, get: function (o) { return o.lpf; }, set: function (o, v) { o.lpf = v; } },
        { k: "f0", lab: "声の高さ (MIDI。43=98Hz／50=147Hz／53=175Hz)", min: 36, max: 57, step: 1, get: function (o) { return o.f0Midi; }, set: function (o, v) { o.f0Midi = v; } },
        { k: "snap", lab: "F2 を倍音に合わせる (0=しない／1=する)", min: 0, max: 1, step: 1, get: function (o) { return o.snap; }, set: function (o, v) { o.snap = v; } },
        { k: "root", lab: "舌の根 (-0.1=母音まかせ／0=広い／1=狭い)", min: -0.1, max: 1, step: 0.1, get: function (o) { return o.root; }, set: function (o, v) { o.root = v; } },
        { k: "rise", lab: "読むうちに上がる量 (セント)", min: 0, max: 600, step: 1, get: function (o) { return o.rise; }, set: function (o, v) { o.rise = v; } },
        { k: "vibCents", lab: "声の揺れの幅 (±セント)", min: 0, max: 80, step: 5, get: function (o) { return o.vibCents; }, set: function (o, v) { o.vibCents = v; } },
        { k: "vibRate", lab: "声の揺れの速さ (回/秒)", min: 3, max: 8, step: 0.1, get: function (o) { return o.vibRate; }, set: function (o, v) { o.vibRate = v; } }
      ];
```

確認：`node --test tests/*.test.cjs` が `pass 43`・`fail 0`。

## 手順6：「実測の値」ボタンを足す

ファイル：`index.html`（置き換えは3つ）

探す（1つ目。630行目あたりの HTML）：

```html
<button class="preset-chip" id="otReset" type="button">初期値に戻す</button>
```

置き換える（1つ目）：

```html
<button class="preset-chip" id="otReset" type="button">初期値に戻す</button><button class="preset-chip" id="otMeasured" type="button">実測の値（1人・2026-11-16）</button>
```

探す（2つ目）：

```js
      var OT_DEFAULT = JSON.parse(JSON.stringify(ANAT.overtone));
```

置き換える（2つ目）：

```js
      var OT_DEFAULT = JSON.parse(JSON.stringify(ANAT.overtone));
      /* 読経の経験者1人の録音（2026-11-16）から置いた値。bw と gains は実測ではなく「倍音を強調しない」ための、通常の歌に近い値（つまみの刻みに合わせてある） */
      var OT_MEASURED = { f0Midi: 53, bw: [80, 95, 130], gains: [1, 0.5, 0.2], snap: 0, root: -0.1, rise: 83, vibRate: 5.5, vibCents: 50 };
```

探す（3つ目）：

```js
          Array.prototype.forEach.call(grid.children, function (r) { r._reset(); }); show();
        });
```

置き換える（3つ目）：

```js
          Array.prototype.forEach.call(grid.children, function (r) { r._reset(); }); show();
        });
        document.getElementById("otMeasured").addEventListener("click", function () {
          Object.assign(ANAT.overtone, OT_MEASURED, { bw: OT_MEASURED.bw.slice(), gains: OT_MEASURED.gains.slice() });
          Array.prototype.forEach.call(grid.children, function (r) { r._reset(); }); show();
        });
```

確認：`node --test tests/*.test.cjs` が `pass 43`・`fail 0`。

## 手順7：試験を足す

新しいファイル `tests/kanshu-overtone.test.cjs` を、次の中身そのままで作ります。

```js
"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const c=vm.createContext({});
vm.runInContext(html.match(/function otSnap\(f, f0\)[\s\S]*?(?=      var speakerKey)/)[0],c);
const base={snap:1,root:-0.1};
test("defaults keep the old result",()=>{
 assert.deepEqual(Array.from(c.otVowelF([700,1200,2500],98,base)),Array.from(c.otSnap([700,1200,2500],98)));
 const segs=[{dur:1,f0a:98,f0b:98,type:"vowel",f:[700,1176,2500]}],before=JSON.stringify(segs);
 assert.equal(JSON.stringify(c.otRise(segs,0,1)),before);
});
test("snap off leaves the vowel formants",()=>{
 assert.deepEqual(Array.from(c.otVowelF([700,1200,2500],98,{snap:0,root:-0.1})),[700,1200,2500]);
});
test("tongue root moves F2 up and F3 down, F1 stays",()=>{
 const lo=c.otVowelF([700,1200,2500],180,{snap:0,root:0}),hi=c.otVowelF([700,1200,2500],180,{snap:0,root:1});
 assert.deepEqual(Array.from(lo),[700,1000,3500]);assert.deepEqual(Array.from(hi),[700,2300,2500]);
 const sn=c.otVowelF([700,1200,2500],180,{snap:1,root:0.5});
 assert.equal(sn[1]%180,0);assert.equal(sn[2],3000);
});
test("rise lifts pitch over the piece and keeps the same harmonic",()=>{
 const segs=[{dur:1,f0a:100,f0b:100,type:"vowel",f:[700,1000,2500]},{dur:1,f0a:100,f0b:100,type:"vowel",f:[700,1000,2500]},{dur:2,f0a:100,f0b:100,type:"pause",f:[700,1000,2500]}];
 c.otRise(segs,1200,1);
 assert.equal(segs[0].f0a,100);
 assert.ok(Math.abs(segs[1].f0a-100*Math.pow(2,0.25))<1e-9);
 assert.ok(Math.abs(segs[1].f[1]/segs[1].f0a-10)<1e-9);
 assert.ok(Math.abs(segs[2].f0a-100*Math.pow(2,0.5))<1e-9);assert.equal(segs[2].f[1],1000);
});
test("new fields and controls exist with defaults that change nothing",()=>{
 assert.match(html,/snap: 1, root: -0\.1, rise: 0, vibRate: 5\.5, vibCents: 0 \}/);
 for(const k of ["f0","snap","root","rise","vibCents","vibRate"])assert.ok(html.includes('{ k: "'+k+'"'),k);
 assert.ok(html.includes('id="otMeasured"'));
});
```

確認：`node --test tests/*.test.cjs` が `pass 48`・`fail 0`。

## 手順8：README の2か所を直す

ファイル：`README.md`（置き換えは2つ）

探す（1つ目）：

```text
元の助言の「半分」は周波数を半分にする意味と解釈した設計判断です。
```

置き換える（1つ目）：

```text
「半分」と49Hzは経験者の助言にはなく（2026-11-16 に本人へ確認）、合成上の設計判断です。
```

探す（2つ目）：

```text
Node 43件が通過
```

置き換える（2つ目）：

```text
Node 48件が通過
```

確認：`node --test tests/*.test.cjs` が `pass 48`・`fail 0`。

## 最後に人が確かめること

試験が確かめるのは計算だけです。**音は人が聞いて確かめます。** AI は「音が正しい」と報告しないでください。

画面の文字と数値で判定できる、くわしい手順は `docs/kanshu-overtone-test.md` にあります。下の5つは、その要点です。

1. ブラウザで `index.html` を開き、歌モードで「般若心経」を選ぶ。
2. 何も触らずに再生する。**今までと同じ音**であること。
3. 「実測の値」を押して再生する。声が高くなり、笛のような倍音が消え、声がゆっくり揺れること。
4. 「初期値に戻す」を押して再生する。2 と同じ音に戻ること。
5. 「F2 を倍音に合わせる」を 1 にし、「舌の根」を 0 から 1 へ動かして、そのつど再生する。倍音の高さが母音によらず上がること。

つまみは、**次に再生を始めたとき**に効きます（「声の揺れ」の2つは再生中にも効きます）。

## わかっている限界

- 画面の解説文は「F0 98Hz」のままです。声の高さのつまみを動かしても書き換わりません。
- 合唱では、全員に同じ揺れがかかります。何人かで読んだときの揺れは測っていません。合唱で使うなら「声の揺れの幅」は 0 のままを勧めます。
- 「読むうちに上がる量」は、全体を通して一定の割合で上がります。実測（3分半で 142Hz→149Hz）を直線で近似したものです。
- 実測は、一人が、一つの部屋で、1回ずつ録ったものです。読経一般の値ではありません。

## やらないこと（実装しない）

次のものは、値が測れていないか、仮説の段階です。この指示書では足しません。

- **既定値の変更。** 初期の音を実測に寄せるかどうかは、オーナーが聞いて決めます。
- **1字の長さ（0.58秒）の変更。** 実測の「0.73秒」は、字数を 262字と仮定した値で、字数を確かめていません。
- **2700Hz と 3500〜3800Hz の動かない帯。** 場所は測れていますが、強さを合わせるには、書き出した音を測って調整する往復が要ります。
- **合唱の高さを耳で合わせる仕組み、低音合唱の 49Hz の変更。** 聞き取りだけで、測っていません。
- **句の頭のすくい上げ、息継ぎの置き方。** 譜面のどこが句の頭にあたるかを確かめていません。
- **鼻への抜き、腹の支えのつまみ、管モデルでの確かめ。** 仮説です。
