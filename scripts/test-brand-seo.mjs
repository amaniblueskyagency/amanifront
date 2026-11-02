import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root='dist';
const read=(f)=>readFileSync(`${root}/${f}`,'utf8');
const hostname='https://amanibluesky.com';
const home=read('index.html');
const scripts=[...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
assert(scripts.length,'Homepage JSON-LD missing');
const graphs=scripts.map(m=>JSON.parse(m[1]));
const nodes=graphs.flatMap(g=>g['@graph']||[g]);
const website=nodes.find(n=>n['@type']==='WebSite');
const company=nodes.find(n=>n['@type']==='Organization');
assert(website&&company,'WebSite and Organization schema must both exist');
assert.equal(website.url,hostname+'/');
assert.equal(company.url,hostname+'/');
assert.equal(website.name,'Amani Blue Sky Properties');
for(const alias of ['Amani Blue Sky Agency','Amani Properties','Blue Sky Agency','Blue Sky Properties','AmaniBlueSkyProperties']) {
  assert(website.alternateName.includes(alias),`Missing brand alias ${alias}`);
}
for(const phrase of ['rental houses','studio','Thika','Juja'])assert(home.toLowerCase().includes(phrase.toLowerCase()),`Missing natural home context ${phrase}`);
for(const f of ['index.html','about/index.html','contact/index.html','property-list/index.html','property-type/index.html']) {
  const html=read(f);
  assert(html.includes('href="https://amanibluesky.com/'),`Wrong canonical host in ${f}`);
  assert(html.includes('og:site_name'),`Missing brand social tag ${f}`);
}
for(const f of ['sitemap.xml','robots.txt'])assert(read(f).includes(hostname),`${f}: wrong host`);
assert(!read('sitemap.xml').includes('www.amanibluesky.com'),'Sitemap mixes www and apex');
console.log('PASS: Verified canonical apex domain, brand variants, homepage content, WebSite/Organization schema, social metadata, sitemap and robots.');
