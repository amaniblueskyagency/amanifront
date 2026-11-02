/**
 * Amani self-indexing property photos. No fixed room list, no Supabase writes.
 * node scripts/auto-gallery.mjs                 # one-pass / build
 * node scripts/auto-gallery.mjs --watch          # watch local folder continuously
 * node scripts/auto-gallery.mjs --root /other/web # test fixture / alternate web root
 *
 * A browser cannot list a static host's directories. This index is rebuilt at
 * local-server startup or at deployment build, never maintained by hand.
 */
import { readFileSync, writeFileSync, renameSync, readdirSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, resolve, dirname, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const defaultWeb = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argValue = flag => process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : undefined;
const web = resolve(argValue('--root') || defaultWeb);
const rental = join(web, 'img', 'rental');
const registryPath = join(web, 'property_gallery_registry.json');
const indexWebPath = join(web, 'property_gallery_published.json');
const backendPath = resolve(web, '..', 'amani-backend', 'src', 'data', 'property_gallery_published.json');
const folderPattern = /^property-(\d{3,})$/i;
const imagePattern = /\.(?:jpg|jpeg|webp|png|avif|gif)$/i;
const categories = {
  exterior:'Exterior', exteriors:'Exterior', extirior:'Exterior', outside:'Exterior', outdoor:'Exterior', compound:'Exterior',
  bedroom:'Bedrooms', bedrooms:'Bedrooms', bedrom:'Bedrooms',
  bathroom:'Bathrooms', bathrooms:'Bathrooms', washroom:'Bathrooms', washrooms:'Bathrooms', washrom:'Bathrooms', toilets:'Bathrooms', toilet:'Bathrooms',
  kitchen:'Kitchen', kitchens:'Kitchen', kitchenette:'Kitchen',
  dining:'Dining', dinning:'Dining', 'dining-room':'Dining', 'room-dining':'Living Areas', 'room-dinning':'Living Areas',
  room:'Living Areas', rooms:'Living Areas', living:'Living Areas', 'living-areas':'Living Areas',
  'living-room':'Living Areas', 'sitting-room':'Living Areas', lounge:'Living Areas',
  corridor:'Corridors', corridors:'Corridors', corridos:'Corridors', hallway:'Corridors', hallways:'Corridors',
  parking:'Parking', garage:'Parking', balconies:'Balcony', balcony:'Balcony', entrance:'Entrance',
  terrace:'Terrace', rooftop:'Rooftop', stairs:'Stairs', staircase:'Stairs', garden:'Garden',
  shopfront:'Exterior', interior:'Interior', interiors:'Interior', amenities:'Amenities',
  general:'General', gallery:'General', photos:'General', other:'General'
};
const slug = s => String(s).toLowerCase().trim().replace(/[\s_]+/g,'-');
const title = s => s.split('-').filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
const unitType = s => {
  const v=slug(s);
  if(['studio','studios'].includes(v)) return 'Studio';
  if(['bedsitter','bedsitters','bed-sitter','bed-sitters'].includes(v)) return 'Bedsitter';
  if(['shop','shops','retail'].includes(v)) return 'Shop';
  const match=v.match(/^([1-9])(?:br|-br|bedroom|bedrooms|-bedroom|-bedrooms)$/);
  return match ? `${match[1]}BR` : '';
};
const natural = (a,b) => a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});
const readRegistry = () => {
  if (!existsSync(registryPath)) return {}; // numbered folders work without a registry
  return JSON.parse(readFileSync(registryPath,'utf8'));
};
const walk = (dir, root=dir) => {
  if(!existsSync(dir)) return [];
  const files=[];
  for(const ent of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>natural(a.name,b.name))){
    if(ent.name.startsWith('.') || ent.isSymbolicLink()) continue;
    const full=join(dir,ent.name);
    if(ent.isDirectory()) files.push(...walk(full,root));
    else if(ent.isFile() && imagePattern.test(ent.name)) files.push(full);
  }
  return files;
};
const hash = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const normalize = value => value.split(sep).join('/');
const atomicUpdate = (filename, contents) => {
  if(existsSync(filename) && readFileSync(filename,'utf8') === contents) return false;
  mkdirSync(dirname(filename),{recursive:true});
  const temp=`${filename}.auto-gallery-tmp-${process.pid}`;
  writeFileSync(temp,contents,'utf8');
  renameSync(temp,filename);
  return true;
};
function build() {
  const registry=readRegistry();
  const properties={};
  const warnings=[];
  const stats={};
  // Existing known identities are maintained as a safeguard; future property
  // numbers automatically map to database IDs using the established convention.
  for(const [number, rec] of Object.entries(registry)){
    const dbId=rec.db_id || `amani-p${number}`;
    // Property identity is the immutable DB ID, not a mutable marketing title.
    // gallery_verified=false is an independent media-identity safeguard.
    properties[dbId]={folder:`property-${number}`,gallery_verified:rec.gallery_verified !== false,photos:[]};
  }
  for(const entry of existsSync(rental) ? readdirSync(rental,{withFileTypes:true}).sort((a,b)=>natural(a.name,b.name)) : []){
    if(!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const match=entry.name.match(folderPattern);
    if(!match) continue;
    const number=match[1];
    const known=registry[number];
    const id=`amani-p${number}`; // folder number alone maps to immutable database ID
    if (known?.db_id && known.db_id !== id) warnings.push(`${entry.name}: registry ID ${known.db_id} disagrees with folder-derived ID ${id}; using ${id}`);
    const folder=join(rental,entry.name);
    const allFiles=walk(folder);
    // Structured categories supersede the historical General bucket. If General
    // is the only populated branch, keep it. No photo category is required.
    const categorized=allFiles.some(f=>relative(folder,f).split(sep).length>1);
    const hasSpecificCategories=allFiles.some(f=>{
      const branches=normalize(relative(folder,f)).split('/').slice(0,-1).map(slug);
      return branches.length>0 && branches.some(b=>!['general','gallery','photos','other'].includes(b));
    });
    const excluded=new Set((known?.excluded_gallery_paths||[]).map(x=>x.replaceAll('\\','/')));
    const photos=[];
    const seenExactCopies=new Set(); // same filename + identical bytes in two branches
    for(const file of allFiles){
      const rel=normalize(relative(folder,file));
      if(!rel || rel.startsWith('../') || rel.includes('/../') || excluded.has(rel)) continue;
      if(categorized && !rel.includes('/')) continue; // legacy flat photo
      if(hasSpecificCategories && ['general','gallery','photos','other'].includes(slug(rel.split('/')[0]))) continue;
      const dirs=rel.split('/').slice(0,-1);
      const type=dirs.map(unitType).find(Boolean)||'';
      let category='General';
      for(const dir of dirs.slice().reverse()){
        const normal=slug(dir);
        if(categories[normal]) { category=categories[normal];break; }
        if(!unitType(normal)) { category=title(normal);break; }
      }
      if(category==='General' && (type==='Studio'||type==='Bedsitter')) category='Living Areas';
      if(category==='General' && type==='Shop') category='Interior';
      const digest=hash(file);
      const exactKey=`${file.split(sep).at(-1).toLowerCase()}:${digest}`;
      if(seenExactCopies.has(exactKey)) continue;
      seenExactCopies.add(exactKey);
      photos.push({src:`img/rental/${entry.name}/${rel}`,category,unit_type:type,sha256:digest});
    }
    photos.sort((a,b)=> (a.category==='Exterior'?0:1)-(b.category==='Exterior'?0:1)||natural(a.src,b.src));
    properties[id]={folder:entry.name,gallery_verified:known?.gallery_verified !== false,photos};
    stats[id]=photos.length;
    if(!known) warnings.push(`${entry.name}: automatically mapped to ${id}; verify the ID exists in Supabase before public deployment.`);
    if(allFiles.length && photos.length===0) warnings.push(`${entry.name}: no eligible photos (excluded or duplicates).`);
  }
  const manifest=JSON.stringify({version:5,properties},null,2)+'\n';
  const changed=atomicUpdate(indexWebPath,manifest);
  // Optional compatibility copy: only if the adjacent backend exists locally.
  // The public website reads its own manifest; this is not required on Render.
  if(existsSync(resolve(web,'..','amani-backend','src','data'))) atomicUpdate(backendPath,manifest);
  if(process.argv.includes('--verbose') || changed){
    console.log(`[Amani gallery] ${changed?'Updated':'Unchanged'}: ${Object.entries(stats).map(([id,count])=>`${id}=${count}`).join(' | ')||'no folders yet'}`);
    for(const warning of warnings) console.warn('[Amani gallery] '+warning);
  }
  return {changed,stats,warnings};
}
// Watcher rescans file attributes, not the image contents, until a change happens.
function snapshot(){
  return walk(rental).map(f=>{const st=statSync(f);return `${normalize(relative(rental,f))}:${st.size}:${st.mtimeMs}`;}).join('|');
}
function main(){
  build();
  if(process.argv.includes('--watch')){
    let previous=snapshot();
    console.log(`[Amani gallery] Monitoring ${rental} (Ctrl+C to stop)`);
    setInterval(()=>{
      try {const now=snapshot(); if(now!==previous){ build(); previous=now; }}
      catch(error){console.error('[Amani gallery] Auto-scan failed:',error.message);}
    },3000);
  }
}
main();
