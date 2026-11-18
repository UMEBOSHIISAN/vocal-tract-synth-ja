"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
function block(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from);
  assert.ok(from >= 0 && to > from, "missing score source: " + start);
  return html.slice(from, to);
}

// Load the same kana parser, song data and score builders used for playback and WAV.
function setup() {
  const app = vm.createContext({});
  vm.runInContext([
    block("var WORDS =", "function tubeN("),
    block("var choN =", "function choGraph("),
    block("function speakerForVtl(", "function applySpeaker("),
    block("var SINGLE_KANA =", "function applyFreeText(")
  ].join("\n"), app);
  return { app, song: app.buildSongData("hannya") };
}

test("lowering a chant part preserves vowel targets, tongue-root settings and consonants with snap off", () => {
  const { app, song } = setup();
  const ot = app.ANAT.overtone;
  ot.snap = 0;
  for (const root of [-0.1, 0.5]) {
    ot.root = root;
    const singer = app.speakerForVtl(app.CUR.vtl + app.ANAT.chorus.vtl[0]);
    const reference = app.buildSongScoreAs(song, singer);
    const bass = app.choScore(song, 1);
    const vowel = bass.findIndex(s => s.type === "vowel");
    assert.ok(bass[vowel].f0a < reference[vowel].f0a * 0.51);
    assert.equal(bass[vowel].f[1], reference[vowel].f[1], "the register transposed a vowel resonance");
    if (root === 0.5) assert.equal(bass[vowel].f[1], 1650);
    assert.deepEqual(bass.map(s => [s.type, s.mora, s.dur, ...s.f]),
                     reference.map(s => [s.type, s.mora, s.dur, ...s.f]));
  }
});

test("each chant part locks to its own nearest harmonic across vowels, detuning and pitch rise", () => {
  const { app, song } = setup();
  const ot = app.ANAT.overtone;
  app.ANAT.quality = app.ensemblePreset();
  ot.f0Midi = 53; // fractional-Hz F0, including before individual detuning
  ot.rise = 83;
  for (const [mode, root] of [["low", -0.1], ["unison", -0.1], ["low", 0.5]]) {
    app.choVoicing = mode;
    ot.root = root;
    for (let voice = 1; voice <= 11; voice++) {
      const singer = app.speakerForVtl(app.CUR.vtl + app.ANAT.chorus.vtl[voice - 1]);
      ot.snap = 0;
      const natural = app.buildSongScoreAs(song, singer);
      ot.snap = 1;
      const score = app.choScore(song, voice);
      const baseHz = score[0].f0a;
      for (const [i, seg] of score.entries()) {
        if (seg.type !== "vowel") {
          assert.deepEqual(seg.f, natural[i].f, "only vowels should lock to a harmonic");
          continue;
        }
        const nearest = Math.max(1, Math.round(natural[i].f[1] / baseHz));
        assert.ok(Math.abs(seg.f[1] / seg.f0a - nearest) < 1e-8,
          mode + " voice " + voice + " mora " + seg.mora + ": expected harmonic " + nearest);
        assert.equal(seg.f[0], natural[i].f[0]);
        assert.equal(seg.f[2], natural[i].f[2]);
      }
    }
  }
});
