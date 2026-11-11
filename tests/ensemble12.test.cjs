'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function core(){const m=html.match(/\/\* QUALITY_CORE_BEGIN \*\/([\s\S]*?)\/\* QUALITY_CORE_END \*\//);assert.ok(m);const c=vm.createContext({Float32Array,Math,Number,JSON});vm.runInContext(m[1],c);return c;}
test('individual timing preserves phrase length and inputs while separating twelve singers',()=>{
 const c=core();assert.equal(typeof c.ensembleScore,'function','individual segment timing is missing');
 const score=Array.from({length:30},(_,i)=>({dur:i%6===5?.25:.08+(i%3)*.04,mora:i,type:i%6===5?'pause':'vowel',f0a:98}));const before=JSON.stringify(score),h={amount:.65,seed:42};const total=a=>a.reduce((s,x)=>s+x.dur,0),signatures=new Set();
 for(let voice=0;voice<12;voice++){
  const result=c.ensembleScore(score,voice,h);assert.equal(result.length,score.length);assert.ok(Math.abs(total(result)-total(score))<1e-10);assert.ok(result.every((s,i)=>s.dur>0&&Math.abs(s.dur-score[i].dur)<=.05&&s.f0a===98));
  assert.equal(JSON.stringify(result),JSON.stringify(c.ensembleScore(score,voice,h)));signatures.add(JSON.stringify(result));
 }
 assert.equal(signatures.size,12);assert.equal(JSON.stringify(score),before);
 assert.equal(JSON.stringify(c.ensembleScore(score,3,{amount:0,seed:42})),before);assert.equal(JSON.stringify(c.ensembleScore(score,0,h)),before);
 assert.equal(c.ensembleScore([],1,h).length,0);assert.equal(c.ensembleScore([{dur:1}],1,h)[0].dur,1);
});
test('real choir score builder applies the timing helper, not only a detached planner',()=>{
 const c=core(),score=[{dur:.2,mora:0,f0a:98,f0b:98},{dur:.3,mora:1,f0a:98,f0b:98},{dur:.2,mora:2,f0a:98,f0b:98}];
 c.ANAT={quality:{human:{amount:.65,seed:42}},chorus:{cents:[9],vtl:[.5]}};c.CUR={vtl:15.8};c.buildSongScoreAs=()=>score;c.speakerForVtl=x=>x;
 const m=html.match(/function choScore\(song, i\)[\s\S]*?(?=      function choGraph)/);assert.ok(m);vm.runInContext(m[0],c);
 assert.ok(c.choScore({},1).some((s,i)=>s.dur!==score[i].dur),'real choir still copies identical timing');
});
test('pulse source colours are independent, bounded, and bypassable',()=>{
 const c=core();assert.equal(typeof c.singerShape,'function','individual source colour is missing');const q={source:'pulse',open:.4,close:.12,human:{amount:.65,seed:42}},seen=new Set();
 for(let i=0;i<12;i++){const s=c.singerShape(q,i);assert.ok(s.open>0&&s.close>0&&s.open+s.close<=.95);assert.ok(Math.abs(s.open-.4)<=.04&&Math.abs(s.close-.12)<=.12*.35);seen.add(JSON.stringify(s));assert.equal(JSON.stringify(s),JSON.stringify(c.singerShape(q,i)));}
 assert.equal(seen.size,12);assert.equal(c.singerShape(q,0).close,.12);assert.equal(c.singerShape({...q,human:{amount:0}},3).close,.12);
});
test('WAV encoder preserves two native channels and interleaves PCM',async()=>{
 const m=html.match(/function encodeWav\(buffer\)[\s\S]*?(?=      function stampNow)/);assert.ok(m);const c=vm.createContext({Blob});vm.runInContext(m[0],c);
 const input=[Float32Array.from([.25,-.5]),Float32Array.from([-.25,.5])],buffer={numberOfChannels:2,sampleRate:44100,length:2,getChannelData:i=>input[i]};const v=new DataView(await c.encodeWav(buffer).arrayBuffer());
 assert.equal(v.getUint16(22,true),2,'choir WAV still discards stereo');assert.equal(v.getUint32(28,true),44100*2*2);assert.equal(v.getUint16(32,true),4);assert.equal(v.byteLength,44+2*2*2);
 assert.deepEqual(Array.from({length:4},(_,i)=>v.getInt16(44+i*2,true)),[.25,-.25,-.5,.5].map(x=>Math.trunc(x*(x<0?32768:32767))));
 const mono=new DataView(await c.encodeWav({...buffer,numberOfChannels:1}).arrayBuffer());assert.equal(mono.getUint16(22,true),1);assert.equal(mono.byteLength,44+2*2);
});
test('each drawn singer resolves its own actual scheduled segment and breath gap',()=>{
 const c=core();assert.equal(typeof c.singerFrame,'function','individual visual timeline is missing');
 const a=[{start:0,dur:.2,type:'vowel',pose:{jaw:.8},gains:{v:1}},{start:.2,dur:.1,type:'pause',pose:{jaw:.1},gains:{v:0}},{start:.3,dur:.2,type:'vowel',pose:{jaw:.4},gains:{v:.6}}];
 assert.equal(c.singerFrame(a,-.01),null);assert.equal(c.singerFrame(a,.1).seg,a[0]);assert.equal(c.singerFrame(a,.2).inhale,true);assert.equal(c.singerFrame(a,.31).seg,a[2]);assert.equal(c.singerFrame(a,.1).voiced,true);assert.equal(c.singerFrame(a,.5),null);assert.equal(c.singerFrame([],0),null);
});
test('the twelve-person preset keeps vowel body, independent drift and a shared room',()=>{
 const c=core();assert.equal(typeof c.ensemblePreset,'function','twelve-person recommended preset is missing');const q=c.ensemblePreset();
 assert.equal(q.source,'pulse');assert.equal(q.partials.on,true);assert.ok(q.partials.mix<.7);assert.ok(q.human.amount>.4&&q.human.amount<.9);assert.equal(q.room.on,true);assert.ok(q.room.rt<=1.8);assert.ok(q.room.wet<.3);
});
// ENSEMBLE12_TEST_APPEND
