#!/usr/bin/env python3
import argparse,json,re,shutil,urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'latest-release.json'
COVERS=ROOT/'covers/releases'
VALID_EXT={'.jpg','.jpeg','.png','.webp'}

def direct_url(url,domains,label):
    p=urlparse(url)
    if p.scheme!='https' or not any(p.netloc==d or p.netloc.endswith('.'+d) for d in domains):
        raise SystemExit(f'{label}: неверный домен или не HTTPS')
    low=p.path.casefold()
    if '/artist/' in low or '/search' in low or low in ('','/'):
        raise SystemExit(f'{label}: нужна прямая страница релиза, не артист и не поиск')
    return url

def slug(s):
    s=re.sub(r'[^0-9A-Za-zА-Яа-яЁё._-]+','-',s).strip('-').lower()
    return s or 'release'

def fetch_cover(source,title):
    COVERS.mkdir(parents=True,exist_ok=True)
    if source.startswith(('http://','https://')):
        p=urlparse(source); ext=Path(p.path).suffix.lower()
        if ext not in VALID_EXT: ext='.jpg'
        dst=COVERS/(slug(title)+ext)
        req=urllib.request.Request(source,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=30) as r: body=r.read()
        if len(body)<1024: raise SystemExit('Обложка слишком маленькая или не скачалась')
        dst.write_bytes(body)
    else:
        src=Path(source).expanduser().resolve()
        if not src.is_file(): raise SystemExit('Обложка не найдена: '+str(src))
        ext=src.suffix.lower()
        if ext not in VALID_EXT: raise SystemExit('Обложка должна быть JPG, PNG или WEBP')
        dst=COVERS/(slug(title)+ext); shutil.copy2(src,dst)
    return './covers/releases/'+dst.name

def main():
    ap=argparse.ArgumentParser(description='Обновить последний релиз SOBIVAN')
    ap.add_argument('--title',required=True); ap.add_argument('--meta',default='single')
    ap.add_argument('--yandex-url',required=True); ap.add_argument('--vk-url',required=True)
    ap.add_argument('--cover',required=True)
    a=ap.parse_args()
    y=direct_url(a.yandex_url,('music.yandex.ru','music.yandex.com'),'Яндекс Музыка')
    v=direct_url(a.vk_url,('vk.ru','vk.com'),'VK Музыка')
    cover=fetch_cover(a.cover,a.title)
    data={'enabled':True,'kicker':'Последний релиз','title':a.title,'meta':a.meta,'cover':cover,'yandexUrl':y,'vkUrl':v}
    DATA.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Последний релиз обновлён:',a.title)

if __name__=='__main__': main()
