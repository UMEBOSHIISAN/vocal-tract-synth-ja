'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('audition UI never auto-plays and cannot mute a later solo/phrase playback',()=>{
 const m=html.match(/\/\* AUDITION_UI_BEGIN \*\/([\s\S]*?)\/\* AUDITION_UI_END \*\//);assert.ok(m,'audition UI control is missing');assert.match(html,/id="auditionPanel"/);assert.match(html,/id="wavAuditionNote"/);
 const buttons=Array.from({length:13},(_,i)=>({dataset:{listen:String(i-1)},setAttribute(k,v){this[k]=v;}})),nodes={},calls=[];
 const c=vm.createContext({playing:false,anim:null,appMode:'song',choN:12,duetKey:null,listenVoice:3,choExtraCount:n=>n-1,setVoiceAudition:(gs,s)=>calls.push({count:gs.length,selected:s}),document:{getElementById:id=>nodes[id]||(nodes[id]={}),querySelectorAll:()=>buttons}});vm.runInContext(m[1],c);
 c.applyListening();assert.equal(calls.length,0);assert.equal(c.playing,false);assert.equal(buttons[4]['aria-pressed'],'true');
 c.playing=true;c.anim={mode:'song',voices:Array.from({length:12},(_,i)=>({graph:{id:i}}))};c.applyListening();assert.equal(calls.at(-1).selected,3);
 c.listenVoice=99;c.applyListening();assert.equal(calls.at(-1).selected,-1);assert.equal(c.listenVoice,-1);
 c.listenVoice=3;c.anim={mode:'phrase',voices:[{graph:{id:0}}]};c.appMode='phrase';c.applyListening();assert.equal(calls.at(-1).selected,-1);assert.equal(nodes.auditionPanel.hidden,true);
 c.listenVoice=11;c.anim={mode:'song',voices:[{graph:{id:0}}]};c.appMode='song';c.choN=1;c.applyListening();assert.equal(calls.at(-1).selected,-1);assert.equal(c.listenVoice,-1);
});
