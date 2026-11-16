"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const c=vm.createContext({});
vm.runInContext(html.match(/function otSnap\(f, f0\)[\s\S]*?(?=      var speakerKey)/)[0],c);
vm.runInContext(html.match(/function anaEnvelope\([\s\S]*?\n      \}/)[0],c);
test("new knob defaults leave the old sound alone",()=>{
 assert.match(html,/band: 0, bandF: \[2700, 3650\]/);
 assert.ok(html.includes('{ k: "band"'));
 assert.match(html,/hv = ot2 && O\.band > 0 && g\.v > 0 \? O\.band \* OT_BAND_UNIT : 0/);
});
test("tongue-root pose moves only the tongue body, and only when the knob is in use",()=>{
 const p={tx:418,ty:354,bx:346,by:370,jaw:1,lip:1};
 assert.equal(c.otRootPose(p,-0.1),p);
 const q=c.otRootPose(p,1);
 assert.ok(q.by<p.by&&q.bx>p.bx);assert.equal(q.jaw,p.jaw);assert.equal(q.lip,p.lip);assert.equal(q.tx,p.tx);
 assert.equal(p.by,370,"must not mutate the shared vowel pose");
});
test("sweep walks harmonics 6..13 of 180Hz one at a time, up and back",()=>{
 const S=c.OT_SWEEP,plan=c.otSweepPlan(S);
 assert.equal(plan[0].root,-0.1);assert.equal(plan[plan.length-1].root,-0.1);
 const hs=Array.from(plan).filter(s=>s.root>=0).map(s=>Math.round(c.otVowelF([700,1200,2500],S.f0,{snap:1,root:s.root})[1]/S.f0));
 assert.deepEqual(hs.slice(0,8),[6,7,8,9,10,11,12,13]);
 assert.deepEqual(hs.slice(8,15),[12,11,10,9,8,7,6]);
 for(let i=1;i<hs.length;i++)assert.equal(Math.abs(hs[i]-hs[i-1]),1);
 const top=c.otVowelF([700,1200,2500],S.f0,{snap:1,root:1}),low=c.otVowelF([700,1200,2500],S.f0,{snap:1,root:0});
 assert.equal(top[2],2500);assert.equal(low[2],3500);
 assert.ok(c.otSweepGains(S,1)[1]>c.otSweepGains(S,0)[1]);
 assert.deepEqual(Array.from(c.otSweepGains(S,-0.1)),Array.from(S.g0));
});
test("computed resonance curve peaks at the formants and gains a bump from the fixed band",()=>{
 const F=[700,1200,2500],bw=[80,95,130],g=[1,0.5,0.2];
 const e=f=>c.anaEnvelope(f,F,bw,g,5200,180,[]);
 assert.ok(e(700)>e(600)&&e(700)>e(800));assert.ok(e(1200)>e(1000)&&e(1200)>e(1400));assert.ok(e(2500)>e(2300)&&e(2500)>e(2700));
 const withBand=c.anaEnvelope(3650,F,bw,g,5200,180,[[3650,400,0.3]]);
 assert.ok(withBand>e(3650)+3);
});
test("anatomy view is wired: tab, canvas, note, and a per-frame call",()=>{
 for(const s of ['id="tab-ana"','id="viewAna"','id="noteAna"','if (anaOn) renderAna(poseCur, nowMs);','data-song="sweep"'])assert.ok(html.includes(s),s);
 assert.match(html,/模式図/);
});
test("per-count forms: voice parts follow the low-chant ratios and name the interval",()=>{
 const d=vm.createContext({currentSong:{def:{kyo:[1]}},choVoicing:"low"});
 vm.runInContext(html.match(/function g3VoicePart\(i\)[\s\S]*?(?=      var G3_PART)/)[0],d);
 assert.deepEqual([0,1,2,3,4,5].map(i=>d.g3VoicePart(i)),[4,2,3,4,2,3]);
 assert.equal(d.g3Interval(4,2),"オクターブ 2:1");assert.equal(d.g3Interval(2,3),"五度 3:2");assert.equal(d.g3Interval(3,4),"四度 4:3");assert.equal(d.g3Interval(4,4),"同音 1:1");
 d.choVoicing="unison";assert.deepEqual([0,1,2].map(i=>d.g3VoicePart(i)),[4,4,4]);
 assert.match(html,/var form = n === 1 \|\| n === 3 \|\| n === 6;/);
});
