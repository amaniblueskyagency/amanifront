#!/usr/bin/env python3
"""Read-only audit of folder-based public galleries; no DB modifications."""
from collections import Counter
from pathlib import Path
import json, re, hashlib, sys
WEB=Path(__file__).resolve().parents[1]
CAT=WEB/'property_gallery_published.json'
RENTAL=WEB/'img'/'rental'
try:
    index=json.loads(CAT.read_text(encoding='utf-8'))
    if index.get('version') != 5:
        raise ValueError(f"Expected automatic index version 5, found {index.get('version')}")
    total=0
    for id,entry in sorted(index.get('properties',{}).items()):
        m=re.fullmatch(r'amani-p(\d{3,})',id)
        if not m or entry.get('folder') != 'property-'+m.group(1):
            raise ValueError(f'Broken property-to-folder mapping: {id}')
        seen=set();cats=Counter()
        for photo in entry.get('photos',[]):
            rel=photo['src']; folder='img/rental/'+entry['folder']+'/'
            if not rel.startswith(folder) or '..' in rel.replace('\\','/') or '\\' in rel:
                raise ValueError(f'Cross-property or unsafe image path: {rel}')
            f=WEB/rel
            if not f.is_file():raise FileNotFoundError(f'Indexed image missing: {rel}')
            if hashlib.sha256(f.read_bytes()).hexdigest()!=photo['sha256']:
                raise ValueError(f'Image changed without index refresh: {rel}')
            if rel in seen:raise ValueError(f'Repeated image path in index: {rel}')
            seen.add(rel);cats[photo.get('category','General')]+=1
            total+=1
        print(f"{id}: {len(seen)} indexed | "+(', '.join(f'{k}={v}' for k,v in cats.items()) or 'no photos yet'))
    print(f'PASS: {total} gallery references verified; all IDs and files valid.')
except (OSError,ValueError,KeyError) as e:
    print('FAILED:',e, file=sys.stderr)
    raise SystemExit(1)
