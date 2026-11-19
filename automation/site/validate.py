#!/usr/bin/env python3
import json,sys
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[2]
errors=[]
def err(s): errors.append(s)
try:
    p=json.loads((ROOT/'posters/posters.json').read_text(encoding='utf-8')); items=p.get('items',[])
    if not isinstance(items,list): err('posters.items не массив')
    seen=set(); archive_started=False
    for i,x in enumerate(items):
        status=x.get('status')
        if status not in ('active','archive'): err(f'афиша {i}: неверный status')
        if status=='archive': archive_started=True
        if status=='active' and archive_started: err(f'афиша {i}: active должна идти до archive')
        for k in ('title','alt','image'):
            if not x.get(k): err(f'афиша {i}: пустое поле {k}')
        image=x.get('image','').removeprefix('./')
        if image in seen: err(f'дубликат картинки: {image}')
        seen.add(image)
        if image and not (ROOT/image).is_file(): err(f'нет картинки: {image}')
except Exception as e: err('posters.json: '+str(e))
try:
    r=json.loads((ROOT/'latest-release.json').read_text(encoding='utf-8'))
    for k in ('title','cover','yandexUrl','vkUrl'):
        if not r.get(k): err('релиз: пустое поле '+k)
    cover=r.get('cover','').removeprefix('./')
    if cover and not (ROOT/cover).is_file(): err('нет обложки: '+cover)
    for k,domains in [('yandexUrl',('music.yandex.ru','music.yandex.com')),('vkUrl',('vk.ru','vk.com'))]:
        u=urlparse(r.get(k,''))
        if u.scheme!='https' or not any(u.netloc==d or u.netloc.endswith('.'+d) for d in domains): err('неверная ссылка '+k)
        if '/artist/' in u.path.casefold() or '/search' in u.path.casefold(): err(k+': ссылка ведёт на артиста/поиск, а не релиз')
except Exception as e: err('latest-release.json: '+str(e))
if errors:
    print('ОШИБКИ:'); [print('-',x) for x in errors]; sys.exit(1)
print('OK: афиши и последний релиз валидны')
