// Full PHP integration; localhost only. Uses an ignored owner password file in memory.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4175';
const note=await readFile(new URL('../.private/Лавелия-вход.txt',import.meta.url),'utf8');
const password=note.split('\n').find(x=>x.startsWith('Пароль:')).split(':').slice(1).join(':').trim();
let cookie='',csrf='';
async function api(path,method='GET',body,headers={}) {return fetch(origin+'/api/admin/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf,...headers},body:body===undefined?undefined:JSON.stringify(body)});}
assert.equal((await api('settings')).status,401);
assert.equal((await api('login','POST',{password},{Origin:'https://example.org'})).status,403);
assert.equal((await api('login','POST',{password:'wrong'})).status,401);
const res=await api('login','POST',{password});assert.equal(res.status,200,await res.text());
assert.match(res.headers.get('set-cookie'),/HttpOnly/i);assert.match(res.headers.get('set-cookie'),/SameSite=Strict/i);
cookie=res.headers.get('set-cookie').split(';')[0];
const state=await (await api('settings')).json();csrf=state.csrf;let version=state.version;
assert.equal((await api('settings','PUT',{version,data:state.data},{'X-CSRF-Token':'wrong'})).status,403);
assert.equal((await api('settings','PUT',{version,data:{...state.data,phone:'wrong'}})).status,400);
const changed={...state.data,phone:'+77001234567',city:'Тестовый город',street:'Новая & улица, 99',latitude:44,longitude:77,twoGisId:'',prices:Object.fromEntries(Object.keys(state.data.prices).map((k,i)=>[k,6100+100*i]))};
try {
 assert.ok(!(await (await fetch(origin+'/')).text()).includes('/assets/analytics.js'));
 for(const analytics of [{googleAnalyticsId:'<script>alert(1)</script>'},{yandexMetrikaId:'123" onload="x'},'invalid', {googleAnalyticsId:123}]){
  assert.equal((await api('settings','PUT',{version,data:{...changed,analytics}})).status,400);
 }
 changed.analytics={googleAnalyticsId:'G-TEST123456',yandexMetrikaId:'12345678'};
 const save=await api('settings','PUT',{version,data:changed});assert.equal(save.status,200);version=(await save.json()).version;
 assert.equal((await api('settings','PUT',{version:state.version,data:state.data})).status,409);
 for(const path of ['/','/massazh/','/ceny/','/o-mastere/','/kontakty/','/shugaring/',...Object.keys(changed.prices).filter(k=>k!=='shugaring').map(k=>'/massazh/'+k+'/')]){
  const r=await fetch(origin+path);assert.equal(r.status,200,path);const html=await r.text();assert.ok(!/@@|Маркова|77754504382|5 000|2 000/.test(html),path+' stale data');
  assert.ok(html.includes('tel:+77001234567'),path);assert.ok(html.includes('Новая &amp; улица, 99'),path);
  assert.ok(html.includes('data-google="G-TEST123456" data-yandex="12345678"'),path+' analytics');
  assert.equal(html.split('/assets/analytics.js').length,2,path+' single loader');
  for(const [,raw] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g))JSON.parse(raw);
 }
 assert.deepEqual((await (await api('settings')).json()).data,changed);
 const legacy={...changed};delete legacy.analytics;
 const olderClient=await api('settings','PUT',{version,data:legacy});assert.equal(olderClient.status,200);version=(await olderClient.json()).version;
 assert.deepEqual((await (await api('settings')).json()).data.analytics,changed.analytics);
 for(const analytics of [{googleAnalyticsId:'',yandexMetrikaId:'12345678'},{googleAnalyticsId:'g-test123456',yandexMetrikaId:''},{googleAnalyticsId:'',yandexMetrikaId:''}]){
  const saved=await api('settings','PUT',{version,data:{...changed,analytics}});assert.equal(saved.status,200);version=(await saved.json()).version;
  const html=await (await fetch(origin+'/')).text();
  assert.equal(html.includes('/assets/analytics.js'),!!(analytics.googleAnalyticsId||analytics.yandexMetrikaId));
  if(analytics.googleAnalyticsId)assert.ok(html.includes('data-google="G-TEST123456"'));
 }
 assert.ok(!(await (await fetch(origin+'/admin/')).text()).includes('/assets/analytics.js'));
 assert.equal((await fetch(origin+'/does-not-exist/')).status,404);
 assert.equal((await fetch(origin+'/laveliya-private/config.json')).status,404);
}finally{
 const restore=await api('settings','PUT',{version,data:state.data});assert.equal(restore.status,200,'restore data');
}
assert.equal((await api('logout','POST',{})).status,200);
assert.equal((await api('settings')).status,401);
console.log('PASS PHP: password login, sessions, CSRF, validation, save, conflicts, 13 pages, JSON-LD, contacts, private-path isolation, restore, logout.');
