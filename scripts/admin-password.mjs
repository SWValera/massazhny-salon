// Run locally: node scripts/admin-password.mjs. Input is hidden; prints only a hash.
import {pbkdf2Sync,randomBytes} from 'node:crypto';
import readline from 'node:readline';
if(!process.stdin.isTTY)throw new Error('Run this command in an interactive terminal.');
process.stderr.write('Новый пароль администратора (минимум 16 символов): ');
process.stdin.setRawMode(true);process.stdin.resume();
let password='';
process.stdin.on('data',chunk=>{
 for(const char of chunk.toString()){
  if(char==='\u0003'){process.stdin.setRawMode(false);process.exit(1);}
  if(char==='\r'||char==='\n'){
   process.stdin.setRawMode(false);process.stderr.write('\n');
   if(password.length<16){process.stderr.write('Пароль слишком короткий.\n');process.exit(1);}
   const salt=randomBytes(16).toString('hex');
   console.log('pbkdf2$100000$'+salt+'$'+pbkdf2Sync(password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex'));process.exit(0);
  }
  if(char==='\u007f')password=password.slice(0,-1);else password+=char;
 }
});
