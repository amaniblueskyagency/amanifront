import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const workspace=mkdtempSync(join(tmpdir(),'amani-gallery-id-test-'));
const web=join(workspace,'amani-web');
const backend=join(workspace,'amani-backend');
function file(path, data='image-bytes') {mkdirSync(dirname(path),{recursive:true});writeFileSync(path,data);}
try {
  mkdirSync(join(web,'scripts'),{recursive:true});
  mkdirSync(join(web,'js','services'),{recursive:true});
  mkdirSync(join(backend,'src','utils'),{recursive:true});
  mkdirSync(join(backend,'src','data'),{recursive:true});
  for(const [from,to] of [
    [join(root,'scripts','auto-gallery.mjs'),join(web,'scripts','auto-gallery.mjs')],
    [join(root,'js','services','amani-api.js'),join(web,'js','services','amani-api.js')],
    [resolve(root,'..','amani-backend','src','utils','folder-gallery-catalog.js'),join(backend,'src','utils','folder-gallery-catalog.js')]
  ]) copyFileSync(from,to);
  file(join(web,'property_gallery_registry.json'),JSON.stringify({
    '001':{db_id:'amani-p001',label:'Old Name, no longer used'},
    '003':{db_id:'amani-p003',label:'Blessings',gallery_verified:false},
    '006':{db_id:'amani-p006',label:'Vinny House'},
    '007':{db_id:'amani-p007',label:'Amazon Apartment'},
    '009':{db_id:'amani-p009',label:'Juja Farm Apartments'}
  }));
  file(join(web,'img','rental','property-001','exterior','one.jpg'));
  file(join(web,'img','rental','property-003','exterior','uncertain.jpg'));
  file(join(web,'img','rental','property-006','bedrooms','one.jpg'));
  file(join(web,'img','rental','property-007','exterior','one.jpg'));
  file(join(web,'img','rental','property-009','studios','room.jpg'));
  file(join(web,'img','rental','property-009','washrooms','bath.jpg'));
  execFileSync(process.execPath,[join(web,'scripts','auto-gallery.mjs'),'--root',web],{stdio:'pipe'});
  const catalog=JSON.parse(readFileSync(join(web,'property_gallery_published.json'),'utf8'));
  assert.equal(catalog.version,5);
  assert.ok(Object.values(catalog.properties).every(v=>!('title_contains' in v)), 'name gates must not be published');
  assert.equal(catalog.properties['amani-p003'].gallery_verified,false);
  assert.equal(catalog.properties['amani-p009'].photos.length,2);
  assert.deepEqual(readFileSync(join(backend,'src','data','property_gallery_published.json')),
    readFileSync(join(web,'property_gallery_published.json')));
  globalThis.window={location:{hostname:'localhost',protocol:'http:'}};
  const response = data => ({ok:true,json:async()=>({success:true,data})});
  globalThis.fetch=async url=>{
    if(url==='/property_gallery_published.json') return {ok:true,json:async()=>catalog};
    if(String(url).endsWith('/properties-with-availability')) return response([
      {id:'amani-p006',title:'Entirely Renamed House',thumbnail:'old.jpg',units:[]},
      {id:'amani-p007',title:'Sunrise Rentals',thumbnail:'old.jpg',units:[]},
      {id:'amani-p009',title:'Ann House',thumbnail:'old.jpg',units:[]},
      {id:'amani-p003',title:'Wakiinama Blessings',thumbnail:'old.jpg',units:[]}
    ]);
    if(String(url).endsWith('/properties/amani-p009/details')) return response({property:{id:'amani-p009',title:'Ann House',thumbnail:'old.jpg'},gallery:[{src:'old.jpg'}],units:[]});
    if(String(url).endsWith('/properties/amani-p003/details')) return response({property:{id:'amani-p003',title:'Wakiinama Blessings',thumbnail:'old.jpg'},gallery:[{src:'old.jpg'}],units:[]});
    if(String(url).endsWith('/properties/amani-p007/head')) return response({property_id:'amani-p007',title:'Sunrise Rentals',carousel_images:['old.jpg']});
    throw Error('Unexpected URL '+url);
  };
  const webapi=await import(pathToFileURL(join(web,'js','services','amani-api.js')).href);
  const properties=await webapi.fetchProperties();
  for (const p of properties.slice(0,3)) {
    assert.ok(p.thumbnail.startsWith(`img/rental/property-${p.id.slice(-3)}/`),p.id+' should use ID index after rename');
  }
  assert.equal(properties[3].thumbnail,'','P003 remains explicitly unverified regardless of title');
  const detail=await webapi.fetchPropertyDetails('amani-p009');
  assert.equal(detail.gallery.length,2,'renamed studio must show both photos');
  assert.equal(detail.property.title,'Ann House','updated database title remains displayed');
  const hidden=await webapi.fetchPropertyDetails('amani-p003');
  assert.equal(hidden.gallery.length,0,'unverified p003 stays hidden');
  const head=await webapi.fetchPropertyHead('amani-p007');
  assert.equal(head.carousel_images[0],catalog.properties['amani-p007'].photos[0].src);
  const backendApi=await import(pathToFileURL(join(backend,'src','utils','folder-gallery-catalog.js')).href);
  assert.equal(backendApi.folderPhotosForProperty({id:'amani-p009',title:'Ann House'}).length,2);
  assert.equal(backendApi.folderPhotosForProperty({id:'amani-p006',title:'Entirely Renamed House'}).length,1);
  assert.equal(backendApi.folderPhotosForProperty({id:'amani-p003',title:'Wakiinama Blessings'}).length,0);
  assert.deepEqual(backendApi.folderPhotosForProperty({id:'amani-p010',title:'Some House'}),[]);
  console.log('PASS: permanent ID mapping / renamed properties / listing, details, header / backend / P003 safety / empty gallery');
} finally {rmSync(workspace,{recursive:true,force:true});}
