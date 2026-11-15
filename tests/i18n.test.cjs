'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function core() {
  const found = html.match(/\/\* UI_LOCALE_CORE_BEGIN \*\/([\s\S]*?)\/\* UI_LOCALE_CORE_END \*\//);
  assert.ok(found, 'embedded locale core must exist in the actual standalone HTML');
  const c = vm.createContext({ URLSearchParams });
  vm.runInContext(found[1], c);
  return c;
}
test('locale preference is explicit query, valid saved choice, then Japanese; storage failures are harmless', () => {
  const c = core();
  const saved = { getItem: () => 'en' };
  assert.equal(c.chooseUILocale('', null), 'ja');
  assert.equal(c.chooseUILocale('?lang=ja', saved), 'ja');
  assert.equal(c.chooseUILocale('?lang=en', { getItem: () => 'ja' }), 'en');
  assert.equal(c.chooseUILocale('?lang=unsupported', saved), 'en');
  assert.equal(c.chooseUILocale('', { getItem() { throw new Error('blocked storage'); } }), 'ja');
  assert.equal(c.chooseUILocale('', { getItem: () => '<script>' }), 'ja');
  assert.equal(c.chooseUILocale('?lang=en%3Cscript%3E', null), 'ja');
});

test('translation is literal, whitespace preserving and limited to declared UI text', () => {
  const c = core();
  assert.equal(typeof c.createUITranslator, 'function', 'UI translator must be implemented');
  const tr = c.createUITranslator([
    { ja: '待機中', en: 'Ready', mode: 'exact' },
    { ja: '全員', en: 'Everyone', mode: 'fragment' },
    { ja: '試聴中：', en: 'Listening: ', mode: 'fragment' },
    { ja: '推定 (A+B)', en: 'Estimated (A+B)', mode: 'fragment' }
  ]);
  assert.equal(tr('  待機中\n', 'en'), '  Ready\n');
  assert.equal(tr('試聴中：全員 / 12', 'en'), 'Listening: Everyone / 12');
  assert.equal(tr('値: 推定 (A+B)', 'en'), '値: Estimated (A+B)');
  assert.equal(tr('かえるぴょこぴょこ', 'en'), 'かえるぴょこぴょこ');
  assert.equal(tr('観自在菩薩', 'en'), '観自在菩薩');
  assert.equal(tr('試聴中：全員', 'ja'), '試聴中：全員');
  assert.throws(() => c.createUITranslator([{ ja:'同じ', en:'A', mode:'exact' }, { ja:'同じ', en:'B', mode:'exact' }]), /duplicate/);
  assert.throws(() => c.createUITranslator([{ ja:'声', en:'voice', mode:'fragment' }]), /fragment/);
});

test('numbered harmonic canvas labels are formatted without a broad one-character translation', () => {
  const tr=core().createUITranslator([]);
  assert.equal(tr('第6倍音 ≈ 600 Hz','en'),'Harmonic 6 ≈ 600 Hz');
  assert.equal(tr('第6倍音 ≈ 600 Hz','ja'),'第6倍音 ≈ 600 Hz');
  assert.equal(tr('第一の例','en'),'第一の例');
});

test('per-node canonical text survives duplicate English labels and fresh dynamic updates', () => {
  const c = core();
  assert.equal(typeof c.uiLocaleTextState, 'function', 'canonical locale state must be implemented');
  const tr = c.createUITranslator([
    { ja:'待機中', en:'Ready', mode:'exact' },
    { ja:'準備完了', en:'Ready', mode:'exact' },
    { ja:'失敗しました', en:'Failed', mode:'exact' }
  ]);
  const a = c.uiLocaleTextState(null, '待機中', 'en', tr);
  const b = c.uiLocaleTextState(null, '準備完了', 'en', tr);
  assert.equal(a.output, b.output);
  assert.equal(c.uiLocaleTextState(a, a.output, 'ja', tr).output, '待機中');
  assert.equal(c.uiLocaleTextState(b, b.output, 'ja', tr).output, '準備完了');
  assert.equal(c.uiLocaleTextState(a, '待機中', 'en', tr).output, 'Ready', 'same Japanese rewrite while English still renders English');
  const updated = c.uiLocaleTextState(a, '失敗しました', 'en', tr);
  assert.equal(updated.output, 'Failed');
  assert.equal(c.uiLocaleTextState(updated, updated.output, 'ja', tr).output, '失敗しました', 'do not restore an obsolete initial label');
});

test('DOM locale switching preserves form values and phonetic content while refreshing dynamic text and ARIA', () => {
  const c = core();
  const part = html.match(/\/\* UI_LOCALE_DOM_BEGIN \*\/([\s\S]*?)\/\* UI_LOCALE_DOM_END \*\//);
  assert.ok(part, 'the standalone app must provide its locale DOM renderer');
  vm.runInContext(part[1], c);
  function element(tag, attrs = {}, children = []) {
    const el = { nodeType:1, tagName:tag.toUpperCase(), childNodes:[], parentElement:null,
      value:attrs.value || '', isContentEditable:false,
      hasAttribute:k => Object.hasOwn(attrs,k), getAttribute:k => attrs[k] ?? null,
      setAttribute(k,v) { attrs[k] = String(v); }, addEventListener() {},
      append(child) { child.parentElement=el; el.childNodes.push(child); return child; } };
    Object.defineProperty(el, 'textContent', { get() { return el.childNodes.map(n => n.nodeValue ?? n.textContent).join(''); }, set(value) { el.childNodes=[]; el.append(text(String(value))); } });
    children.forEach(n=>el.append(n));
    return el;
  }
  function text(value) { return { nodeType:3, nodeValue:value, parentElement:null }; }
  const label=element('span',{},[text('待機中')]);
  const live=element('p',{'aria-label':'待機中'},[text('待機中')]);
  const kana=element('span',{'data-i18n-preserve':''},[text('待機中')]);
  const input=element('input',{value:'待機中'});
  const textarea=element('textarea',{},[text('待機中')]); textarea.value='入力した仮名';
  const option=element('option',{value:'internal-value'},[text('待機中')]);
  const select=element('select',{},[option]);select.value='internal-value';select.selectedIndex=0;
  const buttons=['ja','en'].map(lang=>element('button',{'data-ui-lang':lang}));
  const body=element('body',{},[label,live,kana,input,textarea,select,...buttons]);
  const doc={body,documentElement:{lang:'ja'},title:'待機中',querySelectorAll:()=>buttons};
  const storage={getItem:()=>null,setItem(){throw new Error('storage denied');}};
  const api=c.createUILocaleDOM(doc,[{ja:'待機中',en:'Ready',mode:'exact'},{ja:'新しい表示',en:'Updated',mode:'exact'}],storage,'');
  api.init();api.setLanguage('en');
  assert.equal(doc.documentElement.lang,'en');
  assert.equal(label.textContent,'Ready');assert.equal(live.getAttribute('aria-label'),'Ready');
  assert.equal(kana.textContent,'待機中');assert.equal(textarea.value,'入力した仮名');assert.equal(textarea.textContent,'待機中');
  assert.equal(input.value,'待機中');assert.equal(option.value,'internal-value');assert.equal(select.value,'internal-value');assert.equal(select.selectedIndex,0);
  assert.equal(option.textContent,'Ready');
  api.text(live,'新しい表示');assert.equal(live.textContent,'Updated');
  api.setLanguage('ja');assert.equal(live.textContent,'新しい表示');assert.equal(label.textContent,'待機中');
  assert.equal(buttons[0].getAttribute('aria-pressed'),'true');
  assert.equal(api.setLanguage('unsupported'),false);assert.equal(doc.documentElement.lang,'ja');
});

function readoutFixture() {
  const c=core();
  vm.runInContext(html.match(/\/\* UI_LOCALE_DOM_BEGIN \*\/([\s\S]*?)\/\* UI_LOCALE_DOM_END \*\//)[1],c);
  vm.runInContext(html.match(/\/\* UI_TRANSLATIONS_BEGIN \*\/([\s\S]*?)\/\* UI_TRANSLATIONS_END \*\//)[1],c);
  function text(value){return {nodeType:3,nodeValue:value,parentElement:null};}
  function element(attrs={}){
    const e={nodeType:1,tagName:'SPAN',childNodes:[],parentElement:null,isContentEditable:false,
      hasAttribute:k=>Object.hasOwn(attrs,k),getAttribute:k=>attrs[k]??null,setAttribute(k,v){attrs[k]=String(v);},
      append(n){n.parentElement=e;e.childNodes.push(n);}};
    Object.defineProperty(e,'textContent',{get(){return e.childNodes.map(n=>n.nodeValue??n.textContent).join('');},set(v){e.childNodes=[];e.append(text(String(v)));}});
    Object.defineProperty(e,'innerHTML',{set(v){
      const match=String(v).match(/^(.*?)<b([^>]*)>(.*?)<\/b>$/);
      assert.ok(match,'readout fixture only accepts the actual NEXT/b markup');e.childNodes=[];e.append(text(match[1]));
      const b=element(match[2].includes('data-i18n-preserve')?{'data-i18n-preserve':''}:{});b.textContent=match[3];e.append(b);
    }});
    return e;
  }
  const rootMarkup=html.match(/<[^>]+id="nowNext"[^>]*>/)[0];
  const nodes={nowKind:element(),nowMemo:element(),nowKana:element({'data-i18n-preserve':''}),
    nowRoma:element({'data-i18n-preserve':''}),nowNext:element(rootMarkup.includes('data-i18n-preserve')?{'data-i18n-preserve':''}:{})};
  const body=element();Object.values(nodes).forEach(n=>body.append(n));
  const doc={body,documentElement:{lang:'ja'},title:'Fixture',querySelectorAll:()=>[]};
  const api=c.createUILocaleDOM(doc,c.UI_TRANSLATIONS,null,'?lang=en');api.init();
  Object.assign(c,nodes,{dispKey:'',appMode:'song',markTiles(){},
    SEQ:[{kana:'あ',roma:'a',vowel:'a'},{kana:'い',roma:'i',vowel:'i'}],VOWEL_MEMO:{a:'あの説明',i:'いの説明'},
    CONS_NAME:{},CONS_MEMO:{},VKANA:{a:'あ',i:'い'},uiText:(e,s)=>api.text(e,s),uiHTML:(e,s)=>api.html(e,s)});
  const start=html.indexOf('      function setReadout('),end=html.indexOf('      function fmt(',start);
  assert.ok(start>=0&&end>start,'extract actual readout, not a reimplementation');vm.runInContext(html.slice(start,end),c);
  return {c,api,nodes};
}
test('song label and note survive EN to JA in the same cached segment',()=>{
  const h=readoutFixture(),seg={mora:0,phase:'vowel',type:'vowel',noteName:'A4',noteFreq:440};
  h.c.setReadout(seg);assert.equal(h.nodes.nowKind.textContent,'Vowel /a/ — あ ♪ A4 440 Hz');
  h.api.setLanguage('ja');h.c.setReadout(seg);
  assert.equal(h.nodes.nowKind.textContent,'母音 /a/ — あ ♪ A4 440 Hz','cached display key must not retain the translated label');
});
test('NEXT preserves Japanese phonemes but localizes the final end status',()=>{
  const h=readoutFixture();h.c.setReadout({mora:0,phase:'vowel',type:'vowel'});
  assert.equal(h.nodes.nowNext.textContent,'NEXT → い i');
  h.c.setReadout({mora:1,phase:'vowel',type:'vowel'});assert.equal(h.nodes.nowNext.textContent,'NEXT — End');
  h.api.setLanguage('ja');assert.equal(h.nodes.nowNext.textContent,'NEXT — おわり');
});
test('app-managed locale opts out of browser automatic translation',()=>{
  assert.match(html,/<html\b[^>]*\btranslate="no"/i);
  assert.match(html,/<meta\b[^>]*name="google"[^>]*content="notranslate"/i);
});
