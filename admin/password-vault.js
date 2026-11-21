// Public encryption metadata is safe to publish. The password and decrypted
// credential never appear in source files or persistent browser storage.
const encoder=new TextEncoder();
export const VAULT_VERSION=1;
export const VAULT_ROUNDS=600000;
const encode=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const context=repository=>encoder.encode('laveliya-admin:'+repository+':v1');
async function derive(password,salt,usage){
 const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:VAULT_ROUNDS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,[usage]);
}
export async function sealAccess(password,token,repository){
 if(typeof password!=='string'||password.length<16)throw new Error('Используйте пароль не короче 16 символов.');
 if(typeof token!=='string'||!token.trim()||!repository)throw new Error('Не задан технический доступ к сайту.');
 const salt=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await derive(password,salt,'encrypt');
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:context(repository),tagLength:128},key,encoder.encode(token.trim()));
 return {version:VAULT_VERSION,rounds:VAULT_ROUNDS,repository,salt:encode(salt),iv:encode(iv),ciphertext:encode(ciphertext)};
}
export async function openAccess(password,vault,repository){
 if(!vault||vault.version!==VAULT_VERSION||vault.rounds!==VAULT_ROUNDS||vault.repository!==repository)throw new Error('Вход ещё не настроен. Обратитесь к разработчику сайта.');
 if(typeof password!=='string'||!password||password.length>256)throw new Error('Введите пароль администратора.');
 try{
  const salt=decode(vault.salt),iv=decode(vault.iv),ciphertext=decode(vault.ciphertext);
  if(salt.length!==32||iv.length!==12||ciphertext.length<17||ciphertext.length>2048)throw new Error('invalid vault');
  const key=await derive(password,salt,'decrypt');
  const result=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:context(repository),tagLength:128},key,ciphertext);
  return new TextDecoder('utf-8',{fatal:true}).decode(result);
 }catch{throw new Error('Неверный пароль. Проверьте раскладку клавиатуры и попробуйте ещё раз.');}
}
