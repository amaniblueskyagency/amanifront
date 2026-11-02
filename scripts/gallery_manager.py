#!/usr/bin/env python3
"""Amani property galleries: lossless folder preparation, audit, and SQL draft.

Run `python scripts/gallery_manager.py scan` from D:\\amani-web.
Run `python scripts/gallery_manager.py prepare --property 005 --source D:\\NewPhotos`
  to add supplied folders to property-005; preparation copies bytes, never changes them.
Run `python scripts/gallery_manager.py sql --output D:\\GalleryUpdates.sql`
  to draft Supabase SQL, which must be inspected and applied separately.
"""
import argparse
import csv
import hashlib
import json
import re
import shutil
import sys
import subprocess
from collections import Counter
from pathlib import Path

IMAGE_EXTS = {'.jpg','.jpeg','.png','.webp','.avif','.gif'}
PROPERTY_RE = re.compile(r'^property-(\d{3,})$')
LABELS = {
    'exterior':'Exterior','exteriors':'Exterior','outside':'Exterior',
    'bedroom':'Bedrooms','bedrooms':'Bedrooms','bathroom':'Bathrooms','bathrooms':'Bathrooms',
    'washroom':'Bathrooms','washrooms':'Bathrooms','kitchen':'Kitchen','kitchens':'Kitchen',
    'dining':'Dining','dinning':'Dining','living-areas':'Living Areas','living-room':'Living Areas',
    'corridos':'Corridors','corridors':'Corridors','hallway':'Corridors','hallways':'Corridors',
    'balcony':'Balcony','balconies':'Balcony','parking':'Parking','amenities':'Amenities',
    'rooftop':'Rooftop','stairs':'Stairs','general':'General','gallery':'General',
    'studio':'Living Areas','studios':'Living Areas','bedsitter':'General','bedsitters':'General',
    'shop':'General','shops':'General',
}
REGISTRY = Path(__file__).resolve().parents[1] / 'property_gallery_registry.json'

GALLERY_SET = 'folder-gallery-v2'

def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as fh:
        for chunk in iter(lambda: fh.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def property_registry():
    if not REGISTRY.exists():raise RuntimeError(f'Missing property-ID registry: {REGISTRY}')
    mapping=json.loads(REGISTRY.read_text(encoding='utf8'))
    for n, info in mapping.items():
        if not re.fullmatch(r'\d{3,}',n) or not isinstance(info,dict):
            raise RuntimeError(f'Invalid property registry entry: {n}')
        if not info.get('db_id') or not info.get('label'):
            raise RuntimeError(f'Mapping for property-{n} must provide db_id and label')
    return mapping

def photos(root):
    result=[]
    registered=property_registry()
    for folder in sorted(root.iterdir()) if root.exists() else []:
        match=PROPERTY_RE.fullmatch(folder.name) if folder.is_dir() else None
        if not match:continue
        number=match.group(1)
        for path in sorted(folder.rglob('*')):
            if not path.is_file() or path.suffix.lower() not in IMAGE_EXTS:continue
            # If structured photos exist, keep the original flat paths available
            # for legacy DB references, but publish only their structured copies.
            if path.parent == folder and (folder/'general'/path.name).is_file():
                if digest(path) == digest(folder/'general'/path.name): continue
                raise RuntimeError(f'Conflicting flat/general photos: {path}')
            rel=path.relative_to(folder)
            # Only exclude specifically superseded legacy paths; any new category,
            # including a new General image, remains eligible for publication.
            excluded=set(registered.get(number,{}).get('excluded_gallery_paths',[]))
            if rel.as_posix() in excluded:
                continue
            branches=list(rel.parts[:-1])
            type_=next((unit(s) for s in branches if unit(s)), '')
            category=next((LABELS.get(s.lower().replace('_','-')) for s in reversed(branches) if LABELS.get(s.lower().replace('_','-'))), 'General')
            if category=='General':
                unknown=next((s for s in reversed(branches) if s.lower().replace('_','-') not in LABELS and not unit(s)), '')
                if unknown: category=re.sub(r'[-_]+',' ',unknown).title()
            result.append(dict(number=number,property_id=registered.get(number,{}).get('db_id',''),path=f'img/rental/{folder.name}/{rel.as_posix()}',category=category,unit_type=type_,sha256=digest(path),size=path.stat().st_size))
    def natural(text):
        return tuple(int(chunk) if chunk.isdigit() else chunk.lower() for chunk in re.split(r'(\d+)',text))
    def order_key(p):
        return p['number'],(0 if p['category']=='Exterior' else 1),natural(p['path'])
    return sorted(result,key=order_key)

def unit(value):
    s=value.lower().replace('_','-')
    if s in {'studio','studios'}:return 'Studio'
    if s in {'bedsitter','bedsitters','bed-sitter','bed-sitters'}:return 'Bedsitter'
    if s in {'shop','shops'}:return 'Shop'
    m=re.fullmatch(r'([1-9])(?:br|-br|bedroom|bedrooms|-bedroom|-bedrooms)',s)
    return f'{m.group(1)}BR' if m else ''

def sql_quote(text):return "'"+str(text).replace("'","''")+"'"

def generate_sql(records):
    if not records:raise RuntimeError('No property images found; SQL not generated.')
    registry=property_registry()
    records=[r for r in records if registry.get(r['number'],{}).get('gallery_verified') is not False]
    groups=sorted({r['number'] for r in records})
    if not records:raise RuntimeError('No verified property images to publish.')
    missing=[n for n in groups if n not in registry]
    if missing:raise RuntimeError('Add database mapping(s) for property-'+', property-'.join(missing)+' to property_gallery_registry.json and confirm IDs first.')
    lines=[
      '-- REVIEW / BACK UP FIRST. This publishes only the new photo set; it does not delete any legacy media.',
      '-- Uses the supplied 2026-10-26 DB schema. This has NOT been run on the live Supabase instance.',
      '-- Physical image files must be in D:\\amani-web and deployed before executing.',
      'BEGIN;',"SET LOCAL lock_timeout = '5s';",
      "DO $verify$ BEGIN"
    ]
    for n in groups:
        name=registry[n]['label']
        identifier=sql_quote(registry[n]['db_id'])
        lines.append(f"  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = {identifier}) THEN")
        lines.append('    RAISE EXCEPTION '+sql_quote(f'ABORT: Property {registry[n]["db_id"]} ({name}) not confirmed in the live database')+';')
        lines.append('  END IF;')
    lines += ['END $verify$;', '-- Deterministic record IDs make rerunning this migration safe.','WITH incoming(property_id,file_path,alt_text,display_order,is_primary,slug,metadata_json) AS (','  VALUES']
    rows=[]
    nlast=None;order=0
    for item in records:
        n=item['number']
        if n!=nlast:order=0;nlast=n
        order+=1
        mid='gall-v2-'+hashlib.md5(item['path'].encode('utf8')).hexdigest()
        label=registry[n]['label']+' — '+item['category']
        meta={'gallery_set':GALLERY_SET,'room_category':item['category'],'unit_type':item['unit_type'],'sha256':item['sha256']}
        rows.append('    ('+', '.join((sql_quote(registry[n]['db_id']),sql_quote(item['path']),sql_quote(label),str(order),'true' if order==1 else 'false',sql_quote(mid),sql_quote(json.dumps(meta,sort_keys=True))+'::jsonb'))+')')
    lines += [',\n'.join(rows),')',"INSERT INTO public.property_media (id,property_id,media_group,file_path,alt_text,display_order,is_primary,slug,metadata_json,updated_at)","SELECT slug,property_id,'gallery',file_path,alt_text,display_order,is_primary,slug,metadata_json,now() FROM incoming",'ON CONFLICT (id) DO UPDATE SET file_path=EXCLUDED.file_path,alt_text=EXCLUDED.alt_text,display_order=EXCLUDED.display_order,is_primary=EXCLUDED.is_primary,metadata_json=EXCLUDED.metadata_json,updated_at=now();','COMMIT;','', '-- Verification after commit:', "SELECT property_id,count(*) AS published_photos, count(*) FILTER (WHERE is_primary) AS cover_photos FROM public.property_media WHERE metadata_json->>'gallery_set' = 'folder-gallery-v2' GROUP BY property_id ORDER BY property_id;",'']
    return '\n'.join(lines)

def prepare(root,number,source):
    if not re.fullmatch(r'\d{3,}',number):raise RuntimeError('Provide --property NNN, e.g. 005')
    if not source.is_dir():raise RuntimeError(f'Source directory not found: {source}')
    dest=root/f'property-{number}'; files=0;created=0
    for item in sorted(source.rglob('*')):
        if not item.is_file() or item.suffix.lower() not in IMAGE_EXTS:continue
        rel=item.relative_to(source)
        if not rel.parts[:-1]:rel=Path('general')/rel
        target=dest/rel
        if target.resolve()==item.resolve():continue
        if target.exists():
            if digest(target)!=digest(item):raise RuntimeError(f'Stop: existing different photograph: {target}')
        else:
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(item,target)
            created+=1
        files+=1
    print(f'Property {number}: {files} images reviewed, {created} exact-byte copies added. No existing files changed.')

def publish_catalog(records):
    """Compatibility command: use the same ID-only indexer as RUN_WEB and Netlify."""
    script=Path(__file__).with_name('auto-gallery.mjs')
    subprocess.run(['node',str(script),'--verbose'],check=True)
    print('Property gallery published by ID; no property-title checks.')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['scan','sql','prepare','verify','publish'],nargs='?',default='scan')
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]/'img'/'rental')
    parser.add_argument('--property',help='Property number e.g. 007')
    parser.add_argument('--source',type=Path,help='Source folder for preparing new property photos')
    parser.add_argument('--output',type=Path,help='Output SQL filename')
    parser.add_argument('--manifest',type=Path,help='Manifest JSON to compare exact bytes')
    args=parser.parse_args()
    root=args.root.resolve()
    if args.action=='prepare':
        if not args.property or not args.source:parser.error('prepare requires --property and --source')
        prepare(root,args.property,args.source.resolve());return
    if args.action=='publish':
        publish_catalog([])
        return
    data=photos(root)
    elif args.action=='verify':
        if not args.manifest:parser.error('verify requires --manifest')
        expected=json.loads(args.manifest.read_text(encoding='utf8'))
        for x in expected:
            f=root.parent.parent/Path(x['path'])
            if not f.exists():raise RuntimeError('Missing: '+str(f))
            if digest(f)!=x['sha256']:raise RuntimeError('Checksum mismatch: '+str(f))
        print(f'PASS: {len(expected)} images checked against the packaged manifest; bytes unchanged.')
    elif args.action=='sql':
        result=generate_sql(data)
        if args.output:args.output.write_text(result,encoding='utf8');print('SQL written:',args.output)
        else:print(result)
    else:
        by=Counter(x['number'] for x in data)
        print('Property images:',len(data))
        for number,count in sorted(by.items()):
            print(f'property-{number}: {count} photos; categories: '+', '.join(sorted({x['category'] for x in data if x['number']==number})))
        print('No images required for properties without media. No files or database changed.')

if __name__=='__main__':
    try:main()
    except (OSError,RuntimeError,ValueError,json.JSONDecodeError) as exc:
        print('ERROR:',exc,file=sys.stderr);sys.exit(1)
