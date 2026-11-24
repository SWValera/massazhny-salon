<?php
// Local test server only; not included in deployment.
$p=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
$root=dirname(__DIR__).'/.preview/hoster/httpdocs';
if($p==='/admin/') { header('Content-Type: text/html; charset=utf-8');readfile($root.'/admin/index.html');return; }
if(is_file($root.$p)&&preg_match('~^/(assets|admin)/~',$p))return false;
require $root.'/index.php';
