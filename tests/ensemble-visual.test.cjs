'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
test('3D line and fill keep the selected-singer opacity instead of resetting it',()=>{
 const b=html.indexOf('      function g3Line('),e=html.indexOf('      function fillBand(',b);assert.ok(b>=0&&e>b);
 const c=vm.createContext({g3Proj:(x,y,z)=>[x,y,0],g3Fog:()=>.5});vm.runInContext(html.slice(b,e),c);
 const seen=[],noop=()=>{},ctx={globalAlpha:.2,beginPath:noop,moveTo:noop,lineTo:noop,closePath:noop,stroke(){seen.push(this.globalAlpha);},fill(){seen.push(this.globalAlpha);}};
 const pts=[[0,0],[1,1],[2,0]];c.g3Line(ctx,{},pts,'white',1,false);assert.equal(seen[0],.2*.5,'line ignores singer opacity');assert.equal(ctx.globalAlpha,.2);
 c.g3Fill(ctx,{},pts,'white');assert.equal(seen[1],.2*.5);assert.equal(ctx.globalAlpha,.2);
});
