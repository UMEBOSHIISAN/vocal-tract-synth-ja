"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
function setup(mode,kyo=true){
 const score=[{dur:.4,f0a:98,f0b:98,mora:0,bw:[100,25,200],f:[500,980,2500]},{dur:.2,f0a:0,f0b:0,type:"pause",mora:1}];
 const c=vm.createContext({choVoicing:mode,ANAT:{chorus:{cents:Array(11).fill(0),vtl:Array(11).fill(0)},quality:{}},CUR:{vtl:15.8},qualityConfig:x=>({human:{}}),ensembleScore:x=>x,buildSongScoreAs:()=>score,speakerForVtl:x=>x});
 vm.runInContext(html.match(/function choScore\(song, i\)[\s\S]*?(?=      function choGraph)/)[0],c);
 return {c,score,song:{def:{kyo}}};
}
test("low chant distributes registers while preserving words, timing, silence and vowel body",()=>{
 const {c,score,song}=setup("low"),before=JSON.stringify(score),notes=new Set();
 for(let i=1;i<=11;i++){
  const out=c.choScore(song,i); notes.add(out[0].f0a);
  assert.equal(out.length,2);assert.equal(out[0].dur,.4);assert.equal(out[0].mora,0);assert.equal(out[1].dur,.2);assert.equal(out[1].f0a,0);
  assert.equal(out[0].f[0],500);assert.equal(out[0].f[2],2500);
  assert.ok([49,73.5,98].includes(out[0].f0a));
 }
 assert.ok(notes.has(49)&&notes.has(73.5)&&notes.has(98),"missing bass/fifth/octave parts");assert.equal(JSON.stringify(score),before);
});
test("unison and other songs retain original tuning",()=>{
 for(const [mode,kyo] of [["unison",true],["low",false]]){const {c,song}=setup(mode,kyo);for(let i=1;i<=11;i++)assert.equal(c.choScore(song,i)[0].f0a,98);}
});
