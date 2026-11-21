import pages from './pages.json' with {type:'json'};
import {renderPage,validateSettings,services} from './render.js';
const encoder=new TextEncoder();
const hex=bytes=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const now=()=>Math.floor(Date.now()/1000);
const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY'};
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{...security,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow',...extra}});}
function cookie(request,token,maxAge=28800){return `laveliya_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
async function body(request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new Error('Ожидаются данные формы.');
  if(!request.body)throw new Error('Нет данных формы.');
  const reader=request.body.getReader();let size=0;const parts=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new Error('Слишком большой запрос.');}parts.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function session(request,env){
  const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)laveliya_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!token)return null;
  return env.DB.prepare('SELECT token_hash,csrf,expires FROM sessions WHERE token_hash=? AND expires>?').bind(await digest(token),now()).first();
}
async function verifyPassword(password,encoded){
  if(typeof password!=='string'||password.length>256||!encoded)return false;
  const [algorithm,rounds,salt,expected]=encoded.split('$');
  if(algorithm!=='pbkdf2'||Number(rounds)!==100000||!/^([a-f0-9]{2}){16,64}$/.test(salt||'')||!/^[a-f0-9]{64}$/.test(expected||''))return false;
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const actual=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:Uint8Array.from(salt.match(/../g),x=>parseInt(x,16)),iterations:Number(rounds),hash:'SHA-256'},key,256));
  let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);
  return diff===0;
}
async function settings(env){
  const row=await env.DB.prepare('SELECT data,version,updated_at FROM settings WHERE id=1').first();
  if(!row)throw new Error('Database is not initialized');
  return {data:JSON.parse(row.data),version:row.version,updatedAt:row.updated_at};
}
async function api(request,env,path){
  if(!['GET','POST','PUT'].includes(request.method))return json({error:'Метод не поддерживается.'},405);
  if(request.method!=='GET' && request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Недопустимый источник запроса.'},403);
  if(path==='/api/admin/login'&&request.method==='POST'){
    if(!env.ADMIN_PASSWORD_HASH)return json({error:'Вход ещё не настроен. Обратитесь к владельцу сайта.'},503);
    const input=await body(request);
    const key=await digest(request.headers.get('CF-Connecting-IP')||'local');
    const time=now();
    const bucket=Math.floor(time/900);
    const keys=[`ip:${bucket}:${key}`,`all:${bucket}`];
    await env.DB.batch(keys.map(k=>env.DB.prepare('INSERT INTO login_attempts(key,attempts,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').bind(k,(bucket+1)*900)));
    const attempts=await env.DB.prepare('SELECT key,attempts FROM login_attempts WHERE key IN (?,?)').bind(...keys).all();
    if(attempts.results.some(row=>row.attempts>(row.key.startsWith('ip:')?10:60)))return json({error:'Слишком много попыток. Попробуйте через 15 минут.'},429,{'Retry-After':'900'});
    if(!await verifyPassword(input.password,env.ADMIN_PASSWORD_HASH))return json({error:'Неверный пароль.'},401);
    const token=random(),csrf=random();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE expires<=?').bind(time),
      env.DB.prepare('DELETE FROM login_attempts WHERE expires<=?').bind(time),
      env.DB.prepare('INSERT INTO sessions(token_hash,csrf,expires) VALUES (?,?,?)').bind(await digest(token),csrf,time+28800)
    ]);
    return json({ok:true},200,{'Set-Cookie':cookie(request,token)});
  }
  const auth=await session(request,env);
  if(!auth)return json({error:'Войдите в админку.'},401);
  if(request.method!=='GET'&&request.headers.get('X-CSRF-Token')!==auth.csrf)return json({error:'Обновите страницу и повторите сохранение.'},403);
  if(path==='/api/admin/logout'&&request.method==='POST'){
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(auth.token_hash).run();
    return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
  }
  if(path==='/api/admin/settings'&&request.method==='GET')return json({...await settings(env),services,csrf:auth.csrf});
  if(path==='/api/admin/settings'&&request.method==='PUT'){
    const input=await body(request);
    const data=validateSettings(input.data);
    if(!Number.isSafeInteger(input.version)||input.version<1)return json({error:'Обновите страницу перед сохранением.'},400);
    const result=await env.DB.prepare('UPDATE settings SET data=?,version=version+1,updated_at=? WHERE id=1 AND version=?').bind(JSON.stringify(data),now(),input.version).run();
    if(result.meta.changes!==1)return json({error:'Данные уже изменены в другом окне. Обновите страницу, чтобы увидеть актуальные значения.'},409);
    return json({...await settings(env),ok:true});
  }
  return json({error:'Страница не найдена.'},404);
}
export default {
  async fetch(request,env){
    const url=new URL(request.url),path=url.pathname;
    try {
      if(path.startsWith('/api/admin/')){
        try{return await api(request,env,path);}catch(error){if(error instanceof SyntaxError||error.message.startsWith('Проверьте')||error.message.startsWith('Заполните')||error.message.startsWith('Цена ')||error.message.startsWith('Введите')||['Ожидаются данные формы.','Нет данных формы.','Слишком большой запрос.'].includes(error.message))return json({error:error instanceof SyntaxError?'Некорректные данные.':error.message},400);throw error;}
      }
      if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:security});
      if(path==='/admin')return Response.redirect(url.origin+'/admin/',308);
      if(path.startsWith('/admin/')){
        const response=await env.ASSETS.fetch(request);
        const headers=new Headers(response.headers);
        for(const [key,value] of Object.entries(security))headers.set(key,value);
        headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex, nofollow');
        headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
        return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
      }
      if(path.startsWith('/assets/'))return env.ASSETS.fetch(request);
      const base=(env.SITE_URL||'').replace(/\/$/,'');
      const indexable=env.INDEXABLE==='true'&&/^https:\/\/[^/]+$/.test(base);
      if(path==='/robots.txt')return new Response(indexable?'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: '+base+'/sitemap.xml\n':'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
      if(path==='/sitemap.xml')return new Response(indexable?'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+Object.keys(pages).filter(p=>p!='/404/').map(p=>'<url><loc>'+base+p+'</loc></url>').join('')+'</urlset>':'Not found',{status:indexable?200:404,headers:{'Content-Type':indexable?'application/xml':'text/plain','Cache-Control':'no-store'}});
      if(!path.endsWith('/')&&pages[path+'/'])return Response.redirect(url.origin+path+'/'+url.search,308);
      const selected=pages[path]?path:'/404/';
      const {data}=await settings(env);
      const html=renderPage(pages[selected],selected,data,env);
      return new Response(request.method==='HEAD'?null:html,{status:selected==='/404/'?404:200,headers:{...security,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',...(!indexable||selected==='/404/'?{'X-Robots-Tag':'noindex, nofollow'}:{})}});
    }catch(error){
      console.error('Request failed:',error.name);
      if(path.startsWith('/api/'))return json({error:'Не удалось сохранить или загрузить данные. Попробуйте ещё раз.'},503);
      return new Response('Сайт временно недоступен. Пожалуйста, повторите попытку.',{status:503,headers:{...security,'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Retry-After':'30'}});
    }
  }
};
