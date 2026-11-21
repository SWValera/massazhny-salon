import config from './config.js';
import {GitHubSettings} from './github-client.js';
import {openAccess} from './password-vault.js';
import {services,validateSettings,routes} from './settings.js';
const $=id=>document.getElementById(id),client=new GitHubSettings(config);
let state=null,dirty=false,busy=false,publicationTimer=null,publicationVersion=0;
function status(message='',kind=''){$('status').textContent=message;$('status').className=kind;}
function lock(value){
 busy=value;
 for(const input of $('settings-form').querySelectorAll('input'))input.disabled=value;
 $('logout').disabled=value;$('refresh').disabled=value;$('save').disabled=value||!dirty;
 $('save').textContent=value?'Сохраняем…':'Сохранить изменения';
}
function showLogin(){
 client.clear();state=null;dirty=false;publicationVersion++;clearTimeout(publicationTimer);
 $('password').value='';$('login').hidden=false;$('editor').hidden=true;$('publication').hidden=true;$('refresh').hidden=true;
}
function updateRoutes(){
 const links=routes({latitude:Number($('latitude').value),longitude:Number($('longitude').value),twoGisId:$('twoGisId').value});
 $('yandex-check').href=links.yandex;$('dgis-check').href=links.dgis;
}
function populate(){
 for(const key of ['phone','city','street','latitude','longitude','twoGisId'])$(key).value=state.data[key];
 $('prices').replaceChildren();
 for(const service of services){
  const wrap=document.createElement('div'),label=document.createElement('label'),row=document.createElement('div'),input=document.createElement('input'),unit=document.createElement('span');
  label.htmlFor='price-'+service.id;label.textContent=service.name;
  Object.assign(input,{id:label.htmlFor,type:'number',min:'1',max:'10000000',step:'1',required:true,inputMode:'numeric',value:state.data.prices[service.id]});
  row.className='price-input';unit.textContent='₸';row.append(input,unit);wrap.append(label,row);$('prices').append(wrap);
 }
 dirty=false;$('save').disabled=true;$('save-state').textContent='Изменения сохранены';
 $('updated').textContent='Статус сайта — ниже';$('refresh').hidden=true;
 updateRoutes();
}
function publication(title,detail,kind=''){
 $('publication').hidden=false;$('publication').className='publication '+kind;
 $('publication-state').textContent=title;$('publication-detail').textContent=detail;
}
async function watchPublication(){
 if(!state)return;
 clearTimeout(publicationTimer);const version=++publicationVersion,sha=state.sha;let attempts=0;
 publication('Проверяем публикацию…','Сравниваем сохранённые настройки с опубликованным сайтом.');
 async function check(){
  if(version!==publicationVersion)return;
  attempts++;
  try{
   const url=new URL('../deployment.json',import.meta.url);url.searchParams.set('check',Date.now());
   const response=await fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw new Error('pending');
   const deployed=await response.json();
   if(version!==publicationVersion)return;
   if(deployed.settingsSha===sha){
    publication('Опубликовано на сайте','Последние сохранённые цены и контакты уже доступны посетителям. Если сайт был открыт ранее, обновите его страницу.','success');
    $('updated').textContent='На сайте: '+new Date(deployed.builtAt).toLocaleString('ru-RU');return;
   }
   publication('Сохранено · сайт обновляется','Публикация обычно занимает несколько минут. Можно закрыть админку: обновление продолжится автоматически.');
  }catch{
   if(version!==publicationVersion)return;
   publication('Сохранено · публикация пока не подтверждена','Проверим ещё раз автоматически. Если обновление задержится, сообщите разработчику сайта.');
  }
  if(version!==publicationVersion)return;
  if(attempts<30)publicationTimer=setTimeout(check,10000);
  else publication('Сохранено · проверьте публикацию','Автоматическая проверка завершилась. Нажмите «Проверить публикацию». Если настройки не обновились, сообщите разработчику сайта.');
 }
 await check();
}
$('check-publication').addEventListener('click',watchPublication);
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=$('login-form').querySelector('button');button.disabled=true;
 status('Входим…');
 try{
  const password=$('password').value;
  const response=await fetch(new URL('./access.json',import.meta.url),{cache:'no-store',credentials:'omit'});
  if(!response.ok)throw new Error('Вход ещё не настроен. Обратитесь к разработчику сайта.');
  let token=await openAccess(password,await response.json(),config.repository);
  try{state=await client.login(token);}finally{token='';}
  state.data=validateSettings(state.data);
  populate();$('login').hidden=true;$('editor').hidden=false;status();watchPublication();
  // Use the browser's password manager; never write passwords to Web Storage.
  if(window.PasswordCredential&&navigator.credentials?.store){
   navigator.credentials.store(new PasswordCredential({id:'laveliya-admin',name:'Лавелия — администратор',password})).catch(()=>{});
  }
  $('password').value='';
 }catch(error){showLogin();status(error.message,'error');}
 finally{button.disabled=false;}
});
$('settings-form').addEventListener('input',event=>{
 dirty=true;$('save').disabled=busy;$('save-state').textContent='Есть несохранённые изменения';status();
 if(['city','street'].includes(event.target.id)){$('route-details').open=true;status('Если салон переехал, обновите точку маршрута и проверьте её в картах.');}
 if(['latitude','longitude'].includes(event.target.id))$('twoGisId').value='';
 if(['latitude','longitude','twoGisId'].includes(event.target.id))updateRoutes();
});
$('settings-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!dirty)return;
 const data={phone:$('phone').value,city:$('city').value,street:$('street').value,latitude:Number($('latitude').value),longitude:Number($('longitude').value),twoGisId:$('twoGisId').value,prices:{}};
 for(const service of services)data.prices[service.id]=Number($('price-'+service.id).value);
 let valid;try{valid=validateSettings(data);}catch(error){status(error.message,'error');return;}
 lock(true);status('Сохраняем изменения…');
 try{
  state=await client.save(valid,state.sha);populate();status('Сохранено. Запущено обновление сайта.','success');watchPublication();
 }catch(error){
  status(error.message,'error');
  if(error.status===401){showLogin();status(error.message,'error');}
  else $('refresh').hidden=false;
 }finally{lock(false);}
});
$('refresh').addEventListener('click',async()=>{
 if(dirty&&!confirm('Загрузить сохранённые настройки? Несохранённые изменения в форме будут потеряны.'))return;
 lock(true);
 try{state=await client.read();state.data=validateSettings(state.data);populate();status('Загружены актуальные настройки.');watchPublication();}
 catch(error){status(error.message,'error');if(error.status===401)showLogin();}
 finally{lock(false);}
});
$('logout').addEventListener('click',()=>{
 if(dirty&&!confirm('Выйти без сохранения изменений?'))return;
 showLogin();status('Вы вышли из админки.');
});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
showLogin();status();
