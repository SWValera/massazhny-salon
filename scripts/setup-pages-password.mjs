// Owner-only setup. Read credentials from stdin, never shell arguments or logs.
// Example: supply JSON {"token":"..."} through a secure local prompt/pipe.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {sealAccess} from '../admin/password-vault.js';
const args=process.argv.slice(2);
const option=(name,fallback)=>{const index=args.indexOf(name);return index<0?fallback:args[index+1];};
const vaultPath=resolve(option('--vault','data/admin-access.json'));
const passwordPath=resolve(option('--password-file','.private/Лавелия-вход.txt'));
try{await access(vaultPath);throw new Error('Access is already configured. Use a separate output file for deliberate rotation.');}catch(error){if(error.code!=='ENOENT')throw error;}
const chunks=[];let size=0;
for await(const chunk of process.stdin){size+=chunk.length;if(size>8192)throw new Error('Input too large');chunks.push(chunk);}
const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
if(typeof input.token!=='string'||!input.token.startsWith('github_pat_'))throw new Error('Use a dedicated fine-grained token for massazhny-salon only.');
const password=input.password||randomBytes(18).toString('base64url');
const vault=await sealAccess(password,input.token,'SWValera/massazhny-salon');
await mkdir(dirname(passwordPath),{recursive:true,mode:0o700});
await writeFile(passwordPath,'Лавелия — вход в админку\n\nАдрес: https://swvalera.github.io/massazhny-salon/admin/\nПароль: '+password+'\n\nСохраните пароль в менеджере паролей телефона. Этот файл предназначен только для владельца и администратора сайта.\n',{mode:0o600,flag:'wx'});
await mkdir(dirname(vaultPath),{recursive:true});
await writeFile(vaultPath,JSON.stringify(vault,null,2)+'\n',{flag:'wx'});
console.log('Created encrypted access file. Password saved only to the private owner file.');
