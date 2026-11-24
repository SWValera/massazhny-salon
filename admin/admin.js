const $=id=>document.getElementById(id);
let state=null,dirty=false,busy=false;
function status(message='',kind=''){$('status').textContent=message;$('status').className=kind;}
async function request(path,options={}){
  const response=await fetch('/api/admin/'+path,{...options,headers:{'Content-Type':'application/json',...(state?{'X-CSRF-Token':state.csrf}:{}),...options.headers},cache:'no-store'});
  let result;try{result=await response.json();}catch{throw new Error('Не удалось связаться с админкой. Повторите попытку.');}
  if(!response.ok){const error=new Error(result.error||'Не удалось выполнить действие.');error.status=response.status;throw error;}
  return result;
}
function markDirty(){dirty=true;$('save').disabled=busy;$('save-state').textContent='Есть несохранённые изменения';status();}
function showLogin(){state=null;dirty=false;$('password').value='';$('login').hidden=false;$('editor').hidden=true;}
function updateRoutes(){
 const lat=Number($('latitude').value),lon=Number($('longitude').value),id=$('twoGisId').value;
 $('yandex-check').href=`https://yandex.kz/maps/?mode=routes&rtext=~${lat}%2C${lon}&rtt=auto`;
 $('dgis-check').href=`https://2gis.kz/directions/points/%7C${lon}%2C${lat}${/^\d+$/.test(id)?'%3B'+id:''}`;
}
function populate(){
 const {data}=state;
 for(const key of ['phone','city','street','latitude','longitude','twoGisId'])$(key).value=data[key];
 $('prices').replaceChildren();
 for(const service of state.services){
  const wrap=document.createElement('div'),label=document.createElement('label'),row=document.createElement('div'),input=document.createElement('input'),unit=document.createElement('span');
  label.htmlFor='price-'+service.id;label.textContent=service.name;
  input.id=label.htmlFor;input.type='number';input.min='1';input.max='10000000';input.step='1';input.required=true;input.inputMode='numeric';input.value=data.prices[service.id];
  row.className='price-input';unit.textContent='₸';row.append(input,unit);wrap.append(label,row);$('prices').append(wrap);
 }
 dirty=false;$('save').disabled=true;$('save-state').textContent='Все изменения сохранены';
 $('updated').textContent='Обновлено: '+new Date(state.updatedAt*1000).toLocaleString('ru-RU');
 updateRoutes();
}
async function load(){
 $('retry').hidden=true;
 try{state=await request('settings');populate();$('login').hidden=true;$('editor').hidden=false;status();}
 catch(error){if(error.status===401){showLogin();status();}else{status(error.message,'error');$('retry').hidden=false;}}
}
$('retry').addEventListener('click',load);
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.submitter;button.disabled=true;status('Проверяем пароль…');
 try{const password=$('password').value;await request('login',{method:'POST',body:JSON.stringify({password})});if(window.PasswordCredential&&navigator.credentials?.store){navigator.credentials.store(new PasswordCredential({id:'laveliya-admin',name:'Лавелия — администратор',password})).catch(()=>{});}$('password').value='';await load();}
 catch(error){status(error.message,'error');}finally{button.disabled=false;}
});
$('settings-form').addEventListener('input',event=>{
 markDirty();
 if(['city','street'].includes(event.target.id)){$('route-details').open=true;status('Если салон переехал, обновите точку маршрута и проверьте её в картах.');}
 if(['latitude','longitude'].includes(event.target.id))$('twoGisId').value='';
 if(['latitude','longitude','twoGisId'].includes(event.target.id))updateRoutes();
});
$('settings-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!dirty)return;
 busy=true;$('save').disabled=true;$('save').textContent='Сохраняем…';
 // Lock the form while saving so a response cannot overwrite newer local edits.
 const inputs=[...$('settings-form').querySelectorAll('input')];inputs.forEach(input=>input.disabled=true);
 const data={phone:$('phone').value,city:$('city').value,street:$('street').value,latitude:Number($('latitude').value),longitude:Number($('longitude').value),twoGisId:$('twoGisId').value,prices:{}};
 for(const service of state.services)data.prices[service.id]=Number($('price-'+service.id).value);
 try{
  const result=await request('settings',{method:'PUT',body:JSON.stringify({version:state.version,data})});
  state={...state,...result};populate();status('Сохранено. Цены и контакты обновлены на всех страницах сайта.','success');
 }catch(error){status(error.message,'error');if(error.status===401)showLogin();}
 finally{busy=false;inputs.forEach(input=>input.disabled=false);$('save').disabled=!dirty;$('save').textContent='Сохранить изменения';}
});
$('logout').addEventListener('click',async()=>{
 if(dirty&&!confirm('Выйти без сохранения изменений?'))return;
 try{await request('logout',{method:'POST',body:'{}'});state=null;dirty=false;showLogin();status();}
 catch(error){status(error.message,'error');}
});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
load();
