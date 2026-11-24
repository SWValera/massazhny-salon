import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../assets/analytics.js',import.meta.url),'utf8');
function run(config={},pathname='/'){
 const scripts=[],window={location:{pathname}};
 const document={currentScript:{dataset:config},createElement:()=>({}),head:{append:s=>scripts.push(s)}};
 const context={window,document};runInNewContext(source,context);
 return {window,scripts,again:()=>runInNewContext(source,context)};
}
test('empty or invalid IDs make no third-party requests',()=>{
 for(const config of [{},{google:'GTM-ABCDE',yandex:'<script>'},{google:'G-ABC\" onclick=',yandex:'0'}])assert.equal(run(config).scripts.length,0);
});
test('GA4 loads correct library and configures one page view',()=>{
 const r=run({google:'G-TEST123456'});
 assert.equal(r.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-TEST123456');
 assert.equal(r.scripts[0].async,true);
 assert.deepEqual(Array.from(r.window.dataLayer[1]),['config','G-TEST123456']);
 r.again();assert.equal(r.scripts.length,1);assert.equal(r.window.dataLayer.length,2);
});
test('Metrica works independently or together, without Webvisor',()=>{
 for(const google of ['', 'G-TEST123456']){
  const r=run({google,yandex:'12345678'});
  assert.equal(r.scripts.length,google?2:1);
  assert.equal(r.scripts.at(-1).src,'https://mc.yandex.ru/metrika/tag.js');
  assert.equal(r.window.ym.a[0][0],12345678);assert.equal(r.window.ym.a[0][1],'init');
  assert.equal(r.window.ym.a[0][2].webvisor,false);
 }
});
test('admin and API never initialize analytics',()=>{
 for(const path of ['/admin','/admin/','/api/admin/settings'])assert.equal(run({google:'G-TEST123456',yandex:'12345678'},path).scripts.length,0);
});
