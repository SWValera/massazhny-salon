import test from 'node:test';
import assert from 'node:assert/strict';
import {sealAccess,openAccess} from '../admin/password-vault.js';
const password='test-only-long-password',token='test-only-credential',repository='owner/site';
test('public vault contains neither password nor credential, and decrypts only with the correct password',async()=>{
 const vault=await sealAccess(password,token,repository),publicFile=JSON.stringify(vault);
 assert.ok(!publicFile.includes(password));assert.ok(!publicFile.includes(token));
 assert.equal(await openAccess(password,vault,repository),token);
 await assert.rejects(openAccess('wrong-password',vault,repository),/Неверный пароль/);
});
test('encrypted credential is bound to its repository and tampering is rejected',async()=>{
 const vault=await sealAccess(password,token,repository);
 await assert.rejects(openAccess(password,vault,'someone/else'),/не настроен/);
 await assert.rejects(openAccess(password,{...vault,repository:'someone/else'},'someone/else'),/Неверный пароль/);
 const bytes=Buffer.from(vault.ciphertext,'base64');bytes[0]^=1;
 await assert.rejects(openAccess(password,{...vault,ciphertext:bytes.toString('base64')},repository),/Неверный пароль/);
});
test('fresh salt and IV produce distinct ciphertext; weak setup passwords are refused',async()=>{
 const first=await sealAccess(password,token,repository),second=await sealAccess(password,token,repository);
 assert.notEqual(first.salt,second.salt);assert.notEqual(first.iv,second.iv);assert.notEqual(first.ciphertext,second.ciphertext);
 await assert.rejects(sealAccess('1234',token,repository));
});
