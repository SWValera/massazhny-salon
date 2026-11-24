#!/usr/bin/env python3
"""Package public PHP site and private runtime separately for Plesk. No secrets in source."""
from pathlib import Path
import json, shutil, subprocess, argparse, time, zipfile
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--output',default='.preview/hoster');args=p.parse_args()
out=(ROOT/args.output).resolve();out.mkdir(parents=True,exist_ok=True)
public=out/'httpdocs';private=out/'laveliya-private';private.mkdir(exist_ok=True)
subprocess.run(['python3','scripts/build.py','--production','--site-url','https://xn--80aejmld5l.kz','--output',str(public)],cwd=ROOT,check=True)
# Dynamic HTML always renders the latest settings, including SEO metadata.
for f in public.rglob('*.html'):
    if 'admin' not in f.relative_to(public).parts:f.unlink()
for f in public.joinpath('admin').iterdir():
    if f.name not in ['index.html','admin.js','admin.css']:f.unlink()
for name in ['index.php','.htaccess']:shutil.copyfile(ROOT/'hoster'/name,public/name)
# Keep ownership verification files through every deployment.
for f in (ROOT/'verification').glob('*.html'):shutil.copyfile(f,public/f.name)
shutil.copyfile(ROOT/'hoster/app.php',private/'app.php')
shutil.copyfile(ROOT/'cloudflare/pages.json',private/'pages.json')
shutil.copyfile(ROOT/'data/services.json',private/'services.json')
(private/'sessions').mkdir(exist_ok=True);(private/'sessions/.keep').touch()
(private/'settings.json').write_text(json.dumps({'data':json.loads((ROOT/'data/defaults.json').read_text()),'version':1,'updatedAt':int(time.time())},ensure_ascii=False))
# config.json is supplied separately from ignored .private; never shipped by default.
(private/'.htaccess').write_text('Require all denied\n')
(public/'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: https://xn--80aejmld5l.kz/sitemap.xml\n')
(public/'_headers').unlink(missing_ok=True)
(public/'admin/.htaccess').write_text('DirectoryIndex index.html\n<IfModule mod_headers.c>\nHeader always set Cache-Control "no-store"\nHeader always set X-Robots-Tag "noindex, nofollow"\n</IfModule>\n')
print('Prepared Hoster public files and private runtime:',out)
