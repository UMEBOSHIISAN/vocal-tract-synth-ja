'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('standalone initial assets are embedded; source links are not automatic resource loads',()=>{
 const assets=[...html.matchAll(/<(link|script|img|audio|video|source)\b[^>]*(?:href|src)=["'](https?:[^"']+)["'][^>]*>/gi)];
 assert.deepEqual(assets.map(m=>m[2]),[],'initial external stylesheet/preconnect/script/media resources must be absent');
 assert.doesNotMatch(html,/@import\s|url\(\s*["']?https?:/i);
 assert.match(html,/href="https:\/\//,'retain clickable citations rather than deleting provenance');
 assert.doesNotMatch(html,/__film|__p12|__probe/,'owner-local test/capture instrumentation must not ship');
});

test('complete owner and upstream MIT notices survive copying only the HTML',()=>{
 assert.ok(fs.existsSync(path.join(root,'LICENSE')),'owner-selected MIT LICENSE is required');
 assert.ok(fs.existsSync(path.join(root,'THIRD_PARTY_NOTICES.md')),'third-party notice is required');
 const own=fs.readFileSync(path.join(root,'LICENSE'),'utf8');
 const ownEmbedded=html.match(/\nOWN_MIT_BEGIN\n([\s\S]*?)\nOWN_MIT_END/);
 const upstream=html.match(/\nCHIMERA_MIT_BEGIN\n([\s\S]*?)\nCHIMERA_MIT_END/);
 assert.ok(ownEmbedded&&upstream,'both complete notices must be embedded');
 assert.equal(ownEmbedded[1]+'\n',own);
 assert.match(own,/Copyright \(c\) 2026 UMEBOSHIISAN/);
 assert.match(own,/Permission is hereby granted/);
 assert.match(own,/THE SOFTWARE IS PROVIDED "AS IS"/);
 const upstreamText=upstream[1]+'\n';
 assert.equal(crypto.createHash('sha256').update(upstreamText).digest('hex'),'0b8d6e0649e7b2068a8300cafb9ebded80d9a0fe99e699b96538ba0a8c5236b1','verbatim upstream MIT text at cd98192b');
 const notices=fs.readFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),'utf8');
 assert.ok(notices.includes(upstreamText));
 assert.match(notices,/cd98192b421dcbbe0738798f6ef7f56ca9ed9ac3/);
});

test('candidate excludes unconfirmed Japanese translation and recording-derived demo data',()=>{
 assert.equal(/きらきらひかる|おそらのほしよ/.test(html),false,'uncleared modern Japanese lyric must not remain, even in source comments');
 const a=html.indexOf('      var SONGS = {'),b=html.indexOf('      var currentSong = null;',a);
 assert.ok(a>=0&&b>a,'song data extraction boundary');
 const c=vm.createContext({});vm.runInContext(html.slice(a,b),c);
 assert.equal(c.SONGS.honke.file,'scale-scat','the video-derived demo is replaced by an independent scale exercise');
 assert.equal(c.SONGS.twinkle.variants.jp.file,'twinkle-solfege');
 assert.deepEqual(JSON.parse(JSON.stringify(c.SONGS.twinkle.repoNotes)),[[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2]],'text replacement must retain the upstream pitch/beat sequence');
 assert.doesNotMatch(c.SONGS.honke.desc,/録画|自己相関|デモ動画/);
});
