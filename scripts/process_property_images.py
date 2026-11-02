"""Organize rental photos into property/category folders, preserving originals.

Example: aman/dinning/photo.jpg -> img/rental/property-001/dining/property-001-dining-001.webp
Run via RUN_IMAGE_ORGANIZER.bat, or python process_property_images.py --help.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError

EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp', '.jfif', '.tif', '.tiff'}
ALIASES = {
    'exterior': {'exterior', 'extirior', 'exteroir', 'ext', 'outside', 'outdoor', 'outdoors', 'external', 'compound', 'frontyard', 'backyard', 'buildingoutside'},
    'dining': {'dining', 'dinning', 'dinining', 'dinningroom', 'diningroom', 'dinningarea', 'diningarea'},
    'bedrooms': {'bedroom', 'bedrooms', 'bedrom', 'bedroms', 'bedrrom', 'bedrroms', 'bedroomm', 'beds'},
    'bathrooms': {'bathroom', 'bathrooms', 'bathrom', 'bathroms', 'washroom', 'washrooms', 'washrom', 'washroms', 'toilet', 'toilets', 'wc', 'shower', 'showers'},
    'kitchen': {'kitchen', 'kitchens', 'kichen', 'kichens', 'kithcen', 'kitchenette'},
    'living-room': {'living', 'livingroom', 'livingrooms', 'sitting', 'sittingroom', 'sittingrooms', 'lounge', 'lounges', 'lvingroom'},
    'corridors': {'corridor', 'corridors', 'corrido', 'corridos', 'corridores', 'hallway', 'hallways', 'passage', 'passages', 'hall'},
    'studios': {'studio', 'studios', 'studioapartments', 'bedsitter', 'bedsitters', 'bedsiter', 'bedsiters'},
    'balcony': {'balcony', 'balconies', 'balconys', 'veranda', 'verandah', 'terrace'},
    'parking': {'parking', 'parkinglot', 'carpark', 'garage'},
    'stairs': {'stairs', 'staircase', 'staircases', 'stairway', 'stairways'},
    'rooftop': {'roof', 'rooftop', 'roofdeck'},
    'entrance': {'entrance', 'entry', 'entryway', 'lobby', 'gate', 'gates'},
    'laundry': {'laundry', 'washingarea'},
    'shops': {'shop', 'shops', 'retail', 'commercial'},
    'other': {'misc', 'miscellaneous', 'other', 'others'},
}
ALIAS_LOOKUP = {re.sub(r'[^a-z0-9]', '', word): standard for standard, names in ALIASES.items() for word in names}


def slug(s: str) -> str:
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-') or 'other'


def canonical_folder(name: str) -> str:
    normalized = re.sub(r'[^a-z0-9]', '', slug(name))
    return ALIAS_LOOKUP.get(normalized, slug(name))


def digest_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def root_guess(script_dir: Path) -> Path:
    # Supports placing the files in the project's root OR in its scripts/ directory.
    if script_dir.name.lower() in {'scripts', 'script'}:
        return script_dir.parent
    return script_dir


def destination_guess(root: Path) -> Path:
    candidates = [root / 'img' / 'rental', root / 'img' / 'rentals', root / 'rentals']
    existing = [p for p in candidates if p.is_dir()]
    if len(existing) > 1:
        print('Several rental destinations exist. Choose explicitly with --dest-root:')
        for candidate in existing:
            print('  ' + str(candidate))
        raise SystemExit(2)
    return existing[0] if existing else candidates[0]  # preserves original script default


def next_name(folder: Path, property_id: str, category: str, used: set[str]) -> str:
    prefix = f'{property_id}-{category}-'
    i = 1
    while True:
        name = f'{prefix}{i:03d}.webp'
        if name.lower() not in used and not (folder / name).exists():
            used.add(name.lower())
            return name
        i += 1


def convert(src: Path, dest: Path, max_width: int, max_height: int, quality: int) -> tuple[int, int]:
    # Temporary output prevents leaving broken files after an error.
    temp = dest.with_name(dest.stem + '.tmp.webp')
    try:
        with Image.open(src) as raw:
            frame = ImageOps.exif_transpose(raw)
            if getattr(frame, 'n_frames', 1) > 1:
                frame.seek(0)  # no silent claims of animated-image support
            if frame.mode in ('RGBA', 'LA') or 'transparency' in frame.info:
                background = Image.new('RGBA', frame.size, '#ffffff')
                background.alpha_composite(frame.convert('RGBA'))
                frame = background.convert('RGB')
            else:
                frame = frame.convert('RGB')
            # The requested exact dimensions apply BEFORE depositing the photo.
            # Fit proportionally, then center-crop overflow: never stretch/distort.
            frame = ImageOps.fit(frame, (max_width, max_height),
                                 method=Image.Resampling.LANCZOS,
                                 centering=(0.5, 0.5))
            dimensions = frame.size
            frame.save(temp, 'WEBP', quality=quality, method=6)
        if not temp.exists() or temp.stat().st_size == 0:
            raise OSError('Output was empty')
        temp.replace(dest)
        return dimensions
    finally:
        if temp.exists():
            temp.unlink()


def parse_size(value: str) -> tuple[int, int]:
    """Accept WIDTHxHEIGHT (such as 1024x683) and reject invalid sizes."""
    match = re.fullmatch(r'\s*(\d+)\s*[xX×]\s*(\d+)\s*', value)
    if not match:
        raise argparse.ArgumentTypeError('Enter size as WIDTHxHEIGHT, e.g. 1024x683.')
    width, height = map(int, match.groups())
    if not (1 <= width <= 12000 and 1 <= height <= 12000):
        raise argparse.ArgumentTypeError('Width and height must be between 1 and 12000 pixels.')
    return width, height


def main() -> int:
    parser = argparse.ArgumentParser(description='Rename, resize, and group property images by their actual folders.')
    parser.add_argument('--project-root', type=Path, help='Website project root; otherwise inferred from script location')
    parser.add_argument('--source', type=Path, help='Input folder (default: PROJECT/aman)')
    parser.add_argument('--dest-root', type=Path, help='Rental images root (default: existing img/rental or img/rentals)')
    parser.add_argument('--property-id', help='Property identifier, e.g. property-001 (requested if omitted)')
    parser.add_argument('--max-width', type=int, default=1600, help='Legacy command-line width; now used as exact crop width in --yes mode')
    parser.add_argument('--max-height', type=int, default=1200, help='Legacy command-line height; now used as exact crop height in --yes mode')
    parser.add_argument('--size', type=parse_size, help='Exact crop size, e.g. --size 1024x683; skips size prompt')
    parser.add_argument('--quality', type=int, default=90)
    parser.add_argument('--yes', action='store_true', help='Skip confirmation')
    args = parser.parse_args()

    root = (args.project_root or root_guess(Path(__file__).resolve().parent)).resolve()
    source = (args.source or root / 'aman').resolve()
    dest_root = (args.dest_root or destination_guess(root)).resolve()
    property_id = slug(args.property_id or input('Property ID (e.g. property-001): ').strip())
    if not property_id or property_id == 'other':
        print('ERROR: A valid property ID is required.')
        return 1
    if not source.is_dir():
        print(f'ERROR: Source folder missing: {source}')
        print('Create it and add category folders such as exterior, dining, bedrooms, studios, etc.')
        return 1
    if args.max_width < 1 or args.max_height < 1 or not 1 <= args.quality <= 100:
        print('ERROR: dimensions must be positive and quality must be 1–100.')
        return 1

    # Preserve existing command-line automation, but ask for dimensions when
    # started interactively via RUN_IMAGE_ORGANIZER.bat.
    if args.size is not None:
        crop_width, crop_height = args.size
    elif args.yes or '--max-width' in sys.argv or '--max-height' in sys.argv:
        crop_width, crop_height = args.max_width, args.max_height
    else:
        while True:
            answer = input('Exact image size WIDTHxHEIGHT [1024x683]: ').strip() or '1024x683'
            try:
                crop_width, crop_height = parse_size(answer)
                break
            except argparse.ArgumentTypeError as exc:
                print('ERROR:', exc)
    if crop_width > 12000 or crop_height > 12000:
        print('ERROR: crop dimensions must not exceed 12000 pixels.')
        return 1

    property_dest = dest_root / property_id
    try:
        source.relative_to(property_dest)
        print('ERROR: Source is inside the output folder. Choose a different source.')
        return 1
    except ValueError:
        pass
    try:
        property_dest.relative_to(source)
        print('ERROR: Output is inside source; this risks recursive processing.')
        return 1
    except ValueError:
        pass

    # Relative folder structure is retained; every segment is corrected independently.
    items = sorted((p for p in source.rglob('*') if p.is_file() and p.suffix.lower() in EXTENSIONS), key=lambda p: str(p).casefold())
    if not items:
        print('No supported images found, including in subfolders. Nothing changed.')
        return 0
    print(f'\nSource:       {source}\nDestination:  {property_dest}\nImages found: {len(items)}')
    print(f'Crop size:    {crop_width}x{crop_height} (center crop; no distortion)')
    mapping = {}
    for p in items:
        parts = [canonical_folder(x) for x in p.relative_to(source).parts[:-1]]
        if not parts:
            parts = ['other']
        mapping['/'.join(p.relative_to(source).parts[:-1]) or '(root)'] = '/'.join(parts)
    print('\nDetected folder names (original -> standardized):')
    for before, after in sorted(mapping.items()):
        print(f'  {before} -> {after}')
    print('\nOriginal files will NOT be deleted or overwritten.')
    if not args.yes and input('Proceed? [y/N]: ').strip().lower() not in ('y', 'yes'):
        print('Cancelled; nothing changed.')
        return 0

    property_dest.mkdir(parents=True, exist_ok=True)
    manifest = property_dest / 'IMAGE_IMPORT_MANIFEST.csv'
    fields = ['timestamp', 'original_relative_path', 'source_sha256', 'output_relative_path', 'width', 'height', 'bytes']
    existing = []
    if manifest.exists():
        with manifest.open('r', encoding='utf-8-sig', newline='') as f:
            existing = list(csv.DictReader(f))
    # Match content AND its source relative path, so repeat runs are safe.
    already = {(r.get('original_relative_path'), r.get('source_sha256')) for r in existing
               if (property_dest / r.get('output_relative_path', '')).is_file()}
    used_by_folder: dict[Path, set[str]] = {}
    succeeded = 0
    skipped = 0
    failed = 0
    new_rows = []
    for src in items:
        relative = src.relative_to(source)
        corrected = [canonical_folder(x) for x in relative.parts[:-1]] or ['other']
        folder = property_dest.joinpath(*corrected)
        # Include the category path in the filename, but do not require any fixed list.
        category = '-'.join(corrected)
        try:
            fingerprint = digest_file(src)
            if (relative.as_posix(), fingerprint) in already:
                skipped += 1
                print(f'SKIP (already imported): {relative}')
                continue
            folder.mkdir(parents=True, exist_ok=True)
            if folder not in used_by_folder:
                used_by_folder[folder] = {p.name.lower() for p in folder.iterdir() if p.is_file()}
            name = next_name(folder, property_id, category, used_by_folder[folder])
            out = folder / name
            w, h = convert(src, out, crop_width, crop_height, args.quality)
            new_rows.append({'timestamp': datetime.now().isoformat(timespec='seconds'),
                             'original_relative_path': relative.as_posix(), 'source_sha256': fingerprint,
                             'output_relative_path': out.relative_to(property_dest).as_posix(),
                             'width': w, 'height': h, 'bytes': out.stat().st_size})
            succeeded += 1
            print(f'OK: {relative} -> {out.relative_to(property_dest)} ({w}x{h})')
        except (OSError, ValueError, UnidentifiedImageError) as exc:
            failed += 1
            print(f'ERROR: {relative} : {exc}')
    if new_rows:
        with manifest.open('a', encoding='utf-8-sig' if not manifest.exists() else 'utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            if f.tell() == 0:
                writer.writeheader()
            writer.writerows(new_rows)
    print(f'\nFinished. New: {succeeded}; already imported: {skipped}; errors: {failed}.')
    print('Destination:', property_dest)
    print('Originals retained in:', source)
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
