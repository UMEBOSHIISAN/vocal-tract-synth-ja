'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function section(a,b){const x=html.indexOf(a),y=html.indexOf(b,x);assert.ok(x>=0&&y>x,'real WAV UI source boundary');return html.slice(x,y);}
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};}
async function settle(){for(let i=0;i<25;i++)await Promise.resolve();}
function setup(renderer){
 const nodes={wavBtn:{disabled:false,textContent:''},wavBatchBtn:{disabled:false,textContent:''}},calls=[],messages=[];
 const c=vm.createContext({appMode:'phrase',duetKey:null,choN:1,speed:1,ANAT:{speakers:{}},
  document:{getElementById:id=>nodes[id]},uiText:(e,t)=>{e.textContent=t;},qualityMessage:(text,failed)=>messages.push({text,failed}),
  buildScore:()=>[{dur:.1}],phraseItems:()=>[],batchTargets:()=>['A','B','C'].map(label=>({label,raw:[{dur:.1}],raw2:null})),
  renderAndDownload(...args){calls.push(args);return renderer(...args);},
  setTimeout(fn){fn();return 1;}});
 const helper=html.match(/\/\* WAV_UI_CORE_BEGIN \*\/([\s\S]*?)\/\* WAV_UI_CORE_END \*\//);
 vm.runInContext((helper?helper[1]:'')+'\n'+section('      function renderWav(','      document.getElementById("wavBtn").addEventListener')+'\n'+section('      function renderBatchWav(','      document.getElementById("wavBatchBtn").addEventListener'),c);
 return {c,nodes,calls,messages};
}
test('batch stops at the first false render and restores both controls without reporting completion',async()=>{
 const h=setup(()=>Promise.resolve(false));h.c.renderBatchWav();await settle();
 assert.equal(h.calls.length,1,'do not advance after a failed file');
 assert.equal(h.nodes.wavBtn.disabled,false);assert.equal(h.nodes.wavBatchBtn.disabled,false);
 assert.ok(h.messages.some(m=>m.failed),'failure must be visible');
 assert.ok(!h.messages.some(m=>!m.failed&&m.text.includes('完了')));
});
test('a single export holds the same exclusion boundary as batch export',async()=>{
 const gate=deferred(),h=setup(()=>gate.promise);h.c.renderWav();
 assert.equal(h.nodes.wavBatchBtn.disabled,true,'batch must be excluded while a single export is pending');
 h.c.renderBatchWav();assert.equal(h.calls.length,1,'do not overlap the two entry points');
 gate.resolve(true);await settle();
 assert.equal(h.nodes.wavBtn.disabled,false);assert.equal(h.nodes.wavBatchBtn.disabled,false);
});
test('a batch export excludes a direct single-export start until it is released',async()=>{
 const gate=deferred(),h=setup(()=>gate.promise);h.c.renderBatchWav();h.c.renderWav();
 assert.equal(h.calls.length,1);gate.resolve(false);await settle();
 assert.equal(h.nodes.wavBtn.disabled,false);assert.equal(h.nodes.wavBatchBtn.disabled,false);
});
test('successful batch submits each target once and releases the busy state',async()=>{
 const h=setup(()=>Promise.resolve(true));h.c.renderBatchWav();await settle();
 assert.equal(h.calls.length,3);assert.equal(h.nodes.wavBtn.disabled,false);assert.equal(h.nodes.wavBatchBtn.disabled,false);
 assert.ok(h.messages.some(m=>!m.failed&&m.text.includes('3')),'report the actual generated/requested count');
});

function actualRenderer(options={}){
 const h=setup(()=>{throw new Error('real renderer must replace this boundary double');});
 const state={encodes:0,renders:0,urls:[],revoked:[],anchors:0};
 Object.assign(h.c,{tubeOn:false,CUR:{vtl:15.8},qualityConfig:()=>({partials:{on:false},human:{amount:0},room:{on:false}}),
  roomPlan:()=>({tail:0}),buildGraph:()=>({master:{gain:{setValueAtTime(){},linearRampToValueAtTime(){}}}}),
  prepareQualityVoice(){},scheduleSegG(){},tubeFlush:()=>Promise.resolve(),stampNow:()=> 'fixture',
  OfflineAudioContext:class {startRendering(){state.renders++;return Promise.resolve({});}},
  encodeWav(){state.encodes++;if(state.encodes===options.failEncodingAt)throw new Error('post-render encoding failure');return {};},
  URL:{createObjectURL(){if(options.failURL)throw new Error('object URL allocation failure');const u='blob:fixture-'+state.encodes;state.urls.push(u);return u;},revokeObjectURL(u){state.revoked.push(u);}}});
 h.c.document.body={appendChild(a){a.parentNode=this;state.anchors++;}};
 h.c.document.createElement=()=>({parentNode:null,click(){if(options.failClick)throw new Error('download submission failure');},remove(){if(this.parentNode){state.anchors--;this.parentNode=null;}}});
 vm.runInContext(section('      function renderAndDownload(','      /* WAV_UI_CORE_BEGIN */'),h.c);
 return {...h,state};
}
test('post-render encoding exception settles false and releases both single-export controls',async()=>{
 const h=actualRenderer({failEncodingAt:1});h.c.renderWav();await settle();
 assert.equal(h.state.renders,1);assert.equal(h.state.encodes,1);
 assert.equal(h.c.wavBusy,false,'an exception after rendering must settle the returned promise');
 assert.equal(h.nodes.wavBtn.disabled,false);assert.equal(h.nodes.wavBatchBtn.disabled,false);
 assert.ok(h.messages.some(m=>m.failed));assert.equal(h.state.urls.length,0);
});
test('post-render batch failure reports one completed item and does not start the third',async()=>{
 const h=actualRenderer({failEncodingAt:2});h.c.renderBatchWav();await settle();
 assert.equal(h.state.renders,2);assert.equal(h.state.encodes,2);
 assert.equal(h.c.wavBusy,false);assert.equal(h.nodes.wavBtn.disabled,false);assert.equal(h.nodes.wavBatchBtn.disabled,false);
 assert.ok(h.messages.some(m=>m.failed&&m.text.includes('1/3')),'count only successfully generated/requested files');
 assert.deepEqual(h.state.revoked,h.state.urls);assert.equal(h.state.anchors,0);
});
for(const option of ['failURL','failClick'])test(option+' releases the export lock and cleans created URLs/anchors',async()=>{
 const h=actualRenderer({[option]:true});h.c.renderWav();await settle();
 assert.equal(h.c.wavBusy,false);assert.equal(h.nodes.wavBtn.disabled,false);assert.equal(h.nodes.wavBatchBtn.disabled,false);
 assert.ok(h.messages.some(m=>m.failed));assert.deepEqual(h.state.revoked,h.state.urls);assert.equal(h.state.anchors,0);
});
for(const kind of ['reject','throw'])test('single-export '+kind+' from renderer restores both controls',async()=>{
 const h=setup(()=>{if(kind==='throw')throw new Error('sync renderer failure');return Promise.reject(new Error('async renderer failure'));});
 h.c.renderWav();await settle();assert.equal(h.c.wavBusy,false);assert.equal(h.nodes.wavBtn.disabled,false);assert.equal(h.nodes.wavBatchBtn.disabled,false);
 assert.ok(h.messages.some(m=>m.failed));
});
test('failure before batch targets are known reports an unknown total, not an empty successful list',async()=>{
 const h=setup(()=>Promise.resolve(true));h.c.batchTargets=()=>{throw new Error('target construction failed');};
 h.c.renderBatchWav();await settle();assert.equal(h.c.wavBusy,false);assert.equal(h.calls.length,0);
 assert.ok(h.messages.some(m=>m.failed&&m.text.includes('0/?')));
});
