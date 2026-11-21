// Exercise the real local Worker + D1. Never runs against a remote environment.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='http://localhost:4174';
const {password}=JSON.parse(await readFile(new URL('../.preview/admin-test-secret.json',import.meta.url)));
let cookie='',csrf='';
async function api(path,method='GET',value,overrides={}){
 const headers={Origin:origin,'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf,...overrides};
 return fetch(origin+'/api/admin/'+path,{method,headers,body:value===undefined?undefined:JSON.stringify(value)});
}
assert.equal((await api('settings')).status,401);
assert.equal((await api('settings','PUT',{})).status,401);
assert.equal((await api('login','POST',{password},{Origin:'https://evil.test'})).status,403);
assert.equal((await api('login','POST',{password:'wrong'})).status,401);
const login=await api('login','POST',{password});assert.equal(login.status,200);
assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));assert.ok(login.headers.get('set-cookie').includes('SameSite=Strict'));
cookie=login.headers.get('set-cookie').split(';')[0];
const original=await (await api('settings')).json();csrf=original.csrf;let version=original.version;
assert.equal((await api('settings','PUT',{data:original.data,version},{'X-CSRF-Token':'wrong'})).status,403);
assert.equal((await api('settings','PUT',{data:{...original.data,phone:'bad'},version})).status,400);
const changed={...original.data,phone:'+77001234567',city:'Тестовый город',street:'Тестовая, 99',latitude:43.25,longitude:76.95,twoGisId:'',prices:Object.fromEntries(Object.keys(original.data.prices).map((id,i)=>[id,6100+i*100]))};
try{
 const response=await api('settings','PUT',{data:changed,version});assert.equal(response.status,200);const result=await response.json();version=result.version;
 assert.equal((await api('settings','PUT',{data:original.data,version:original.version})).status,409);
 for(const path of ['/','/massazh/','/ceny/','/shugaring/','/kontakty/',...Object.keys(changed.prices).filter(k=>k!=='shugaring').map(k=>'/massazh/'+k+'/')]){
  const page=await fetch(origin+path),html=await page.text();assert.equal(page.status,200,path);
  assert.ok(!/@@|Маркова|77051310339|5 000|2 000/.test(html),path+' stale values');
  assert.ok(html.includes('tel:+77001234567'));assert.ok(html.includes('Тестовая, 99'));
 }
 const repeated=await (await api('settings')).json();assert.deepEqual(repeated.data,changed);
}finally{
 const response=await api('settings','PUT',{data:original.data,version});assert.equal(response.status,200,'restore original settings');
}
assert.equal((await api('logout','POST',{})).status,200);
assert.equal((await api('settings')).status,401);
console.log('PASS: real D1 saves, independent prices, all-page rendering, contact links, authentication, CSRF, validation, version conflicts, logout. Original settings restored.');
