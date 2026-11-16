"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const c=vm.createContext({});
vm.runInContext(html.match(/function otSnap\(f, f0\)[\s\S]*?(?=      var speakerKey)/)[0],c);
const base={snap:1,root:-0.1};
test("defaults keep the old result",()=>{
 assert.deepEqual(Array.from(c.otVowelF([700,1200,2500],98,base)),Array.from(c.otSnap([700,1200,2500],98)));
 const segs=[{dur:1,f0a:98,f0b:98,type:"vowel",f:[700,1176,2500]}],before=JSON.stringify(segs);
 assert.equal(JSON.stringify(c.otRise(segs,0,1)),before);
});
test("snap off leaves the vowel formants",()=>{
 assert.deepEqual(Array.from(c.otVowelF([700,1200,2500],98,{snap:0,root:-0.1})),[700,1200,2500]);
});
test("tongue root moves F2 up and F3 down, F1 stays",()=>{
 const lo=c.otVowelF([700,1200,2500],180,{snap:0,root:0}),hi=c.otVowelF([700,1200,2500],180,{snap:0,root:1});
 assert.deepEqual(Array.from(lo),[700,1000,3500]);assert.deepEqual(Array.from(hi),[700,2300,2500]);
 const sn=c.otVowelF([700,1200,2500],180,{snap:1,root:0.5});
 assert.equal(sn[1]%180,0);assert.equal(sn[2],3000);
});
test("rise lifts pitch over the piece and keeps the same harmonic",()=>{
 const segs=[{dur:1,f0a:100,f0b:100,type:"vowel",f:[700,1000,2500]},{dur:1,f0a:100,f0b:100,type:"vowel",f:[700,1000,2500]},{dur:2,f0a:100,f0b:100,type:"pause",f:[700,1000,2500]}];
 c.otRise(segs,1200,1);
 assert.equal(segs[0].f0a,100);
 assert.ok(Math.abs(segs[1].f0a-100*Math.pow(2,0.25))<1e-9);
 assert.ok(Math.abs(segs[1].f[1]/segs[1].f0a-10)<1e-9);
 assert.ok(Math.abs(segs[2].f0a-100*Math.pow(2,0.5))<1e-9);assert.equal(segs[2].f[1],1000);
});
test("new fields and controls exist with defaults that change nothing",()=>{
 assert.match(html,/snap: 1, root: -0\.1, rise: 0, vibRate: 5\.5, vibCents: 0 \}/);
 for(const k of ["f0","snap","root","rise","vibCents","vibRate"])assert.ok(html.includes('{ k: "'+k+'"'),k);
 assert.ok(html.includes('id="otMeasured"'));
});
