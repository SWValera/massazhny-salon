// Credentials live only in this object in the current tab. No browser storage.
export class GitHubSettings {
  #token='';
  constructor(config,fetcher=(...args)=>fetch(...args)){this.config=config;this.fetcher=fetcher;}
  clear(){this.#token='';}
  async api(path,method='GET',body){
    if(!this.#token){const error=new Error('Войдите в админку.');error.status=401;throw error;}
    let response;
    try{response=await this.fetcher('https://api.github.com'+path,{method,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+this.#token,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20000)});}
    catch{throw new Error(method==='PUT'?'Связь прервалась. Изменение могло сохраниться: загрузите актуальные данные перед повторной попыткой.':'Не удалось связаться с сервисом сохранения. Проверьте подключение и повторите попытку.');}
    let data;try{data=await response.json();}catch{throw new Error('Не удалось прочитать ответ сервиса сохранения. Загрузите актуальные данные перед повторной попыткой.');}
    if(!response.ok){
      const messages={401:'Технический доступ к сохранению истёк или отключён. Сообщите разработчику сайта.',403:'Сохранение сейчас недоступно. Сообщите разработчику сайта.',404:'Настройки сайта недоступны. Сообщите разработчику сайта.',409:'Настройки изменены в другом окне. Загрузите актуальные данные перед сохранением.',422:'Сервис отклонил сохранение. Сообщите разработчику сайта.'};
      const error=new Error(messages[response.status]||'Сервис сохранения временно недоступен. Повторите попытку.');error.status=response.status;throw error;
    }
    return data;
  }
  get root(){return '/repos/'+this.config.repository;}
  get file(){return this.root+'/contents/'+this.config.file;}
  async login(token){
    this.#token=token.trim();
    if(!this.#token)throw new Error('Вход ещё не настроен. Сообщите разработчику сайта.');
    try{
      await this.api('/user');
      const repo=await this.api(this.root);
      if(!repo.permissions?.push)throw new Error('Нет доступа к сохранению. Сообщите разработчику сайта.');
      return await this.read();
    }catch(error){this.clear();throw error;}
  }
  async read(){
    const file=await this.api(this.file+'?ref='+encodeURIComponent(this.config.branch));
    const bytes=Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0));
    return {data:JSON.parse(new TextDecoder().decode(bytes)),sha:file.sha};
  }
  async save(data,sha){
    // Check the version and let GitHub perform a second, atomic SHA check.
    const current=await this.read();
    if(current.sha!==sha){const error=new Error('Настройки изменены в другом окне. Нажмите «Загрузить актуальные данные» и повторите изменения.');error.status=409;throw error;}
    const content=btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data,null,2)+'\n')));
    const result=await this.api(this.file,'PUT',{message:'Update salon prices and contacts from admin',branch:this.config.branch,sha,content});
    return {data,sha:result.content.sha,commit:result.commit.sha};
  }
}
