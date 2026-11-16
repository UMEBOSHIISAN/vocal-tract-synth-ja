'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const b=html.indexOf('      var NARA = {'),e=html.indexOf('      function narashiLens(',b);assert.ok(b>=0&&e>b);
const cb=html.indexOf('      function narashiChoke('),ce=html.indexOf('      /* at = 読経の頭',cb);assert.ok(cb>=0&&ce>cb);
const c=vm.createContext({});vm.runInContext(html.slice(b,e)+'\n'+html.slice(cb,ce),c);
const sr=8000;
function tone(sec,hits,decay){const x=new Float32Array(Math.round(sec*sr));hits.forEach(([t,amp])=>{const st=Math.round(t*sr);for(let i=st;i<x.length;i++){const d=(i-st)/sr;const v=amp*Math.exp(-d/decay)*Math.sin(2*Math.PI*150*d);if(Math.abs(v)<1e-5&&d>decay*12)break;x[i]+=v;}});return x;}
test('file names map to the five kinds, including decomposed kana',()=>{
 assert.equal(c.narashiKind('法鼓(ほっく)カッ.m4a'),'kak');assert.equal(c.narashiKind('法鼓(ほっく)ドン.m4a'.normalize('NFD')),'don');
 assert.equal(c.narashiKind('法鼓(ほっく)出頭太鼓.m4a'),'shutto');assert.equal(c.narashiKind('法鼓(ほっく)雷鳴(らいめい).m4a'),'raimei');
 assert.equal(c.narashiKind('振鈴(しんれい).m4a'),'rin');assert.equal(c.narashiKind('memo.wav'),null);
 const names=html.match(/var NARA_BUNDLED = (\[[^\]]+\]);/);assert.ok(names);
 const kinds=JSON.parse(names[1]).map(n=>{assert.ok(fs.existsSync(path.join(__dirname,'..','audio','narashimono',n+'.m4a')),'bundled file missing: '+n);return c.narashiKind(n);});
 assert.deepEqual(kinds.sort(),['don','kak','raimei','rin','shutto'],'each bundled recording maps to its own kind');
});
test('single strokes are cut one per hit and a stroke swallowed by the next is dropped',()=>{
 const hits=c.narashiHits(tone(20,[[1,.8],[5,.8],[9,.8],[9.4,.8],[14,.8]],.35),sr);
 assert.equal(hits.length,4,'the 0.4s stroke should be dropped');
 [1,5,9.4,14].forEach((t,i)=>{assert.ok(Math.abs(hits[i].a-t)<.06,'start '+hits[i].a);assert.ok(hits[i].b-hits[i].a>=1);});
});
test('regions split on silence, ignore faint bumps, and the roll picks the loudest stretch',()=>{
 const roll=[];for(let t=2;t<8;t+=.12)roll.push([t,.5]);
 const x=tone(16,[...roll,[11,.02],[13,.5]],.12);
 const r=c.narashiRegions(x,sr);assert.equal(r.length,2);
 const cut=c.narashiCuts('raimei',x,sr);assert.equal(cut.length,1);assert.ok(Math.abs(cut[0].a-2)<.06&&cut[0].b>7.8&&cut[0].b<9);
 const all=c.narashiCuts('shutto',x,sr);assert.ok(Math.abs(all[0].a-2)<.06&&all[0].b>13);
});
test('beats fall on the first mora of each character and skip rests',()=>{
 const segs=[{dur:.05,type:'pause',mora:-1},{dur:.1,type:'fric',mora:0},{dur:.4,type:'vowel',mora:0},{dur:.3,type:'vowel',mora:1},{dur:.6,type:'vowel',mora:2},{dur:.5,type:'pause',mora:-1},{dur:.6,type:'vowel',mora:3},{dur:.18,type:'pause',mora:-1}];
 const r=c.narashiBeats({gisByNote:[[0,1],[2],[],[3]]},segs);
 assert.deepEqual(Array.from(r.beats).map(v=>+v.toFixed(3)),[.05,.85,1.95]);assert.ok(Math.abs(r.end-2.55)<1e-9);
});
test('plan: bell and roll before the chant, one drum per character, seven rim strokes then a closing drum',()=>{
 const len={rin:8,raimei:10,shutto:200,kak:1.5,don:3};
 const p=c.narashiPlan([0,1,2,3],4,{intro:'short',beat:'char',finish:true},len);
 assert.ok(Math.abs(p.intro-(8-1.2+10+.8))<1e-9);
 const pre=p.events.filter(v=>v.t<0);assert.deepEqual(Array.from(pre.map(v=>v.kind)),['rin','raimei']);assert.ok(Math.abs(pre[0].t+p.intro)<1e-9);
 assert.ok(pre[1].t+len.raimei<=0,'roll must end before the chant starts');
 assert.deepEqual(Array.from(p.events.filter(v=>v.kind==='don'&&v.t<=3).map(v=>v.t)),[0,1,2,3]);
 const kak=p.events.filter(v=>v.kind==='kak');assert.equal(kak.length,7);assert.ok(kak[0].t>4);
 for(let i=2;i<7;i++)assert.ok(kak[i].t-kak[i-1].t<kak[i-1].t-kak[i-2].t,'gaps must shrink');
 const last=p.events[p.events.length-1];assert.equal(last.kind,'don');assert.ok(last.t>kak[6].t);assert.ok(p.outro>last.t-4);
 const don=Array.from(p.events.filter(v=>v.kind==='don').map(v=>v.idx));assert.deepEqual(don,[0,1,2,3,4],'strokes rotate through the recorded hits');
});
test('plan: options and missing recordings remove their own part only',()=>{
 const len={rin:8,raimei:10,shutto:200,kak:1.5,don:3};
 const two=c.narashiPlan([0,1,2,3],4,{intro:'off',beat:'two',finish:false},len);
 assert.equal(two.intro,0);assert.equal(two.outro,0);assert.deepEqual(Array.from(two.events.map(v=>v.t)),[0,2]);
 const full=c.narashiPlan([0],1,{intro:'full',beat:'off',finish:false},len);
 assert.deepEqual(Array.from(full.events.map(v=>v.kind)),['rin','shutto']);assert.ok(full.intro>200);
 const none=c.narashiPlan([0,1],2,{intro:'short',beat:'char',finish:true},{});
 assert.equal(none.events.length,0);assert.equal(none.intro,0);
 const onlyDon=c.narashiPlan([0,1],2,{intro:'short',beat:'char',finish:true},{don:3});
 assert.deepEqual(Array.from(onlyDon.events.map(v=>v.kind)),['don','don']);assert.equal(onlyDon.intro,0);
});
test('one drum: the next stroke cuts the previous ring, bell and roll are never cut',()=>{
 const ev=[{t:-10,kind:'rin'},{t:-8,kind:'raimei'},{t:0,kind:'don'},{t:.58,kind:'don'},{t:1.5,kind:'kak'},{t:3,kind:'don'}];
 const k=Array.from(c.narashiChoke(ev));
 assert.equal(k[0],Infinity);assert.equal(k[1],Infinity);assert.ok(Math.abs(k[2]-.67)<1e-9);assert.ok(Math.abs(k[3]-1.01)<1e-9);assert.ok(Math.abs(k[4]-1.59)<1e-9);assert.equal(k[5],Infinity);
});
