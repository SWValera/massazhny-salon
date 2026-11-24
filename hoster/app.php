<?php
// Runtime and data live outside the web root. Only public entry points include this file.
declare(strict_types=1);
const JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR;
function json_read(string $file): array { return json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR); }
function config(): array { static $v; return $v ??= json_read(__DIR__.'/config.json'); }
function services(): array { static $v; return $v ??= json_read(__DIR__.'/services.json'); }
function enc($s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function respond(array $value, int $code=200): never { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); echo json_encode($value, JSON_FLAGS); exit; }
function fail(string $s,int $code): never { respond(['error'=>$s],$code); }
function atomic_json(string $path,array $data): void {
    $tmp=tempnam(dirname($path),'.save-');
    try { if(file_put_contents($tmp,json_encode($data,JSON_FLAGS))===false)throw new RuntimeException('write'); chmod($tmp,0600); if(!rename($tmp,$path))throw new RuntimeException('rename'); }
    finally { if(is_file($tmp))unlink($tmp); }
}
function settings(): array { return json_read(__DIR__.'/settings.json'); }
function validate(array $d): array {
    $out=[];
    foreach(['phone'=>[8,30],'city'=>[2,80],'street'=>[3,160]] as $k=>$range){
        if(!isset($d[$k])||!is_string($d[$k]))fail('Заполните адрес и телефон.',400);
        $s=trim($d[$k]);$len=mb_strlen($s,'UTF-8');
        if($len<$range[0]||$len>$range[1]||preg_match('/[\x00-\x1f<>]/u',$s))fail('Проверьте адрес и телефон.',400);
        $out[$k]=$s;
    }
    $out['phone']=preg_replace('/[\s()-]/u','',$out['phone']);
    if(!preg_match('/^\+[1-9]\d{7,14}$/D',$out['phone']))fail('Введите телефон в международном формате, например +7 705 131 03 39.',400);
    foreach(['latitude'=>90,'longitude'=>180] as $k=>$max){
        if(!isset($d[$k])||(!is_int($d[$k])&&!is_float($d[$k]))||!is_finite((float)$d[$k])||abs($d[$k])>$max)fail('Проверьте координаты точки маршрута.',400);
        $out[$k]=$d[$k];
    }
    if(!isset($d['twoGisId'])||!is_string($d['twoGisId'])||!preg_match('/^\d{0,25}$/D',$d['twoGisId']))fail('Проверьте номер здания 2ГИС.',400);
    $out['twoGisId']=$d['twoGisId'];$out['prices']=[];
    foreach(services() as $s){$p=$d['prices'][$s['id']]??null;if(!is_int($p)||$p<1||$p>10000000)fail('Цена «'.$s['name'].'» должна быть целым числом от 1 до 10 000 000 ₸.',400);$out['prices'][$s['id']]=$p;}
    return $out;
}
function render_page(array $t,string $path,array $d): string {
    $c=config();$site=$c['siteUrl'];$p=$d['phone'];
    $display=strlen($p)===12&&str_starts_with($p,'+7')?substr($p,0,2).' '.substr($p,2,3).' '.substr($p,5,3).' '.substr($p,8,2).' '.substr($p,10):$p;
    $lat=$d['latitude'];$lon=$d['longitude'];
    $v=['ADDRESS'=>$d['city'].', '.$d['street'],'STREET'=>$d['street'],'STREET_UPPER'=>mb_strtoupper($d['street'],'UTF-8'),'CITY'=>$d['city'],'CITY_UPPER'=>mb_strtoupper($d['city'],'UTF-8'),'PHONE'=>$p,'PHONE_DISPLAY'=>$display,'PHONE_DIGITS'=>substr($p,1),'YANDEX'=>"https://yandex.kz/maps/?mode=routes&rtext=~$lat%2C$lon&rtt=auto&ll=$lon%2C$lat&z=16",'DGIS'=>"https://2gis.kz/directions/points/%7C$lon%2C$lat".($d['twoGisId']?'%3B'.$d['twoGisId']:'')];
    foreach($d['prices'] as $k=>$price)$v['PRICE_'.$k]=number_format($price,0,'.',' ');
    $schemas=[];
    foreach($t['schemas'] as $raw){
        $s=json_decode($raw,true,512,JSON_THROW_ON_ERROR);
        if(($s['@type']??'')==='HealthAndBeautyBusiness'){$s['telephone']=$p;$s['address']['streetAddress']=$d['street'];$s['address']['addressLocality']=$d['city'];$s['geo']['latitude']=$lat;$s['geo']['longitude']=$lon;$s['url']=$site.'/';$s['image']=$site.'/assets/hero-blue.jpg';}
        if(($s['@type']??'')==='Service'){$id=explode('/',trim($path,'/'));$id=end($id);$s['areaServed']['name']=$d['city'];$s['provider']['telephone']=$p;$s['offers']['priceSpecification']['minPrice']=$d['prices'][$id];}
        // FAQ answers can mention a service's price too.
        $encoded=json_encode($s,JSON_FLAGS|JSON_HEX_TAG|JSON_HEX_AMP);
        if(preg_match('~^/massazh/([^/]+)/$~',$path,$m))$encoded=str_replace('5 000',number_format($d['prices'][$m[1]],0,'.',' '),$encoded);
        $schemas[]=$encoded;
    }
    $seo='<meta name="robots" content="'.($c['indexable']&&$path!='/404/'?'index, follow':'noindex, nofollow').'">';
    if($path!='/404/')$seo.='<link rel="canonical" href="'.enc($site.$path).'"><meta property="og:url" content="'.enc($site.$path).'">';
    $html=preg_replace_callback('/@@([A-Z_]+[a-z0-9_-]*)@@/',function($m)use($v,$schemas,$seo){$k=$m[1];if($k==='SEO')return $seo;if(str_starts_with($k,'SCHEMA_'))return $schemas[(int)substr($k,7)-1];if(!array_key_exists($k,$v))throw new RuntimeException('template');return enc($v[$k]);},$t['html']);
    return str_replace('<meta property="og:image" content="/','<meta property="og:image" content="'.enc($site).'/',$html);
}
function session_open(): void {
    ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');
    ini_set('session.gc_maxlifetime','28800');session_save_path(__DIR__.'/sessions');session_name('laveliya_session');
    session_set_cookie_params(['lifetime'=>28800,'path'=>'/','secure'=>config()['secure'],'httponly'=>true,'samesite'=>'Strict']);session_start();
}
function api(string $action): never {
    header('Cache-Control: no-store');header('X-Robots-Tag: noindex, nofollow');header('X-Content-Type-Options: nosniff');
    $method=$_SERVER['REQUEST_METHOD'];
    if(!in_array($action,['login','settings','logout'],true))fail('Страница не найдена.',404);
    $allowed=$action==='settings'?['GET','PUT']:['POST'];if(!in_array($method,$allowed,true))fail('Метод не поддерживается.',405);
    if($method!=='GET'){
        if(($_SERVER['HTTP_ORIGIN']??'')!==config()['siteUrl'])fail('Обновите страницу админки и повторите попытку.',403);
        if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json'))fail('Неверный формат запроса.',415);
    }
    session_open();
    if($action!=='login'&&(!isset($_SESSION['expires'])||$_SESSION['expires']<time())){$_SESSION=[];fail('Войдите в админку.',401);}
    if($method!=='GET'&&$action!=='login'&&!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''))fail('Обновите страницу админки и повторите попытку.',403);
    $body=[];
    if($method!=='GET'){
        $raw=file_get_contents('php://input',false,null,0,20001);if(strlen($raw)>20000)fail('Запрос слишком большой.',413);
        try{$body=json_decode($raw,true,32,JSON_THROW_ON_ERROR);}catch(Throwable $e){fail('Проверьте данные формы.',400);}
        if(!is_array($body))fail('Проверьте данные формы.',400);
    }
    if($action==='login'){
        // One locked limiter file bounds both concurrent attempts and stored state.
        $lock=fopen(__DIR__.'/login.lock','c+');flock($lock,LOCK_EX);
        try{
            $file=__DIR__.'/attempts.json';$a=is_file($file)?json_read($file):[];$now=time();
            $a=array_values(array_filter($a,fn($r)=>$r['time']>$now-900));$ip=hash('sha256',$_SERVER['REMOTE_ADDR']??'unknown');
            if(count($a)>=60||count(array_filter($a,fn($r)=>$r['ip']===$ip))>=10){header('Retry-After: 900');fail('Слишком много попыток. Попробуйте через 15 минут.',429);}
            $a[]=['time'=>$now,'ip'=>$ip];atomic_json($file,$a);
        }finally{flock($lock,LOCK_UN);fclose($lock);}
        $pw=$body['password']??null;$hash=config()['passwordHash'];
        if(!is_string($pw)||strlen($pw)>256||!hash_equals($hash['hash'],hash_pbkdf2('sha256',$pw,hex2bin($hash['salt']),600000,64,false)))fail('Неверный пароль.',401);
        session_regenerate_id(true);$_SESSION=['expires'=>time()+28800,'csrf'=>bin2hex(random_bytes(32))];respond(['ok'=>true]);
    }
    if($action==='logout'){$_SESSION=[];session_destroy();setcookie(session_name(),'', ['expires'=>time()-3600,'path'=>'/','secure'=>config()['secure'],'httponly'=>true,'samesite'=>'Strict']);respond(['ok'=>true]);}
    if($method==='GET')respond(settings()+['csrf'=>$_SESSION['csrf'],'services'=>services()]);
    if(!isset($body['data'])||!is_array($body['data']))fail('Проверьте данные формы.',400);
    $data=validate($body['data']);$lock=fopen(__DIR__.'/settings.lock','c+');flock($lock,LOCK_EX);
    try{
        $old=settings();if(($body['version']??null)!==$old['version'])fail('Настройки уже изменились. Обновите страницу, чтобы загрузить актуальные данные.',409);
        $new=['data'=>$data,'version'=>$old['version']+1,'updatedAt'=>time()];
        atomic_json(__DIR__.'/settings.previous.json',$old);atomic_json(__DIR__.'/settings.json',$new);
    }finally{flock($lock,LOCK_UN);fclose($lock);}
    respond($new);
}
function run_site(): void {
    try {
        header('X-Content-Type-Options: nosniff');header('Referrer-Policy: strict-origin-when-cross-origin');header('X-Frame-Options: SAMEORIGIN');
        $path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
        if(str_starts_with($path,'/api/admin/'))api(substr($path,11));
        $pages=json_read(__DIR__.'/pages.json');
        if($path!=='/'&&!str_ends_with($path,'/')&&isset($pages[$path.'/'])){header('Location: '.$path.'/',true,301);exit;}
        if(!isset($pages[$path])){$path='/404/';http_response_code(404);}
        header('Cache-Control: no-store');header('Content-Type: text/html; charset=utf-8');echo render_page($pages[$path],$path,settings()['data']);
    }catch(Throwable $e){error_log('Laveliya runtime error: '.$e->getMessage());http_response_code(503);header('Cache-Control: no-store');if(str_starts_with($_SERVER['REQUEST_URI']??'','/api/'))respond(['error'=>'Не удалось сохранить или загрузить данные. Повторите попытку позже.'],503);echo 'Сайт временно недоступен. Пожалуйста, попробуйте позже.';}
}
