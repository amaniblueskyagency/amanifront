import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {join, relative, sep} from 'node:path';
import assert from 'node:assert/strict';
// Only the generated dist/ directory is deployed to Netlify. SEO source files
// may be kept at the project root or under public/, or generated exclusively
// during npm run build. Requiring public/ causes false failures after a valid
// production build; validate the actual deploy artifact instead.
const root='dist';
const site=process.env.SITE_URL||process.env.URL;
assert(site,'SITE_URL required to verify canonical URLs');
const base=new URL(site).origin;
const read=(p)=>readFileSync(join(root,p),'utf8');
const walk=(baseFolder)=>readdirSync(baseFolder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(baseFolder,e.name)):[join(baseFolder,e.name)]);
const files=walk(root).map(p=>relative(root,p).split(sep).join('/'));
const htmlFiles=files.filter(p=>p.endsWith('.html'));
const sitemap=read('sitemap.xml');
const mapLocs=[...sitemap.matchAll(/<url>\s*<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
const allLocs=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Invalid XML declaration');
assert.equal(new Set(mapLocs).size,mapLocs.length,'Duplicate sitemap canonical URLs');
assert(mapLocs.length>=7,'Public pages missing from sitemap');
const redirectLines=read('_redirects').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
const redirects=new Map(redirectLines.map(l=>[l.split(/\s+/)[0],l]));
assert(redirects.get('/api/site/*')?.includes('200'),'Missing public API proxy in Netlify redirects');
assert(redirects.get('/index.html')?.includes('301!'),'Missing forced homepage redirect');
assert(!redirects.has('/properties.html')&&!redirects.has('/property.html'),'Legacy detail redirect would drop selected property query');
const staticPages=['about','contact','property-list','property-type','property-agent','testimonial'];
for(const page of staticPages)assert(redirects.get(`/${page}.html`)===`/${page}.html  /${page}/  301!`,`Missing legacy pretty URL redirect for ${page}`);
for(const p of ['properties','property'])assert(existsSync(join(root,`${p}.html`)),`Missing legacy detail template ${p}.html`);
const siteRobots=read('robots.txt');
assert(siteRobots.includes(`Sitemap: ${base}/sitemap.xml`),'Robots sitemap hostname mismatch');
assert(!/Disallow: \/\s*$/m.test(siteRobots),'Robots blocks entire site');
for(const name of ['index','about','contact','property-list','property-type','property-agent','testimonial','properties','property','404']){
  const source=readFileSync(`${name}.html`,'utf8');
  for(const token of ['rel="canonical"','name="description"','property="og:title"','rel="icon"','rel="manifest"'])
    assert(source.includes(token),`Source ${name}.html missing ${token}`);
}
const indexable=[];
for(const name of htmlFiles){
  const html=read(name);
  const canonical=html.match(/<link rel="canonical" href="([^"]+)"/);
  assert(canonical,`Missing canonical: ${name}`);
  assert.equal((html.match(/<link\s+rel="canonical"/g)||[]).length,1,`Duplicate canonical: ${name}`);
  assert.equal((html.match(/<meta\s+name="description"/g)||[]).length,1,`Duplicate description: ${name}`);
  assert.equal((html.match(/<link\s+rel="icon"/g)||[]).length,1,`Missing/duplicate favicon: ${name}`);
  assert.equal((html.match(/<link\s+rel="manifest"/g)||[]).length,1,`Missing/duplicate manifest: ${name}`);
  assert(html.includes('og:site_name'),`Missing brand OG metadata: ${name}`);

  assert(canonical[1].startsWith(base+'/'),`Wrong canonical host: ${name}`);
  assert(html.includes('<title>'),`Missing title: ${name}`);
  assert(html.includes('<meta name="description"'),`Missing description: ${name}`);
  assert(html.includes('og:title')&&html.includes('og:url'),`Missing social metadata: ${name}`);
  assert(html.includes('<h1'),`Missing visible H1: ${name}`);
  assert(!/https?:\/\/example\.com/.test(html)||/example\.com/.test(base),`Placeholder domain leaked: ${name}`);
  const noindex=/<meta name="robots" content="noindex/i.test(html);
  const isCanonicalFile=name==='index.html'||name.endsWith('/index.html');
  if(!noindex&&isCanonicalFile){
    const route=name==='index.html'?'/':'/'+name.slice(0,-'index.html'.length);
    assert.equal(canonical[1],base+route,`Canonical path mismatch: ${name}`);
    assert(mapLocs.includes(canonical[1]),`Missing canonical page in sitemap: ${name}`);
    indexable.push(name);
  }
  if(name.startsWith('properties/amani-p')){
    assert(html.includes('<base href="/">'),`Nested assets may break: ${name}`);
    assert(html.includes('<script type="application/ld+json">'),`Property structured data missing: ${name}`);
    assert(html.includes('id="property-details-container">'),`Missing property summary: ${name}`);
  }
  if(name.startsWith('rentals/') && name.endsWith('index.html'))assert(html.includes('CollectionPage'),`Rental category structured data missing: ${name}`);
}
assert.equal(indexable.length,mapLocs.length,`Sitemap contains ${mapLocs.length} URLs but ${indexable.length} canonical pages`);
for(const url of mapLocs){
  assert(url.startsWith(base+'/'),`External canonical sitemap URL ${url}`);
  const route=new URL(url).pathname;
  const dest=route==='/'?'index.html':route.slice(1)+'index.html';
  assert(existsSync(join(root,dest)),`Sitemap URL has no physical page: ${url}`);
}
for(const url of allLocs.filter(x=>!mapLocs.includes(x))){
  if(!url.startsWith(base+'/'))throw Error(`External image URL in sitemap: ${url}`);
  const local=decodeURI(new URL(url).pathname).replace(/^\//,'');
  assert(existsSync(join(root,local)),`Sitemap image missing: ${url}`);
}
assert(read('index.html').includes('Amani Blue Sky Properties Agency'),'Missing requested full brand variant');
for(const name of ['favicon.png','site.webmanifest','404.html'])assert(existsSync(join(root,name)),`Missing required asset ${name}`);
for(const name of ['.env','scripts','netlify.toml'])assert(!existsSync(join(root,name)),`Internal file leaked into public deploy ${name}`);
for(const name of ['properties.html','property.html','404.html','testimonial.html'])assert(read(name).includes('noindex,follow'),`Unindexed utility page missing noindex: ${name}`);
console.log(`PASS: ${indexable.length} canonical indexable HTML pages, ${htmlFiles.length} HTML files checked, ${mapLocs.length} sitemap entries; robots, redirects, metadata, structured data and image paths verified.`);
