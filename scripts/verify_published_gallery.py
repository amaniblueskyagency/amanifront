#!/usr/bin/env python3
"""Verify that the public folder catalogue describes ONLY actual local photos."""
import hashlib
import json
from pathlib import Path

WEB = Path(__file__).resolve().parents[1]
RENTAL = WEB/'img'/'rental'
MANIFEST=WEB/'property_gallery_published.json'
BACKEND=WEB.parent/'amani-backend'/'src'/'data'/'property_gallery_published.json'
obj=json.loads(MANIFEST.read_text(encoding='utf-8'))
assert obj['version']==3
if BACKEND.exists():
    assert BACKEND.read_bytes()==MANIFEST.read_bytes(), 'Frontend / backend manifests differ!'
from gallery_manager import photos as scan_photos
scanned=scan_photos(RENTAL)
source_paths={r['path'] for r in scanned}
verified=[]
for propid, entry in obj['properties'].items():
    folder=entry['folder']
    assert propid.endswith(folder.rsplit('-',1)[-1]),f'Mapping error for {propid}'
    for item in entry['photos']:
        image=item['src']
        assert image.startswith('img/rental/'+folder+'/'),f'Cross-property photo: {image}'
        assert image in source_paths, f'Photo not in folder scan: {image}'
        filename=WEB/image
        assert filename.is_file(), f'Missing photo: {image}'
        assert hashlib.sha256(filename.read_bytes()).hexdigest()==item['sha256'],f'Image modified: {image}'
        verified.append(image)
assert len(verified)==len(set(verified)), 'Duplicate file in index'
assert set(verified)==source_paths, f'Index missing {len(source_paths-set(verified))} images; run publish'
print(f'PASS {len(verified)} files, {len(obj["properties"])} properties; site and backend manifests match')
for propid,entry in obj['properties'].items():
    cats=sorted({im['category'] for im in entry['photos']})
    print(propid, len(entry['photos']), 'photos;', 'branches:',', '.join(cats) if cats else '(none)')
