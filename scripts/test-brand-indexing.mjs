import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const home=readFileSync('index.html','utf8');
const build=readFileSync('scripts/build.mjs','utf8');
const names=['Amani Blue Sky Properties Agency','Amani Blue Sky Agency','Amani Properties','Blue Sky Agency','AmaniBlueSkyProperties','Amani Blue Sky Property','Amani Bluesky Agency'];
for (const n of names) {assert(home.includes(n),`Source homepage missing ${n}`);assert(build.includes(n),`Build generator missing ${n}`);}
assert(home.includes('Amani Blue Sky <span class="text-primary">Properties</span>'),'Visible homepage H1 missing business name');
assert(home.includes('https://amanibluesky.com/'),'Canonical home URL is missing');
assert((home.match(/<h1\b/g)||[]).length===1,'Homepage should contain exactly one meaningful H1');
assert(!home.includes('<meta name="keywords"'),'Unsupported keyword meta must not be added');
assert(!/Client Name|Property Type 1|Location 1|Certified Agent|#1 Place To Find/i.test(home),'Template data still present in homepage');
const validateBuild=process.argv.includes('--built');
if (validateBuild) {
 assert(existsSync('dist/index.html'),'dist/index.html is missing; run npm run build before checking generated metadata.');
 const built=readFileSync('dist/index.html','utf8');
 const ld=Array.from(built.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)).map(m=>JSON.parse(m[1]));
 const web=ld.flatMap(x=>x['@graph']||[x]).find(x=>x['@type']==='WebSite');
 assert(web,'WebSite structured data not generated');
 for (const n of names)assert(web.alternateName.includes(n),`Built JSON-LD missing ${n}`);
 assert(built.includes('Amani Blue Sky <span class="text-primary">Properties</span>'),'Built H1 out of sync');
 assert(built.includes('<link rel="canonical" href="https://amanibluesky.com/">'),'Wrong built canonical');
 assert(built.indexOf('About Amani Blue Sky Properties Agency') < built.indexOf('<!-- Search Start -->') || built.indexOf('About Amani Blue Sky Properties Agency') < built.indexOf('<!-- Property search'), 'Agency explanation is not in visible main content');
 const sitemap=readFileSync('dist/sitemap.xml','utf8');
 assert(sitemap.includes('https://amanibluesky.com/'),'Sitemap wrong domain');
 const robots=readFileSync('dist/robots.txt','utf8');
 assert(robots.includes('Sitemap: https://amanibluesky.com/sitemap.xml'),'Robots sitemap mismatch');
}
console.log(validateBuild ? 'PASS: Built HTML + JSON-LD brand variants, canonical, robots and sitemap.' : 'PASS: Source brand and visible homepage verified. Run npm run build, then npm run check:brand:built to verify generated pages.');
