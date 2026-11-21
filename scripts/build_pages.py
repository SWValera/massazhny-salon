#!/usr/bin/env python3
"""Build a noindex static preview for a GitHub Pages project subdirectory."""
from pathlib import Path
import argparse, subprocess, shutil, re
from html.parser import HTMLParser
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('--base-path',default='/massazhny-salon')
p.add_argument('--output',default='.preview/pages')
a=p.parse_args();base='/'+a.base_path.strip('/')
assert re.fullmatch(r'/[A-Za-z0-9_-]+',base), 'Expected one repository path segment'
out=ROOT/a.output
subprocess.run(['python3',str(ROOT/'scripts/build.py'),'--output',str(out)],check=True,cwd=ROOT)
subprocess.run(['python3',str(ROOT/'scripts/check.py'),str(out)],check=True,cwd=ROOT)
# The static preview has no backend. Admin source stays in Git, not on Pages.
shutil.rmtree(out/'admin')
for path in out.rglob('*'):
    if path.suffix not in {'.html','.css','.js','.svg'}: continue
    text=path.read_text()
    text=re.sub(r'(?<![\w:/])/(assets|massazh|shugaring|ceny|o-mastere|kontakty)(?=/|[\"\'])',lambda m:base+m[0],text)
    text=text.replace('href="/"','href="'+base+'/"')
    path.write_text(text)
(out/'.nojekyll').touch()
class References(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in {'href','src'} and value.startswith('/'):
                assert value.startswith(base+'/'),value
                target=out/urlsplit(value).path[len(base)+1:]
                assert target.exists(),str(target)
            if key=='srcset':
                for candidate in value.split(','):
                    ref=candidate.strip().split()[0]
                    assert ref.startswith(base+'/'),ref
                    assert (out/ref[len(base)+1:]).is_file(),ref
for path in out.rglob('*.html'):References().feed(path.read_text())
for path in (out/'assets').glob('*.css'):
    for ref in re.findall(r'url\([\"\']?(/[^)\"\']+)',path.read_text()):
        assert ref.startswith(base+'/'),ref
        assert (out/ref[len(base)+1:]).is_file(),ref
print('PASS: GitHub Pages links, photos, fonts and CSS paths; admin excluded; noindex retained')
