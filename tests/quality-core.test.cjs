'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function core() {
  const match = html.match(/\/\* QUALITY_CORE_BEGIN \*\/([\s\S]*?)\/\* QUALITY_CORE_END \*\//);
  const ctx = vm.createContext({ Float32Array, Math, Number, JSON });
  if (match) vm.runInContext(match[1], ctx);
  return ctx;
}
test('harmonic planner keeps independently selected integer partials and normalized mix', () => {
  const c = core();
  assert.equal(typeof c.harmonicPlan, 'function', 'multiple-partial planning is not implemented');
  const p = c.harmonicPlan({ on: true, orders: [6, 10, 14], levels: [1, 1, 1], mix: 0.8, width: 40 }, 98, 44100);
  assert.deepEqual(Array.from(p.bands, b => b.frequency), [588, 980, 1372]);
  assert.ok(Math.abs(p.dry + p.bands.reduce((s,b) => s+b.gain,0)-1) < 1e-9);
});
test('harmonics merge duplicates, reject Nyquist and have a dry all-zero state', () => {
  const c=core();
  const p=c.harmonicPlan({on:true,orders:[6,6,32],levels:[1,1,1],mix:0.8},1000,16000);
  assert.deepEqual(Array.from(p.bands,b=>b.order),[6]);
  assert.ok(Math.abs(p.bands[0].gain-0.8)<1e-9);
  assert.equal(c.harmonicPlan({on:true,levels:[0,0,0]},98,44100).dry,1);
  for(const f of [0,-1,NaN,Infinity]) assert.equal(c.harmonicPlan({on:true},f,44100).bands.length,0);
});
test('glottal pulse is periodic, closes, and its Fourier source has no DC', () => {
  const c=core();assert.equal(typeof c.qPulse,'function','pulse source not implemented');
  assert.equal(c.qPulse(0,0.4,0.16),0);assert.equal(c.qPulse(0.8,0.4,0.16),0);
  assert.ok(Math.abs(c.qPulse(0.3,0.4,0.16)-c.qPulse(1.3,0.4,0.16))<1e-12);
  const w=c.pulseCoefficients(0.4,0.16,64);assert.equal(w.real[0],0);assert.equal(w.imag[0],0);
  assert.ok(Array.from(w.real).every(Number.isFinite));assert.ok(Array.from(w.imag).every(Number.isFinite));
  assert.ok(Math.hypot(w.real[1],w.imag[1])>0.1);
});
test('chorus fluctuations are bounded, deterministic and independent per singer', () => {
  const c=core();assert.equal(typeof c.humanAt,'function','independent chorus fluctuations not implemented');
  const cfg={amount:1,seed:12345};let differed=false,moved=false;
  for(let i=0;i<100;i++){const t=i/10,a=c.humanAt(t,0,cfg),b=c.humanAt(t,1,cfg);
    assert.ok(Math.abs(a.cents)<=12.00001);assert.ok(a.gain>=0.92-1e-6&&a.gain<=1.08+1e-6);
    assert.equal(a.cents,c.humanAt(t,0,cfg).cents);if(Math.abs(a.cents-b.cents)>0.1)differed=true;
    if(i&&Math.abs(a.cents-c.humanAt(0,0,cfg).cents)>0.1)moved=true;
  }
  assert.ok(differed&&moved);
  assert.equal(c.humanAt(1,2,{amount:0,seed:123}).cents,0);assert.equal(c.humanAt(1,2,{amount:0,seed:123}).gain,1);
});
test('room plan derives six relative first reflections and reserves the complete decay tail', () => {
  const c=core();assert.equal(typeof roomDummy,'undefined');
  assert.equal(typeof c.roomPlan,'function','shared synthetic room not implemented');
  const q=c.qualityDefaults();q.room.on=true;q.room.listener=0.7;
  const p=c.roomPlan(q,16000);assert.equal(p.early.length,6);assert.ok(Math.abs(p.directDistance-5)<1e-10);
  assert.ok(p.early.every(e=>e.delay>0&&Number.isFinite(e.delay)));
  assert.ok(p.tail>=q.room.rt*1.25);assert.ok(p.frames<=16000*6);
  assert.equal(c.roomPlan(c.qualityDefaults(),44100).tail,0);
});
test('synthetic impulse is deterministic, finite, bounded and decays', () => {
  const c=core(),q=c.qualityDefaults();q.room.on=true;q.room.rt=0.8;
  const a=c.roomImpulse(q,16000),b=c.roomImpulse(q,16000);
  assert.equal(a.data.length,a.plan.frames);assert.deepEqual(a.data,b.data);
  assert.ok(Array.from(a.data).every(Number.isFinite));
  function energy(start,end){let n=0;for(let i=Math.floor(start*16000);i<Math.min(a.data.length,end*16000);i++)n+=a.data[i]**2;return n;}
  assert.ok(energy(0.15,0.3)>energy(0.75,0.9)*100);
});
