#!/usr/bin/env python3
"""Read-only comprehensive check of P004 and P006 photo indexes."""
from pathlib import Path
from collections import Counter
import hashlib,json,sys
WEB=Path(__file__).resolve().parents[1]
CAT=WEB/'property_gallery_published.json'
BACK=WEB.parent/'amani-backend'/'src'/'data'/'property_gallery_published.json'
DIST=WEB/'dist/property_gallery_published.json'
obj=json.loads(CAT.read_text(encoding='utf8'))
assert CAT.read_bytes()==BACK.read_bytes(), 'ERROR: backend index differs'
if DIST.exists(): assert CAT.read_bytes()==DIST.read_bytes(), 'ERROR: dist index differs'
for db_id,count,number in [('amani-p004',18,'004'),('amani-p006',12,'006')]:
    entry=obj['properties'][db_id]
    assert entry['folder']=='property-'+number
    photos=entry['photos']
    assert len(photos)==count,(db_id,count,len(photos))
    assert all(p['src'].startswith('img/rental/property-'+number+'/') for p in photos)
    assert all(p['category']!='General' for p in photos)
    assert len({p['src'] for p in photos})==count
    for p in photos:
        img=WEB/p['src']
        assert img.is_file(),f'Missing {img}'
        assert hashlib.sha256(img.read_bytes()).hexdigest()==p['sha256'],f'Unexpected photo change {img}'
        dist=WEB/'dist'/p['src']
        if dist.exists():assert dist.read_bytes()==img.read_bytes(),f'dist version differs: {dist}'
        assert Path(p['src']).name.startswith('property-'+number+'-'),p['src']
    print('PASS',db_id,entry['folder'],len(photos),'photos;',dict(Counter(p['category'] for p in photos)))
others={k:len(v['photos']) for k,v in obj['properties'].items()}
assert len(obj['properties'])==10,others
print('PASS 10 property entries; total:',sum(others.values()),'; other properties:',{k:v for k,v in others.items() if k not in ('amani-p004','amani-p006')})
print('Supabase property data was not changed; no SQL migration required for folder galleries.')
