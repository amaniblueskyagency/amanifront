#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,sys
web=Path(__file__).resolve().parents[1]
obj=json.loads((web/'property_gallery_published.json').read_text(encoding='utf-8'))
entry=obj['properties']['amani-p009']
assert entry['folder']=='property-009' and entry['title_contains']=='juja farm'
assert len(entry['photos'])==16, f"Expected 16 photos, found {len(entry['photos'])}"
assert (web/'dist/property_gallery_published.json').read_bytes() == (web/'property_gallery_published.json').read_bytes(), 'dist index differs'
backend=web.parent/'amani-backend/src/data/property_gallery_published.json'
assert backend.exists() and backend.read_bytes()==(web/'property_gallery_published.json').read_bytes(), 'Backend index missing or differs'
source=set();cats={}
for photo in entry['photos']:
    p=web/photo['src']
    assert photo['src'].startswith('img/rental/property-009/'), f"Cross property reference {p}"
    assert p.is_file(), f"Missing source image: {p}"
    assert hashlib.sha256(p.read_bytes()).hexdigest()==photo['sha256'], f"Image checksum mismatch: {p}"
    dist=web/'dist'/photo['src']
    assert dist.is_file() and dist.read_bytes()==p.read_bytes(),f"Dist photo missing or mismatched: {dist}"
    source.add(str(p.resolve()));cats[photo['category']]=cats.get(photo['category'],0)+1
assert len(source)==16
assert cats=={'Exterior':12,'Kitchen':1,'Living Areas':2,'Bathrooms':1},cats
assert len(list((web/'img/rental/property-009').rglob('*.webp')))==16
print('PASS Juja Farm Apartments P009 — 16/16 photographs')
print('Categories:',cats)
print('Frontend and backend gallery indexes are synchronized.')
print('No database update is necessary for folder-based public photos.')
