'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
class Param { constructor(v=0){this.value=v;this.events=[];} cancelScheduledValues(t){this.events.push(['cancel',t]);} setValueAtTime(v,t){this.value=v;this.events.push(['value',v,t]);} setTargetAtTime(v,t,c){this.value=v;this.events.push(['target',v,t,c]);} linearRampToValueAtTime(v,t){this.value=v;} exponentialRampToValueAtTime(v,t){this.value=v;} setValueCurveAtTime(v,t,d){this.events.push(['curve',Array.from(v),t,d]);} }
class Node { constructor(kind){this.kind=kind;this.outputs=[];for(const k of ['gain','frequency','Q','threshold','ratio','knee','attack','release','detune','pan'])this[k]=new Param();} connect(n){this.outputs.push(n);return n;} disconnect(n){this.outputs=n?this.outputs.filter(x=>x!==n):[];} start(){} setPeriodicWave(w){this.wave=w;} }
function setup(){
 const ctx={sampleRate:16000,currentTime:1,destination:new Node('destination'),nodes:[]};
 for(const [method,kind]of Object.entries({createGain:'gain',createDynamicsCompressor:'compressor',createBiquadFilter:'filter',createOscillator:'oscillator',createBufferSource:'buffer-source',createAnalyser:'analyser',createConvolver:'convolver',createWaveShaper:'shaper',createStereoPanner:'panner'}))ctx[method]=()=>{const n=new Node(kind);ctx.nodes.push(n);return n;};
 ctx.createBuffer=(channels,length,rate)=>{const arrays=Array.from({length:channels},()=>new Float32Array(length));return {length,sampleRate:rate,getChannelData:i=>arrays[i]};};ctx.createPeriodicWave=(real,imag)=>({real,imag});
 const c=vm.createContext({Float32Array,Float64Array,WeakMap,Math,Number,JSON});
 const core=html.match(/\/\* QUALITY_CORE_BEGIN \*\/([\s\S]*?)\/\* QUALITY_CORE_END \*\//);vm.runInContext(core[1],c);
 const audio=html.match(/\/\* QUALITY_AUDIO_BEGIN \*\/([\s\S]*?)\/\* QUALITY_AUDIO_END \*\//);if(audio)vm.runInContext(audio[1],c);
 return {ctx,c};
}
test('one shared scene routes every dry and wet path to a final analyser',()=>{
 const {ctx,c}=setup();assert.equal(typeof c.qualityScene,'function','shared output scene is not implemented');
 const q=c.qualityDefaults();q.room.on=true;const a=ctx.createAnalyser(),s=c.qualityScene(ctx,a,q);
 assert.equal(c.qualityScene(ctx,null,q),s);assert.equal(s.analyser,a);
 assert.ok(s.input.outputs.includes(s.dry));assert.ok(s.input.outputs.includes(s.convolver));
 assert.ok(s.analyser.outputs.includes(ctx.destination));assert.notEqual(s.cfg,q);q.room.rt=4;assert.notEqual(s.cfg.room.rt,4);
});
test('explicit STOP mutes and discards room history, while preparation creates a fresh convolver',()=>{
 const {ctx,c}=setup();assert.equal(typeof c.resetQualityTail,'function','room tail cancellation is not implemented');
 const q=c.qualityDefaults();q.room.on=true;let s=c.qualityScene(ctx,null,q),old=s.convolver;
 c.resetQualityTail(ctx);assert.equal(s.wet.gain.value,0);assert.notEqual(s.convolver,old);
 old=s.convolver;c.prepareQualityScene(ctx,q);assert.notEqual(s.convolver,old);assert.ok(s.wet.gain.value>0);
 });
 test('a real voice graph routes through its human gain and the shared scene',()=>{
 const {ctx,c}=setup();c.ANAT={quality:c.qualityDefaults(),tube:{open:0.4,close:0.16}};
 const begin=html.indexOf('      function buildGraph('),end=html.indexOf('      function ensureCtx()',begin);
 assert.ok(begin>=0&&end>begin);vm.runInContext(html.slice(begin,end),c);
 const G=c.buildGraph(ctx,ctx.createAnalyser(),c.qualityDefaults());
 assert.ok(G.humanGain,'voice output still bypasses shared quality scene');
 assert.ok(G.comp.outputs.includes(G.humanGain));assert.ok(G.humanGain.outputs.includes(G.auditionGain));assert.ok(G.auditionGain.outputs.includes(G.scene.input));
 assert.equal(G.hBands.length,3);assert.ok(!G.comp.outputs.includes(ctx.destination));
 });
 test('WAV reserves the whole shared room tail instead of truncating it',async()=>{
 const {ctx,c}=setup();const q=c.qualityDefaults();q.room.on=true;q.room.rt=0.8;
 c.ANAT={quality:q,tube:{open:0.4,close:0.16}};c.speed=1;c.tubeOn=false;c.CUR={vtl:15.8};c.duetKey=null;
 const begin=html.indexOf('      function buildGraph('),end=html.indexOf('      function ensureCtx()',begin);vm.runInContext(html.slice(begin,end),c);
 c.OfflineAudioContext=function(channels,frames,sr){ctx.length=frames;ctx.sampleRate=sr;ctx.currentTime=0;ctx.startRendering=()=>Promise.resolve({});return ctx;};
 c.scheduleSegG=()=>{};c.tubeFlush=()=>Promise.resolve();c.encodeWav=()=>({});c.stampNow=()=> 'test';
 c.URL={createObjectURL:()=> 'blob:test',revokeObjectURL(){}};c.setTimeout=()=>{};
 c.document={createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}};
 const rb=html.indexOf('      function renderAndDownload('),re=html.indexOf('      function renderWav()',rb);vm.runInContext(html.slice(rb,re),c);
 const ok=await c.renderAndDownload([{dur:1.2,type:'vowel'}],'synthetic');assert.equal(ok,true);
 assert.equal(ctx.length,Math.ceil((1.23+c.roomPlan(q,44100).tail)*44100),'IR tail must be included in the rendered sample count');
 });
 test('choir offline graph uses stereo destination and the singer pan before shared room',async()=>{
 const {ctx,c}=setup();const q=c.qualityDefaults();c.ANAT={quality:q,tube:{open:.4,close:.16}};c.speed=1;c.tubeOn=false;c.CUR={vtl:15.8};c.duetKey=null;
 const b=html.indexOf('      function buildGraph('),e=html.indexOf('      function ensureCtx()',b);vm.runInContext(html.slice(b,e),c);
 c.OfflineAudioContext=function(channels,frames,sr){ctx.channels=channels;ctx.sampleRate=sr;ctx.currentTime=0;ctx.startRendering=()=>Promise.resolve({});return ctx;};
 c.scheduleSegG=()=>{};c.tubeFlush=()=>Promise.resolve();c.encodeWav=()=>({});c.stampNow=()=> 'test';c.URL={createObjectURL:()=> 'blob:test',revokeObjectURL(){}};c.setTimeout=()=>{};c.document={createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}};
 const rb=html.indexOf('      function renderAndDownload('),re=html.indexOf('      function renderWav()',rb);vm.runInContext(html.slice(rb,re),c);
 vm.runInContext(html.match(/function choPeak\(n\) \{[^}]+\}/)[0],c);
 const score=[{dur:1.2,type:'vowel'}];assert.equal(await c.renderAndDownload(score,'test',null,[{segs:score,vtl:16,delay:.02,pan:-.7}],false),true);
 assert.equal(ctx.channels,2,'choir renderer still creates a mono context');const pn=ctx.nodes.find(n=>n.kind==='panner');assert.ok(pn,'offline panner is missing');assert.equal(pn.pan.value,-.7);assert.ok(pn.outputs.includes(c.qualityScenes.get(ctx).input));
 });
test('audition isolates one singer after human automation and ALL restores unity',()=>{
 const {ctx,c}=setup();assert.equal(typeof c.setVoiceAudition,'function','independent audition control is missing');
 const q=c.qualityDefaults();q.human.amount=.65;c.ANAT={quality:q,tube:{open:.4,close:.16}};
 const b=html.indexOf('      function buildGraph('),e=html.indexOf('      function ensureCtx()',b);vm.runInContext(html.slice(b,e),c);
 const gs=Array.from({length:12},(_,i)=>{const g=c.buildGraph(ctx,null,q);assert.equal(g.auditionGain.gain.value,1);c.prepareQualityVoice(g,q,i,2,1,false);return g;});
 const human=JSON.stringify(gs.map(g=>g.humanGain.gain.events));c.setVoiceAudition(gs,3);
 assert.deepEqual(gs.map(g=>g.auditionGain.gain.value),Array.from({length:12},(_,i)=>i===3?1:0));assert.equal(JSON.stringify(gs.map(g=>g.humanGain.gain.events)),human);
 for(const g of gs){assert.ok(g.humanGain.outputs.includes(g.auditionGain));assert.ok(g.auditionGain.outputs.includes(g.scene.input));assert.ok(!g.humanGain.outputs.includes(g.scene.input));}
 for(const selected of [-1,99,2.5]){c.setVoiceAudition(gs,selected);assert.ok(gs.every(g=>g.auditionGain.gain.value===1));}
 c.setVoiceAudition(gs,11);c.setVoiceAudition(gs,0);c.setVoiceAudition(gs,-1);assert.ok(gs.every(g=>g.auditionGain.gain.value===1));c.setVoiceAudition([],1);
});
test('offline graphs omit audition processing rather than depending on a unity gate',()=>{
 const {ctx,c}=setup();c.ANAT={quality:c.qualityDefaults(),tube:{open:.4,close:.16}};
 const b=html.indexOf('      function buildGraph('),e=html.indexOf('      function ensureCtx()',b);vm.runInContext(html.slice(b,e),c);
 const g=c.buildGraph(ctx,null,c.qualityDefaults(),false);assert.equal(g.auditionGain,null,'offline still includes live-only audition DSP');assert.equal(g.output,g.humanGain);assert.ok(g.humanGain.outputs.includes(g.scene.input));
 c.prepareQualityVoice(g,c.qualityDefaults(),0,.01,1,false);c.setVoiceAudition([g],0);assert.ok(g.humanGain.outputs.includes(g.scene.input));
});
