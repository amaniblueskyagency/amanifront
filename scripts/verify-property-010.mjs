// Verify the exact gallery paths that will be deployed for Property 010.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'dist', 'property_gallery_published.json'), 'utf8'));
const item = manifest.properties?.['amani-p010'];
assert.equal(item?.folder, 'property-010', 'Property 010 must map to property-010 folder');
assert.equal(item?.gallery_verified, true, 'Property 010 gallery must be verified');
assert.ok(item.photos?.length, 'Property 010 images missing from published manifest');
for (const photo of item.photos) {
  const path = photo.src;
  assert.match(path, /^img\/rental\/property-010\/[a-z0-9_-]+\/[a-zA-Z0-9_.-]+\.(?:jpg|jpeg|webp|png|avif|gif)$/i);
  assert.ok(!path.includes('..'), `Unsafe path: ${path}`);
  for (const prefix of [root, resolve(root, 'dist')]) {
    const file = resolve(prefix, path);
    assert.ok(existsSync(file) && statSync(file).size > 0, `Missing or empty: ${file}`);
  }
}
console.log(`PASS: Property 010, ${item.photos.length} gallery URLs match real source and deployment images.`);
