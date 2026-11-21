import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {renderPage,validateSettings} from '../cloudflare/render.js';
const out=resolve(process.argv[2]);
const pages=JSON.parse(await readFile(new URL('../cloudflare/pages.json',import.meta.url)));
const dataFile=new URL('../data/defaults.json',import.meta.url);
const data=validateSettings(JSON.parse(await readFile(dataFile)));
for(const [path,template] of Object.entries(pages)){
 const dir=join(out,path);await mkdir(dir,{recursive:true});
 const html=renderPage(template,path,data,{});
 await writeFile(join(dir,'index.html'),html);
 if(path==='/404/')await writeFile(join(out,'404.html'),html);
}
// The published marker allows the admin to confirm actual deployment, not just a commit.
const sha=execFileSync('git',['hash-object',fileURLToPath(dataFile)],{encoding:'utf8'}).trim();
await writeFile(join(out,'deployment.json'),JSON.stringify({settingsSha:sha,builtAt:new Date().toISOString()}));
