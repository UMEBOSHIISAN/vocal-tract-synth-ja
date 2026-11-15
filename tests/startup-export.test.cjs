'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function between(a,b){const x=html.indexOf(a),y=html.indexOf(b,x);assert.ok(x>=0&&y>x,'real startup source boundary is present');return html.slice(x,y);}
function node(dataset={}){return {dataset,handlers:{},textContent:'',disabled:false,addEventListener(k,fn){this.handlers[k]=fn;},setAttribute(k,v){this[k]=v;},classList:{add(){},remove(){}}};}
function settingHarness(){
 const voices=[node({cho:'1'}),node({cho:'12'})],tube=node(),calls={contexts:0,graphs:0,prep:0};
 const c=vm.createContext({AC:null,N:null,N2:null,tubeOn:false,choN:1,listenVoice:-1,
  stop(){},applyListening(){},uiText:(e,t)=>{e.textContent=t;},
  ensureCtx(){calls.contexts++;c.AC={};c.N={};},buildGraph(){calls.graphs++;return{};},
  choPrepare(){calls.prep++;return Promise.resolve([]);},tubeAttach(){calls.prep++;return Promise.resolve(true);},
  document:{querySelectorAll:()=>voices,getElementById:()=>tube}});
 vm.runInContext(between('      Array.prototype.forEach.call(document.querySelectorAll("[data-cho]"),','      /* ---------- WAV 一括書き出し'),c);
 return {c,voices,tube,calls};
}
test('choir selection changes configuration without constructing or preparing an audio graph',()=>{
 const h=settingHarness();h.voices[1].handlers.click.call(h.voices[1]);
 assert.equal(h.c.choN,12);assert.equal(h.c.listenVoice,-1);
 assert.equal(h.calls.contexts,0,'configuration must not construct AudioContext');
 assert.equal(h.calls.prep,0);assert.equal(h.calls.graphs,0);
});
test('tube selection is silent configuration; preparation belongs to a subsequent start/export',async()=>{
 const h=settingHarness();h.tube.handlers.click.call(h.tube);await flush();
 assert.equal(h.c.tubeOn,true);assert.equal(h.tube['aria-pressed'],'true');
 assert.equal(h.calls.contexts,0,'engine selection must not construct AudioContext');
 assert.equal(h.calls.prep,0);assert.equal(h.calls.graphs,0);
 h.tube.handlers.click.call(h.tube);assert.equal(h.c.tubeOn,false);
});
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};}
async function flush(){for(let i=0;i<6;i++)await Promise.resolve();}
function manualHarness(){
 const gate=deferred(),nodes={},scheduled=[],messages=[];
 const param={cancelScheduledValues(){},setValueAtTime(){},setTargetAtTime(){}};
 const graph={f1:{f:{Q:param}},f2:{f:{Q:param}},f3:{f:{Q:param}},defQ:[1,1,1],lp:{frequency:param},master:{gain:param}};
 const c=vm.createContext({AC:{currentTime:0},N:graph,manOn:false,playTicket:0,tubeOn:true,CUR:{vtl:15.8},ANAT:{quality:{}},
  ensureCtx(){},stop(){c.playTicket++;c.manOn=false;},silenceParams(){},
  prepareQualityScene(){},prepareQualityVoice(g,q,i,t,d,engine){scheduled.push(engine);g.engineTube=engine;},
  tubeAttach(){return gate.promise.then(ok=>{if(ok)graph.tube={};return ok;});},
  qualityMessage:(text,failed)=>messages.push({text,failed}),uiText:(el,t)=>{el.textContent=t;},
  manUiOff(){c.manOn=false;},document:{getElementById:id=>nodes[id]||(nodes[id]=node())}});
 vm.runInContext(between('      function setManSound(','      document.getElementById("manSoundBtn").addEventListener'),c);
 return {c,gate,nodes,scheduled,messages};
}
test('manual tube start waits, then uses the selected engine instead of silently starting formants',async()=>{
 const h=manualHarness();h.c.setManSound(true);
 assert.equal(h.c.manOn,false,'a fresh selected tube must not start a formant voice before preparation');
 assert.equal(h.scheduled.length,0);
 h.gate.resolve(true);await flush();
 assert.equal(h.c.manOn,true);assert.deepEqual(h.scheduled,[true]);
});
test('STOP invalidates a pending manual tube start',async()=>{
 const h=manualHarness();h.c.setManSound(true);h.c.stop();h.gate.resolve(true);await flush();
 assert.equal(h.c.manOn,false);assert.equal(h.scheduled.length,0,'stale preparation must not schedule audio');
});
test('failed manual tube preparation stays silent and reports failure',async()=>{
 const h=manualHarness();h.c.setManSound(true);h.gate.resolve(false);await flush();
 assert.equal(h.c.manOn,false);assert.equal(h.scheduled.length,0);
 assert.ok(h.messages.some(m=>m.failed),'failure must be visible rather than a silent engine substitution');
});
