from pathlib import Path
from urllib.request import urlopen, Request
import re
from concurrent.futures import ThreadPoolExecutor
root=Path(__file__).resolve().parents[1]
url='https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&family=Cormorant+Garamond:ital,wght@0,500;1,400&display=swap'
css=urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'})).read().decode()
blocks=re.findall(r'/\* ([^*]+) \*/\s*(@font-face\s*\{[^}]+\})',css)
keep=[]; jobs=[]
for subset,b in blocks:
    if subset not in ['cyrillic','latin','latin-ext']: continue
    family='serif' if 'Cormorant' in b else 'sans'
    weight=re.search(r'font-weight: (\d+)',b).group(1)
    style='italic' if 'font-style: italic' in b else 'normal'
    url=re.search(r'url\(([^)]+)\)',b).group(1)
    name=f'{family}-{weight}-{style}-{subset}.woff2'
    jobs.append((url,root/'assets'/name))
    keep.append(b.replace(url,f'/assets/{name}'))
def download(job):
    url,path=job
    path.write_bytes(urlopen(url).read())
with ThreadPoolExecutor(max_workers=6) as pool: list(pool.map(download,jobs))
(root/'assets/fonts.css').write_text('\n'.join(keep),encoding='utf-8')
print('Local WOFF2 fonts saved')
