import process from 'node:process';
const host=(process.env.AMANI_CHECK_ORIGIN||'https://amanibluesky.com').replace(/\/+$/,'');
const expected=['Amani Blue Sky Properties','Amani Blue Sky Properties Agency','Amani Blue Sky Agency'];
let failed=0;
async function read(path){
  const url=host+path;
  try{
    const res=await fetch(url,{redirect:'follow',headers:{'User-Agent':'Amani-Release-Check/1.0','Accept':'text/html,application/xml,text/plain'}});
    const body=await res.text();
    console.log(`${res.ok?'PASS':'FAIL'} HTTP ${res.status} ${url} -> ${res.url}`);
    if(!res.ok)failed++;
    return body;
  }catch(e){console.error(`FAIL ${url}: ${e.message}`);failed++;return '';}
}
const homepage=await read('/');
for(const term of expected){
  const present=homepage.includes(term);
  console.log(`${present?'PASS':'FAIL'} Live homepage mentions ${term}`);
  if(!present)failed++;
}
for(const phrase of ['Client Name','Property Type 1','#1 Place To Find','Certified Agent']){
  const present=homepage.includes(phrase);
  console.log(`${present?'FAIL':'PASS'} No demo content: ${phrase}`);
  if(present)failed++;
}
if(!homepage.includes('https://amanibluesky.com/')){console.error('FAIL: Expected Amani canonical identity absent.');failed++;}
const robots=await read('/robots.txt');
if(!robots.includes('Sitemap: https://amanibluesky.com/sitemap.xml')){console.error('FAIL: robots.txt sitemap incorrect or missing');failed++;}
const sitemap=await read('/sitemap.xml');
const urls=[...sitemap.matchAll(/<loc>\s*(https:\/\/amanibluesky\.com\/[^<]*)<\/loc>/g)];
console.log(`${urls.length?'PASS':'FAIL'} Sitemap contains ${urls.length} matching canonical URL/image loc entries`);
if(!urls.length)failed++;
const detail=await read('/properties/amani-p007/');
if(!/property|apartment|amani/i.test(detail)){console.error('FAIL: Property detail not reachable/content incomplete');failed++;}
console.log(failed ? `FAIL: ${failed} live checks. Review Netlify deployed commit and DNS.` : 'PASS: Live endpoints expose brand, pages and sitemap. Google indexing must be checked in Search Console.');
process.exitCode=failed?1:0;
