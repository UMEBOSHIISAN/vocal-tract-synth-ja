'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function setup(score,extraScore=score){
 const noop=()=>{},delays=Array.from({length:11},(_,i)=>5+i*11),scene={plan:{tail:.8}},graphs=[],clocks=[];
 function graph(){const g={scene,master:{gain:{cancelScheduledValues:noop,setValueAtTime:noop,linearRampToValueAtTime:noop}}};graphs.push(g);return g;}
 const c=vm.createContext({AC:{currentTime:1,sampleRate:44100,createBuffer:()=>({}),createBufferSource:()=>{const s={connect:noop,start(t){this.startAt=t;},stop(){this.stopped=true;},disconnect(){this.disconnected=true;}};clocks.push(s);return s;}},N:graph(),N2:null,CUR:{vtl:15.8},ANAT:{quality:{},chorus:{delay:delays}},choN:12,duetKey:null,tubeOn:false,manOn:false,V3:{},ensureCtx:noop,silenceParams:noop,resetQualityTail:noop,clearTiles:noop,qualityConfig:q=>q,prepareQualityScene:noop,prepareQualityVoice:(g,q,i)=>g.voiceIndex=i,scheduleSegG:noop,choExtraCount:()=>11,choPeak:()=>.2,chantLeadGain:x=>x,choGraph:()=>graph(),choScore:()=>extraScore,applyListening:noop,document:{getElementById:()=>({classList:{add:noop,remove:noop},textContent:''})}});
 const st=html.match(/      var speed = 1,[^\n]+/);assert.ok(st);const b=html.indexOf('      function startPlayback('),e=html.indexOf('      function play(',b);assert.ok(b>=0&&e>b);const lb=html.indexOf('      function stop() {'),le=html.indexOf('      /* ---------- phrase tiles',lb);vm.runInContext(st[0]+'\n'+html.slice(lb,le)+'\n'+html.slice(b,e),c);
 c.startPlayback(score,'song',null,{def:{kyo:true}},null);return {c,scene,delays,clocks};
}
test('natural choir completion waits for the delayed final singer before room tail',()=>{
 const {c,scene,delays}=setup([{dur:.2,type:'vowel'}]);const end=.2+Math.max(...delays)/1000;
 assert.ok(Math.abs(c.anim.total-end)<1e-10,'completion still uses only the principal voice');assert.ok(Math.abs(scene.tailUntil-(c.anim.startCtx+end+scene.plan.tail))<1e-10);
});
test('empty or zero-length extra singers do not add a silent end delay',()=>{
 for(const extra of [[],[{dur:0}]]){const {c}=setup([{dur:.2}],extra);assert.ok(Math.abs(c.anim.total-.2)<1e-10);}
 const {c}=setup([],[]);assert.equal(c.anim.total,0);
});
test('native audio-clock completion works without any animation frame',()=>{
 const {c,clocks}=setup([{dur:.2}]);assert.ok(clocks[0],'audio end clock missing');const s=clocks[0];assert.ok(Math.abs(s.startAt-(c.anim.startCtx+c.anim.total))<1e-10);c.AC.currentTime=s.startAt+1/c.AC.sampleRate;s.onended();assert.equal(c.playing,false);assert.equal(c.anim,null);assert.equal(s.disconnected,true);
});
test('STOP and new play invalidate an already-queued old audio end event',()=>{
 const {c,clocks}=setup([{dur:.2}]);assert.ok(clocks[0],'audio end clock missing');const old=clocks[0],queued=old.onended;c.stop();assert.equal(old.stopped,true);assert.equal(old.onended,null);c.startPlayback([{dur:.3}],'song',null,{def:{kyo:true}},null);const current=c.anim;queued();assert.equal(c.playing,true);assert.equal(c.anim,current);
});
test('animation completion cancels the native signal so natural end cannot fire twice',()=>{
 const {c,clocks}=setup([{dur:.2}]);assert.ok(clocks[0],'audio end clock missing');const s=clocks[0],queued=s.onended;c.finishUtterance();assert.equal(s.stopped,true);assert.equal(s.onended,null);queued();assert.equal(c.playing,false);assert.equal(c.anim,null);
});
test('STOP and natural finish refresh the audition label only after clearing live state',()=>{
 for(const action of ['stop','finishUtterance']){const {c}=setup([{dur:.2}]),seen=[];c.applyListening=()=>seen.push({playing:c.playing,anim:c.anim});c[action]();assert.equal(seen.length,1,'audition label remains in playing state');assert.equal(seen[0].playing,false);assert.equal(seen[0].anim,null);}
});
