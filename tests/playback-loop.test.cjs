'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Run the real playback lifecycle functions; fake only the DOM, audio sink and clock.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const state = html.match(/      var speed = 1,[^\n]+/)[0];
const begin = html.indexOf('      function stop() {');
const end = html.indexOf('      /* ---------- phrase tiles', begin);
assert.ok(begin >= 0 && end > begin, 'playback lifecycle source must be present');
const lifecycle = html.slice(begin, end);

function setup(mode) {
  let nextId = 0;
  const pending = new Map();
  const starts = [];
  const status = { textContent: '' };
  const context = vm.createContext({
    AC: null, N: null, manOn: false, duetKey: null, tubeOn: false, CUR: { vtl: 15.8 },
    ANAT: { quality: {} }, qualityConfig: (q) => q,
    prepareQualityScene() {}, prepareQualityVoice() {}, resetQualityTail() {}, applyListening() {},
    document: { getElementById: (id) => id === 'liveTxt'
      ? status : { classList: { remove() {} } } },
    clearTiles() {},
    setTimeout(fn) { const id = ++nextId; pending.set(id, fn); return id; },
    clearTimeout(id) { pending.delete(id); },
    buildSongScore(song) { return song; },
    buildSongScoreAs(song) { return song; },
    ANAT: { speakers: {} },
    startPlayback(...args) { starts.push(args); },
    play(...args) { starts.push(args); }
  });
  vm.runInContext(state + '\n' + lifecycle, context);
  context.loopOn = true;
  context.playing = true;
  context.anim = { mode, items: ['synthetic mora'], song: mode === 'song' ? { id: 'synthetic song' } : null, duetKey: null };
  return { context, starts, status, pending, flush() {
    const callbacks = [...pending.values()]; pending.clear();
    callbacks.forEach((fn) => fn());
  } };
}

for (const mode of ['phrase', 'song']) {
  test(`STOP during ${mode} loop gap prevents a later restart`, () => {
    const h = setup(mode);
    h.context.finishUtterance();
    assert.equal(h.pending.size, 1, 'a loop is actually queued');
    h.context.stop();
    h.flush();
    assert.equal(h.starts.length, 0, 'STOP must cancel queued playback');
    assert.equal(h.status.textContent, 'STANDBY');
    assert.equal(h.context.loopOn, true, 'retain the user loop preference');
  });

  test(`${mode} still loops when not stopped`, () => {
    const h = setup(mode);
    h.context.finishUtterance();
    h.flush();
    assert.equal(h.starts.length, 1);
  });

  test(`unchecking loop prevents queued ${mode} playback`, () => {
    const h = setup(mode);
    h.context.finishUtterance();
    h.context.loopOn = false;
    h.flush();
    assert.equal(h.starts.length, 0);
  });
}

test('an explicit new playback cancels the previous queued loop', () => {
  const h = setup('phrase');
  h.context.finishUtterance();
  assert.equal(h.pending.size, 1);
  const noop = () => {};
  h.context.AC = { currentTime: 0, sampleRate: 44100, createBuffer:()=>({}), createBufferSource:()=>({connect:noop,start:noop,stop:noop,disconnect:noop}) };
  h.context.N = { scene: { plan: { tail: 0 } }, master: { gain: { cancelScheduledValues: noop, setValueAtTime: noop, linearRampToValueAtTime: noop } } };
  h.context.ensureCtx = noop;
  h.context.silenceParams = noop;
  h.context.scheduleSegG = noop;
  h.context.V3 = {};
  h.context.document = { getElementById: () => ({ classList: { add: noop }, textContent: '' }) };
  const start = html.indexOf('      function startPlayback(');
  const end = html.indexOf('      function play(', start);
  assert.ok(start >= 0 && end > start);
  vm.runInContext(html.slice(start, end), h.context);
  h.context.startPlayback([{ dur: 0.1 }], 'vowel', [], null, null);
  assert.equal(h.pending.size, 0, 'do not retain a loop belonging to the previous utterance');
});
