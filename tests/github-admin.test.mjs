import test from 'node:test';
import assert from 'node:assert/strict';
import {GitHubSettings} from '../admin/github-client.js';
import defaults from '../data/defaults.json' with {type:'json'};
const config={repository:'owner/site',branch:'codex/site',file:'data/defaults.json'};
const file=(sha='original',data=defaults)=>({sha,content:Buffer.from(JSON.stringify(data)).toString('base64')});
function fixture(extra=[]){
 const calls=[],responses=[{body:{login:'owner'}},{body:{permissions:{push:true}}},{body:file()},...extra];
 const client=new GitHubSettings(config,async(url,options)=>{
  calls.push({url,...options});const next=responses.shift();assert.ok(next,'unexpected API request');
  return new Response(JSON.stringify(next.body),{status:next.status||200});
 });
 return {client,calls};
}
test('login reads UTF-8 settings and save commits all fields to the configured branch',async()=>{
 const changed={...defaults,street:'Новая улица, 42',prices:{...defaults.prices,klassicheskiy:6500}};
 const {client,calls}=fixture([{body:file()},{body:{content:{sha:'updated'},commit:{sha:'commit'}}}]);
 assert.deepEqual(await client.login('test-key'),{data:defaults,sha:'original'});
 assert.deepEqual(await client.save(changed,'original'),{data:changed,sha:'updated',commit:'commit'});
 const put=calls.at(-1),payload=JSON.parse(put.body);
 assert.equal(put.method,'PUT');assert.equal(payload.sha,'original');assert.equal(payload.branch,config.branch);
 assert.deepEqual(JSON.parse(Buffer.from(payload.content,'base64').toString()),changed);
 for(const call of calls){
  assert.equal(new URL(call.url).origin,'https://api.github.com');
  assert.equal(call.headers.Authorization,'Bearer test-key');assert.equal(call.redirect,'error');assert.equal(call.credentials,'omit');
  assert.ok(!call.url.includes('test-key'));assert.ok(!call.body?.includes('test-key'));
 }
 client.clear();await assert.rejects(client.read(),{status:401});assert.equal(calls.length,5);
});
test('a stale editor cannot overwrite newer changes',async()=>{
 const {client,calls}=fixture([{body:file('changed-elsewhere')}]);
 await client.login('test-key');await assert.rejects(client.save(defaults,'original'),{status:409});
 assert.ok(calls.every(call=>call.method==='GET'));
});
test('GitHub atomic conflict and read-only permissions are reported as failures',async()=>{
 for(const status of [403,409]){
  const {client}=fixture([{body:file()},{status,body:{message:'denied'}}]);
  await client.login('test-key');await assert.rejects(client.save(defaults,'original'),{status});
 }
});
test('failed login clears credentials and never echoes GitHub response or credentials',async()=>{
 let calls=0;
 const client=new GitHubSettings(config,async()=>{calls++;return new Response(JSON.stringify({message:'secret-value'}),{status:401});});
 await assert.rejects(client.login('secret-value'),error=>error.status===401&&!error.message.includes('secret-value'));
 await assert.rejects(client.read(),{status:401});assert.equal(calls,1);
});
test('uncertain writes do not claim success after network failure',async()=>{
 const {client}=fixture([{body:file()}]);await client.login('test-key');
 const fetcher=client.fetcher;client.fetcher=(url,options)=>options.method==='PUT'?Promise.reject(new Error('lost connection')):fetcher(url,options);
 await assert.rejects(client.save(defaults,'original'),/могло сохраниться/);
});
