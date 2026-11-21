#!/usr/bin/env python3
"""Validate static navigation, metadata, schema, and production/preview boundaries."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import json, re, sys, hashlib

root = Path(sys.argv[1] if len(sys.argv)>1 else 'dist').resolve()
errors=[]; titles=[]; descriptions=[]; photo_sources=[]; photo_hashes=[]; photo_alts=[]
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.h1=0; self.refs=[]; self.images=[]; self.meta={}; self.ids=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='h1':self.h1+=1
        if 'id' in a:self.ids.append(a['id'])
        if tag=='meta':self.meta[a.get('name',a.get('property',''))]=a.get('content','')
        if tag in ('a','link','script','img'): self.refs.append(a.get('href',a.get('src','')))
        if tag=='img': self.images.append(a)

pages=[p for p in root.rglob('index.html') if 'admin' not in p.relative_to(root).parts]
for f in pages:
    s=f.read_text(encoding='utf-8'); p=Page();p.feed(s)
    assert p.h1==1, f'{f}: expected one H1'
    assert len(p.ids)==len(set(p.ids)), f'{f}: duplicate IDs'
    assert p.meta.get('description'), f'{f}: no description'
    title=re.search(r'<title>(.*?)</title>',s).group(1)
    titles.append(title);descriptions.append(p.meta['description'])
    assert '<html lang="ru">' in s
    for item in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s):json.loads(item)
    for a in p.images:
        assert a.get('alt') and a.get('width') and a.get('height'), f'{f}: image accessibility/dimensions'
        photo_sources.append(a['src'])
        photo_alts.append(a['alt'])
        photo_hashes.append(hashlib.sha256((root/a['src'].lstrip('/')).read_bytes()).hexdigest())
        for candidate in a.get('srcset','').split(','):
            if candidate.strip(): assert (root/candidate.strip().split()[0].lstrip('/')).is_file(), f'{f}: missing responsive image'
    for ref in p.refs:
        if ref.startswith('/'):
            target=root/urlsplit(ref).path.lstrip('/')
            if not target.exists():errors.append(f'{f.relative_to(root)}: broken {ref}')
    if not (root/'sitemap.xml').exists():
        assert p.meta['robots']=='noindex, nofollow'
        assert 'rel="canonical"' not in s
    else:
        assert p.meta['robots']=='index, follow'
        assert 'rel="canonical"' in s
assert not errors,'\n'.join(errors)
assert len(titles)==len(set(titles)),'Duplicate titles'
assert len(descriptions)==len(set(descriptions)),'Duplicate descriptions'
assert len(photo_sources)==len(set(photo_sources)), 'Photo repeated in visible page content'
assert len(photo_hashes)==len(set(photo_hashes)), 'Duplicate image bytes under different filenames'
assert len(photo_alts)==len(set(photo_alts)), 'Duplicate image descriptions'
css=(root/'assets/fonts.css').read_text()
for ref in re.findall(r'url\(([^)]+)\)',css):assert (root/ref.lstrip('/')).is_file(), ref
print(f'PASS: {len(pages)} pages, {len(photo_sources)} unique photographs, responsive assets, internal links, unique metadata, JSON-LD, local fonts, robots mode')
