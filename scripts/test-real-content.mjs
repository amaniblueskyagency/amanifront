import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const htmls=readdirSync('.').filter(f=>f.endsWith('.html')); 
assert.equal(htmls.length,10,'Expected ten public source HTML pages');
const sample=/Client Name|<small>Profession<\/small>|Property Type [123]|Location [123]|lorem ipsum|John Doe|Jane Doe|#1 Place To Find|Certified Agent|img\/testimonial-[123]\.jpg/i;
for(const f of htmls){
  const s=readFileSync(f,'utf8');
  assert(!sample.test(s),`${f} contains demonstration material`);
  for(const tag of ['<title>','rel="canonical"','name="description"','rel="icon"','rel="manifest"'])assert(s.includes(tag),`${f} is missing ${tag}`);
}
for(const f of ['js/js_files/testimonial/testimonial.js','js/js_files/testimonial/renderTestimonial.js','js/js_files/about/home_agents.js','js/js_files/about/about.js','js/js_files/property_agent/property_agent.js','js/js_files/footer/footer.js']){
  const s=readFileSync(f,'utf8');assert(!sample.test(s),`${f} contains demo content`);
}
const home=readFileSync('index.html','utf8');
assert(home.includes('action="/property-list/" method="get"'),'Home search does not submit a query');
assert(!home.includes('id="homepage-testimonials-section"'),'Unverified homepage reviews still shown');
assert(home.includes('img/rental/property-007/exterior/'),'Source home hero does not use an actual property-folder photo');
assert(!readFileSync('js/js_files/testimonial/testimonial.js','utf8').includes('fallbackTexts'),'Fabricated testimonials still generated');
console.log(`PASS: ${htmls.length} public HTML pages and all testimonial/team renderers audited for fictional content and SEO head tags.`);
