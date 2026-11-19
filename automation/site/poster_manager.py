#!/usr/bin/env python3
import argparse,json,re,shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'posters/posters.json'
ASSETS=ROOT/'posters/assets'
VALID_EXT={'.jpg','.jpeg','.png','.webp'}

def load():
    data=json.loads(DATA.read_text(encoding='utf-8'))
    if not isinstance(data.get('items'),list): raise SystemExit('posters.json: items должен быть массивом')
    return data

def save(data):
    DATA.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def matches(item,q):
    hay=' '.join(str(item.get(k,'')) for k in ('title','subtitle','image')).casefold()
    return q.casefold() in hay

def archive_one(items,q):
    found=[x for x in items if matches(x,q)]
    if len(found)!=1: raise SystemExit(f'Шаблон {q!r}: найдено {len(found)} афиш; нужен ровно один результат')
    found[0]['status']='archive'
    return found[0]

def slug(name):
    s=re.sub(r'[^0-9A-Za-zА-Яа-яЁё._-]+','-',name).strip('-').lower()
    return s or 'poster'

def main():
    ap=argparse.ArgumentParser(description='Безопасное управление афишами SOBIVAN')
    sub=ap.add_subparsers(dest='cmd',required=True)
    sub.add_parser('list')
    ar=sub.add_parser('archive'); ar.add_argument('--match',required=True)
    add=sub.add_parser('add')
    add.add_argument('--image',required=True); add.add_argument('--title',required=True)
    add.add_argument('--subtitle',default=''); add.add_argument('--alt',required=True)
    add.add_argument('--filename'); add.add_argument('--archive',action='append',default=[])
    a=ap.parse_args(); data=load(); items=data['items']
    if a.cmd=='list':
        for i,x in enumerate(items,1): print(f"{i:02d} {x.get('status'):7} | {x.get('title')} | {x.get('image')}")
        return
    if a.cmd=='archive':
        x=archive_one(items,a.match); save(data); print('В архив:',x.get('title')); return
    src=Path(a.image).expanduser().resolve()
    if not src.is_file(): raise SystemExit('Картинка не найдена: '+str(src))
    ext=src.suffix.lower()
    if ext not in VALID_EXT: raise SystemExit('Допустимы JPG, PNG или WEBP')
    for q in a.archive: archive_one(items,q)
    ASSETS.mkdir(parents=True,exist_ok=True)
    filename=a.filename or slug(src.name)
    if Path(filename).suffix.lower() not in VALID_EXT: filename+=ext
    dst=ASSETS/Path(filename).name
    if dst.exists() and dst.read_bytes()!=src.read_bytes(): raise SystemExit('Файл уже существует с другим содержимым: '+dst.name)
    shutil.copy2(src,dst)
    item={'status':'active','title':a.title,'subtitle':a.subtitle,'alt':a.alt,'image':'./posters/assets/'+dst.name}
    items.insert(0,item); save(data)
    print('Добавлена актуальная афиша:',a.title)
    for q in a.archive: print('Перенесена в архив:',q)

if __name__=='__main__': main()
