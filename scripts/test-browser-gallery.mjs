import assert from 'node:assert/strict';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const web=resolve(dirname(fileURLToPath(import.meta.url)),'..');
globalThis.window={location:{hostname:'localhost',protocol:'http:'}};
const index={version:4,properties:{
 'amani-p007':{folder:'property-007',gallery_verified:true,photos:[{src:'img/rental/property-007/exterior/pic.jpg',category:'Exterior'}]},
 'amani-p003':{folder:'property-003',gallery_verified:false,photos:[{src:'img/rental/property-003/general/old.jpg',category:'General'}]},
 'amani-p009':{folder:'property-009',gallery_verified:true,photos:[]}
}};
let calls=0;
const response=data=>({ok:true,json:async()=>({data,success:true})});
globalThis.fetch=async url=>{
 calls++;
 if(url==='/property_gallery_published.json') return {ok:true,json:async()=>index};
 if(String(url).endsWith('/properties-with-availability')) return response([
  {id:'amani-p007',title:'Sunrise Apartments',thumbnail:'img/rental/old-amazon.jpg',units:[]},
  {id:'amani-p009',title:'Juja Farm Apartments',thumbnail:'img/rental/old-juja.jpg',units:[]}
 ]);
 if(String(url).endsWith('/properties/amani-p007/details')) return response({property:{id:'amani-p007',title:'Sunrise Apartments',thumbnail:'img/rental/old-amazon.jpg'},gallery:[{src:'img/rental/old-amazon.jpg'}],units:[]});
 if(String(url).endsWith('/properties/amani-p003/details')) return response({property:{id:'amani-p003',title:'Wakiinama Blessings',thumbnail:'img/rental/old03.jpg'},gallery:[{src:'img/rental/old03.jpg'}],units:[]});
 if(String(url).endsWith('/properties/amani-p009/details')) return response({property:{id:'amani-p009',title:'Juja Farm Apartments',thumbnail:'img/rental/old09.jpg'},gallery:[{src:'img/rental/old09.jpg'}],units:[]});
 if(String(url).endsWith('/properties/amani-p007/head')) return response({property_id:'amani-p007',title:'Sunrise Apartments',carousel_images:['img/rental/old-amazon.jpg']});
 throw Error('Unexpected API URL '+url);
};
const api=await import(pathToFileURL(resolve(web,'js/services/amani-api.js')).href+'?test=1');
const a=await api.fetchPropertyDetails('amani-p007');
assert.equal(a.gallery.length,1);
assert.equal(a.gallery[0].src,'img/rental/property-007/exterior/pic.jpg');
assert.equal(a.property.thumbnail,a.gallery[0].src);
const b=await api.fetchPropertyDetails('amani-p003');
assert.deepEqual(b.gallery,[]);assert.equal(b.property.thumbnail,'');
const j=await api.fetchPropertyDetails('amani-p009');
assert.deepEqual(j.gallery,[]);assert.equal(j.property.thumbnail,'');
const list=await api.fetchProperties();
assert.equal(list[0].thumbnail,'img/rental/property-007/exterior/pic.jpg');
assert.equal(list[1].thumbnail,'');
const head=await api.fetchPropertyHead('amani-p007');
assert.deepEqual(head.carousel_images,['img/rental/property-007/exterior/pic.jpg']);
console.log('PASS: galleries keyed by property ID after rename, stale backend photos blocked, unverified photos hidden');
