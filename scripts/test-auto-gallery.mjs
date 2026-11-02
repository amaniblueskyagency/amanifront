import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const tmp=mkdtempSync(join(tmpdir(),'amani-auto-gallery-'));
const web=join(tmp,'amani-web');
const script=join(web,'scripts','auto-gallery.mjs');
function file(path,content='sample'){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,content)}
const photo=(folder,name,content) => file(join(web,'img','rental',folder,name),content);
function publish(){execFileSync(process.execPath,[script,'--root',web],{stdio:'pipe'});return JSON.parse(readFileSync(join(web,'property_gallery_published.json'),'utf8')).properties;}
try{
  mkdirSync(dirname(script),{recursive:true});copyFileSync(join(base,'scripts','auto-gallery.mjs'),script);
  file(join(web,'property_gallery_registry.json'),JSON.stringify({
    '003':{db_id:'amani-p003',gallery_verified:false},
    '007':{db_id:'amani-p007'},
    '009':{db_id:'amani-p009'}
  }));
  photo('property-007','exterior/01.jpg','amazon-building');
  photo('property-007','bedrooms/01.jpg','amazon-bed');
  photo('property-009','studios/01.jpg','studio-image');
  photo('property-009','washrooms/01.jpg','washroom-image');
  photo('property-009','exterior/01.jpg','studio-outside');
  photo('property-009','old-legacy.jpg','wrong-property-legacy');
  photo('property-011','shops/interior/01.jpg','shop-interior');
  photo('property-012','general/01.jpg','other');
  photo('property-003','exterior/01.jpg','heights-unknown');
  let idx=publish();
  assert.equal(idx['amani-p007'].photos.length,2);
  assert.equal(idx['amani-p009'].photos.length,3);
  assert.deepEqual([...new Set(idx['amani-p009'].photos.map(p=>p.category))].sort(),['Bathrooms','Exterior','Living Areas']);
  assert.equal(idx['amani-p009'].photos.find(p=>p.unit_type==='Studio').category,'Living Areas');
  assert.ok(idx['amani-p009'].photos.every(p=>!p.src.endsWith('old-legacy.jpg')),'legacy flat image excluded');
  assert.equal(idx['amani-p011'].photos[0].unit_type,'Shop');
  assert.equal(idx['amani-p011'].photos[0].category,'Interior');
  assert.equal(idx['amani-p003'].gallery_verified,false);
  assert.ok(!('title_contains' in idx['amani-p003']));
  assert.equal(idx['amani-p012'].photos[0].category,'General');
  assert.equal(idx['amani-p010'],undefined);
  // New category works with no code or registry edits.
  photo('property-009','balcony/new.jpg','balcony-new');
  idx=publish();
  assert.equal(idx['amani-p009'].photos.length,4);
  assert.equal(idx['amani-p009'].photos.find(p=>p.src.endsWith('new.jpg')).category,'Balcony');
  // Empty existing registered property remains empty and safe.
  assert.equal(idx['amani-p007'].folder,'property-007');
  // Rerunning without changes does not rewrite the index.
  const before=readFileSync(join(web,'property_gallery_published.json'),'utf8');
  idx=publish();
  assert.equal(readFileSync(join(web,'property_gallery_published.json'),'utf8'),before);
  console.log('PASS: auto-indexing / optional categories / studio / shop / legacy exclusion / unknown property / repeat publish');
}finally{rmSync(tmp,{recursive:true,force:true})}
