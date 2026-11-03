/**
 * Amani static Netlify build: verified folder galleries + crawlable, ID-stable
 * property detail pages. No API credentials are exposed or committed here.
 * Production MUST use the live public Render endpoint so admin-renamed titles
 * are reflected in generated HTML when the site is redeployed.
 */
import {cp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {readdirSync, existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
// Do not allow sample content to return in any public HTML or review renderer.
await import('./test-real-content.mjs');

const root=resolve('.');
const out=resolve('dist');
const originRaw=process.env.SITE_URL||process.env.URL||'';
if (!originRaw) throw Error('SITE_URL is required: set the final public HTTPS website origin in Netlify.');
let origin;
try {origin=new URL(originRaw);} catch {throw Error('SITE_URL must be a valid HTTPS origin.');}
if (origin.protocol!=='https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname!=='/' || origin.port)
  throw Error('SITE_URL must be an HTTPS ORIGIN only, e.g. https://your-domain.example (no /path, port or query).');
const site=origin.origin;
const production=process.env.CONTEXT==='production' || process.env.AMANI_REQUIRE_LIVE_SEO==='1';
if(production && !process.env.SITE_URL) throw Error('Production requires SITE_URL set to the chosen primary custom domain; do not rely on Netlify URL fallback for canonical URLs.');
if(production && /(^|\.)example\.(?:com|org|net)$/.test(origin.hostname))throw Error('Production SITE_URL cannot use the example.com placeholder. Configure the real primary domain.');
const backend=String(process.env.AMANI_BACKEND_ORIGIN||'').replace(/\/+$/,'');
const escapeHtml=(value)=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const textOnly=(v)=>typeof v==='string' ? v.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim() : '';
const concise=(s,max=165)=>s.length>max ? s.slice(0,max-1).replace(/\s+\S*$/,'')+'…':s;
const canonical=(route)=>`${site}${route}`;
const toJSON=(obj)=>JSON.stringify(obj).replace(/</g,'\\u003c');
const brand='Amani Blue Sky Properties';
// User-confirmed brand-search variants. These are identity hints, not keyword-stuffed pages.
const brandAlternates=[
  "Amani Blue Sky Properties Agency",
  "Amani Blue Sky Agency",
  "Amani Blue Sky Property Agency",
  "Amani Blue Sky Property",
  "Amani Properties Agency",
  "Amani Property Agency",
  "Amani Properties",
  "Amani Blue Sky",
  "Amani Bluesky",
  "Amani Bluesky Agency",
  "Amani BlueSky Properties",
  "AmaniBlueSkyProperties",
  "AmaniBlueSkyPropertiesAgency",
  "AmaniBlueSkyAgency",
  "Blue Sky Properties",
  "Blue Sky Agency",
  "Blue Sky Property Agency",
  "Blue Sky Property",
  "amanibluesky.com"
];
// Public routes: all canonical pages are generated at build time; no hand-edited sitemap.
const rentalCategories={
  apartments:{label:'Apartments for Rent',single:'apartment',description:'Compare apartments and residential rental units in the areas served by Amani Blue Sky Properties.'},
  studios:{label:'Studio Apartments for Rent',single:'studio',description:'Explore studio apartments and compact rental homes with Amani Blue Sky Properties.'},
  bedsitters:{label:'Bedsitters for Rent',single:'bedsitter',description:'Find bedsitter rental options and check unit availability with Amani Blue Sky Properties.'},
  shops:{label:'Shops and Commercial Units for Rent',single:'shop',description:'Browse shop and commercial rental units with Amani Blue Sky Properties.'},
  houses:{label:'Houses for Rent',single:'house',description:'Explore residential houses for rent with Amani Blue Sky Properties.'}
};
const cleanArray=v=>Array.isArray(v)?v:[];
function publicUnitKinds(property){
  // Unit classifications must come from actual public listings. Property
  // marketing names (e.g. "Abby House") do not establish unit types.
  const units=cleanArray(property.units);
  const labels=units.flatMap(u=>[u.unit_type,u.unit_category,u.usage_type,u.unit_title].map(textOnly)).filter(Boolean);
  const stated=[property.type_name,property.property_type_title,property.category_name,property.property_category,property.type]
    .map(textOnly).filter(Boolean);
  const unitTypes=cleanArray(property.unit_types).map(textOnly).filter(Boolean);
  const authored=textOnly(property.description||'');
  const descriptionParts=cleanArray(property.description_json).map(textOnly).filter(Boolean);
  // Only classify property types explicitly stated in the live property data.
  const words=[...labels,...unitTypes,...stated,authored,...descriptionParts].join(' ').toLowerCase();
  const kinds=new Set();
  if(/\bstudios?\b|\bstudio\s+apartments?\b/.test(words))kinds.add('studios');
  if(/\bbedsitters?\b|\bbed[-\s]?sitters?\b|\bsingle\s+rooms?\b/.test(words))kinds.add('bedsitters');
  if(/\bshops?\b|\bcommercial\b|\bretail\b|\bstalls?\b/.test(words))kinds.add('shops');
  if(/\bapartments?\b|\bflats?\b|\b[1-9]\s*(?:br|bedrooms?|beds?)\b|\bone[-\s]bedroom\b|\btwo[-\s]bedroom\b|\bthree[-\s]bedroom\b/.test(words) ||
     units.some(u=>Number(u.bedrooms)>0))kinds.add('apartments');
  if(/\b(?:detached\s+)?houses?\b|\bmaisonettes?\b|\bvillas?\b/.test(words))kinds.add('houses');
  return kinds;
}
function unitFacts(property){
  const units=cleanArray(property.units);
  // Only publicly listed units passed through the backend API. No vacancy
  // promise is ever derived from the existence of a public unit record.
  const types=[...new Set(units.map(u=>textOnly(u.unit_type||u.unit_category||u.unit_title)).filter(Boolean))].slice(0,8);
  const rents=units.map(u=>Number(u.rent_amount)).filter(v=>Number.isFinite(v)&&v>0&&v<100000000).sort((a,b)=>a-b);
  const prices=rents.length?{minimum:rents[0],maximum:rents[rents.length-1]}:null;
  return {types,prices};
}
const currency=v=>`KES ${Math.round(v).toLocaleString('en-US')}`;
function factualPropertySummary(property,location){
  const title=textOnly(property.title)||String(property.id||'Property');
  const {types,prices}=unitFacts(property);
  const excerpts=Array.isArray(property.description_json)
    ?property.description_json.filter(x=>typeof x==='string').map(textOnly).filter(Boolean):[];
  const authored=textOnly(property.description)||excerpts.join(' ')||textOnly(property.notes);
  const facts=[];
  if(types.length)facts.push(`Publicly listed unit types: ${types.join(', ')}.`);
  if(prices)facts.push(prices.minimum===prices.maximum
    ?`Listed monthly rent: ${currency(prices.minimum)}.`
    :`Listed monthly rents range from ${currency(prices.minimum)} to ${currency(prices.maximum)}.`);
  const intro=`${title}${location?` is listed in ${location}`:' is listed for rent'}.`;
  return {title,authored,facts,intro,types,prices};
}
function propertyKinds(property){return publicUnitKinds(property);}


function meta({title,description,route,type='website',image='',noindex=false,structured=null}){
  const url=canonical(route);
  const lines=[
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    ...(noindex?['<meta name="robots" content="noindex,follow">']:['<meta name="robots" content="index,follow,max-image-preview:large">']),
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="${brand}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    ...(image?[`<meta property="og:image" content="${escapeHtml(image)}">`, `<meta name="twitter:image" content="${escapeHtml(image)}">`]:[]),
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta property="og:locale" content="en_KE">',
    '<meta name="theme-color" content="#1455ba">',
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    '<link rel="icon" type="image/png" href="/favicon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    ...(structured?[`<script type="application/ld+json">${toJSON(structured)}</script>`]:[])
  ];
  return lines.join('\n    ');
}
function rewriteHead(html,metadata){
  // Strip old and source-authored SEO tags before writing the build's authoritative
  // canonical/metadata. This prevents duplicate canonicals or stale social tags.
  return html.replace(/<head>([\s\S]*?)<\/head>/i,(_,existing)=>{
    let h=existing;
    h=h.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi,'');
    h=h.replace(/<meta\b[^>]*>/gi,tag=>{
      const name=(tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1]||'').toLowerCase();
      const prop=(tag.match(/\bproperty\s*=\s*["']([^"']+)["']/i)?.[1]||'').toLowerCase();
      return ['description','keywords','robots','theme-color','twitter:card','twitter:title','twitter:description','twitter:image'].includes(name)||prop.startsWith('og:')?'':tag;
    });
    h=h.replace(/<link\b[^>]*>/gi,tag=>{
      const rel=(tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1]||'').toLowerCase();
      return ['canonical','icon','shortcut icon','apple-touch-icon','manifest'].includes(rel)?'':tag;
    });
    h=h.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'');
    return `<head>${h}\n    ${metadata}\n</head>`;
  });
}
function organizationSchema(){return {
  '@context':'https://schema.org',
  '@graph':[
    {'@type':'WebSite','@id':`${site}/#website`,name:brand,alternateName:brandAlternates,url:`${site}/`,inLanguage:'en-KE',publisher:{'@id':`${site}/#organization`}},
    {'@type':'Organization','@id':`${site}/#organization`,name:brand,alternateName:brandAlternates,url:`${site}/`,logo:`${site}/favicon.png`,description:'Amani Blue Sky Properties Agency lists rental properties and viewing enquiries in Thika and Juja, Kenya.',areaServed:[{'@type':'Place',name:'Thika, Kenya'},{'@type':'Place',name:'Juja, Kenya'}]}
  ]
};}
const staticRoutes={
 'index.html':["/","Amani Blue Sky Properties Agency | Rentals in Thika & Juja","Amani Blue Sky Properties Agency, also known as Amani Blue Sky Agency, helps you find rental houses, apartments, studios and bedsitters in Thika and Juja."],
 'about.html':["/about/","About Amani Blue Sky Properties | Real Estate Agency in Kenya","Learn about Amani Blue Sky Properties Agency, property management and rental services in Thika, Juja and nearby areas."],
 'contact.html':["/contact/","Contact Amani Blue Sky Agency | Rental & Property Enquiries","Contact Amani Blue Sky Properties about rental houses, apartment viewings and property services in Thika and Juja."],
 'property-list.html':["/property-list/","Houses & Apartments for Rent in Thika & Juja | Amani Blue Sky Properties","Explore houses, apartments, studios and bedsitters for rent in Thika, Juja and surrounding areas. Check available units and request a visit."],
 'property-type.html':["/property-type/","Property Types & Rental Homes | Amani Blue Sky Properties","Compare rental apartments, bedsitters, studio rooms, houses and shops offered by Amani Blue Sky Properties Agency."],
 'property-agent.html':["/property-agent/","Real Estate Team | Amani Blue Sky Properties Agency","Meet the Amani Blue Sky Agency property team and discover how to enquire about a rental or viewing."],
 'testimonial.html':["/testimonial/","Property Enquiries | Amani Blue Sky Properties","How to browse Amani rental properties and request an appointment or viewing."],
 'properties.html':["/property-list/","Property Details | Amani Blue Sky Properties","Browse rental property details and available units through Amani Blue Sky Properties."],
 'property.html':["/property-list/","Property Details | Amani Blue Sky Properties","Explore rental property details and unit availability with Amani Blue Sky Properties."],
 '404.html':["/404.html","Page Not Found | Amani Blue Sky Properties","The Amani Blue Sky Properties page you requested could not be found."],
};
// The local registry provides *only a preview fallback*; never publish stale
// identity/availability from it in production. The API supplies live names.
async function getProperties(){
  if(backend){
    const timeout=AbortSignal.timeout(110000);
    try {
      const response=await fetch(`${backend}/api/site/properties-with-availability`,{signal:timeout,headers:{accept:'application/json'}});
      if(!response.ok) throw Error(`HTTP ${response.status}`);
      const result=await response.json();
      if(result.success===false || !Array.isArray(result.data)) throw Error('Unexpected API property response');
      console.log(`[SEO] Fetched ${result.data.length} live properties for prerendering.`);
      return result.data;
    } catch(error){if(production) throw Error(`Production SEO generation refused stale property data: ${error.message}`); console.warn(`[SEO] Live API unavailable: ${error.message}. Using preview labels only.`);}
  } else if(production){throw Error('Production requires AMANI_BACKEND_ORIGIN to fetch current property titles and locations.');}
  const registry=JSON.parse(await readFile(resolve(root,'property_gallery_registry.json'),'utf8'));
  console.warn('[SEO] PREVIEW ONLY: property labels from local registry; not guaranteed current Supabase titles.');
  return Object.entries(registry).map(([num,item])=>({id:item.db_id||`amani-p${num}`,title:item.label||`Property ${num}`,status:'for_rent'}));
}
// Avoid opening/stale imagery: use the same generated gallery manifest as web UI.
await import('./auto-gallery.mjs');
const galleryIndex=JSON.parse(await readFile(resolve(root,'property_gallery_published.json'),'utf8'));
const properties=await getProperties();
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
// Explicit allowlist: never inadvertently deploy .env, Git, private SQL or source scripts.
for(const name of ['css','js','img','lib','ama','favicon.png','property_gallery_published.json','property_gallery_manifest.json','site.webmanifest']){
  if(existsSync(resolve(root,name))) await cp(resolve(root,name),resolve(out,name),{recursive:true});
}
// These are leftover stock/demo template portraits, testimonials and generic
// property hero images. None are Amani property-folder photos and none are
// published: only actual catalog photographs may represent rental properties.
for(const name of [
  'about.jpg','call-to-action.jpg','carousel-1.jpg','carousel-2.jpg','header.jpg',
  'property-1.jpg','property-2.jpg','property-3.jpg','property-4.jpg','property-5.jpg','property-6.jpg',
  'team-1.jpg','team-2.jpg','team-3.jpg','team-4.jpg',
  'testimonial-1.jpg','testimonial-2.jpg','testimonial-3.jpg','testimonial-4.jpg'
]){
  await rm(resolve(out,'img',name),{force:true});
}
// Public is inspectable in source control. Copy files exactly as Netlify expects;
// later build-generated sitemap/robots/redirects replace the source baselines.
if(existsSync(resolve(root,'public')))await cp(resolve(root,'public'),out,{recursive:true});
const catalogLinks=properties.filter(p=>/^amani-p\d{3,}$/.test(String(p?.id||''))).map(p=>{
  const id=String(p.id);
  const label=textOnly(p.title)||id;
  const area=textOnly(p.location_name || p.location?.name || p.locations?.name || '');
  const info=unitFacts(p);
  const unitText=info.types.length?` — ${escapeHtml(info.types.join(', '))}`:'';
  const rentText=info.prices?` — monthly rents ${escapeHtml(info.prices.minimum===info.prices.maximum?currency(info.prices.minimum):`${currency(info.prices.minimum)} to ${currency(info.prices.maximum)}`)}`:'';
  return `<li><a href="/properties/${encodeURIComponent(id)}/">${escapeHtml(label)}</a>${area?` — ${escapeHtml(area)}`:''}${unitText}${rentText}</li>`;
}).join('');
const homeBrandIntro=`<section class="container py-4" aria-label="Amani Blue Sky property agency information"><h2>About Amani Blue Sky Properties Agency</h2><p>Amani Blue Sky Properties is also known as Amani Blue Sky Agency and Amani Properties Agency. We publish rental property listings with photos, locations and unit enquiries in Thika, Juja and the other areas shown on individual property pages. Our official website is amanibluesky.com; this page identifies the Amani agency independently of similarly named property businesses.</p><p><a href="/property-list/">Browse real rental properties</a> · <a href="/rentals/">Explore rental types</a> · <a href="/about/">About the agency</a> · <a href="/contact/">Contact Amani</a></p></section>`;
const listingFallback=`<section class="container py-5" aria-label="Explore properties"><p><a href="/rentals/">Browse rental categories</a></p><h2>Find apartments, studios and bedsitters in Kenya</h2><p>Explore Amani Blue Sky Properties listings and check available units before booking a visit.</p><ul>${catalogLinks}</ul></section>`;
for(const name of Object.keys(staticRoutes)){
  const full=resolve(root,name);if(!existsSync(full)) throw Error(`Missing required HTML file: ${name}`);
  const [route,title,description]=staticRoutes[name];
  const isNoIndex=name==='404.html'||name==='properties.html'||name==='property.html'||name==='testimonial.html';
  const structured=name==='index.html'?organizationSchema():(!isNoIndex?{'@context':'https://schema.org','@type':'WebPage','@id':canonical(route),url:canonical(route),name:title,description,isPartOf:{'@id':`${site}/#website`},about:{'@id':`${site}/#organization`}}:null);
  const homeImage=name==='index.html'&&existsSync(resolve(root,'img/rental/property-007/exterior/property-007-amazon-two-apartment-exterior-001.webp')) ? `${site}/img/rental/property-007/exterior/property-007-amazon-two-apartment-exterior-001.webp` : '';
  let html=rewriteHead(await readFile(full,'utf8'),meta({title,description,route,noindex:isNoIndex,structured,image:homeImage}));
  if(name==='properties.html'||name==='property.html') html=html.replace('<div id="property-details-container"></div>','<div id="property-details-container"><h1 class="visually-hidden">Property details</h1></div>');
  // These aren't fictional reviews or made-up agents: show concise factual
  // fallbacks for visitors and crawlers when API-dependent JS has not run yet.
  if(name==='about.html') {
    const areas=[...new Set(properties.map(p=>textOnly(p.location_name||p.location?.name||p.locations?.name||'')).filter(Boolean))];
    const text=`<section class="container-xxl py-5"><div class="container"><h2>About Amani Blue Sky Properties</h2><p>Amani Blue Sky Properties Agency lists rental properties with individual property pages, photographs, location information and unit enquiries. The published property portfolio includes ${properties.length} properties${areas.length?` in locations such as ${escapeHtml(areas.slice(0,6).join(', '))}`:''}.</p><p><a href="/property-list/">Browse actual property listings</a> · <a href="/contact/">Contact Amani</a></p></div></section>`;
    html=html.replace('<div id="about-main-section"></div>',`<div id="about-main-section">${text}</div>`);
  }
  if(name==='contact.html') {
    const text=`<section class="container-xxl py-5"><div class="container"><h2>Contact Amani Blue Sky Properties</h2><p>Ask about a named property in Thika, Juja or the areas shown in our rental listings. To request a visit, open the property and select an available unit.</p><p><a href="/property-list/">View property listings</a> · <a href="tel:+254797674649">Call Amani</a></p></div></section>`;
    html=html.replace('<div id="contact-main-section"></div>',`<div id="contact-main-section">${text}</div>`);
  }
  if(name==='property-agent.html') {
    const text=`<section class="container-xxl py-5"><div class="container"><h2>Property enquiries</h2><p>Contact Amani Blue Sky Properties to enquire about a published rental property or request a viewing.</p><p><a href="/contact/">Contact the property team</a> · <a href="/property-list/">Browse properties</a></p></div></section>`;
    html=html.replace('<div id="property-agent-section"></div>',`<div id="property-agent-section">${text}</div>`);
  }
  if(name==='testimonial.html') {
    const text=`<section class="container-xxl py-5"><div class="container"><h2>Rental enquiries and viewings</h2><p>Review a published Amani rental property, check its displayed unit availability and contact the property team about viewing arrangements.</p><p><a href="/property-list/">Find a property</a> · <a href="/contact/">Contact Amani</a></p></div></section>`;
    html=html.replace('<div id="testimonial-main-section"></div>',`<div id="testimonial-main-section">${text}</div>`);
  }
  if(name==='properties.html'||name==='property.html') {
    const text='<p class="container py-4">Choose a property from the <a href="/property-list/">current property listings</a> to view its details.</p>';
    html=html.replace('<div id="property-details-container"><h1 class="visually-hidden">Property details</h1></div>',`<div id="property-details-container"><h1 class="visually-hidden">Property details</h1>${text}</div>`);
  }
  if(name==='index.html'||name==='property-list.html') {
    // Each section is replaced by the original live JS renderer after page load.
    html=html.replace('<div id="property-list-section"></div>',`<div id="property-list-section">${listingFallback}</div>`);
  }
  if(name==='index.html') {
    // Visible and useful brand/rental context; deliberately not hidden keyword stuffing.
    if(!html.includes('<!-- Header End -->')) throw Error('Homepage header insertion point changed; brand intro must remain visible');
    html=html.replace('<!-- Header End -->',`<!-- Header End -->
${homeBrandIntro}`);
  }
  // Preserve original HTML for local/legacy use, and publish pretty-url /page/.
  await writeFile(resolve(out,name),html,'utf8');
  if(!['property.html','properties.html'].includes(name)&&route.endsWith('/')&&route!=='/'){
    const dest=resolve(out,route.slice(1),'index.html');await mkdir(resolve(out,route.slice(1)),{recursive:true});
    await writeFile(dest,html.replace('<head>','<head>\n    <base href="/">'),'utf8');
  }
}
const detailTemplate=await readFile(resolve(root,'properties.html'),'utf8');
const includedIds=new Set();const propertyRoutes=[];const propertyImages=new Map();const propertyUpdated=new Map();
for(const property of properties){
  const id=String(property.id||'');
  if(!/^amani-p\d{3,}$/.test(id)) continue;
  if(includedIds.has(id)) throw Error(`Duplicate property ID returned from API: ${id}`);
  includedIds.add(id);
  const route=`/properties/${id}/`;
  const titleText=textOnly(property.title)||`Property ${id}`;
  const location=textOnly(property.location_name || property.location?.name || property.locations?.name || '');
  const facts=factualPropertySummary(property,location);
  const factualDescription=facts.authored;
  const description=concise([facts.intro,factualDescription,...facts.facts].filter(Boolean).join(' '),165);
  const title=concise(`${titleText}${location?` — ${location}`:''} | Amani Blue Sky Properties`,95);
  const group=galleryIndex.properties?.[id];
  const num=id.slice('amani-p'.length);
  const photo=group?.folder===`property-${num}` && group.gallery_verified!==false && Array.isArray(group.photos)? group.photos.find(p=>typeof p.src==='string'&&p.src.startsWith(`img/rental/property-${num}/`)&&existsSync(resolve(root,p.src))):null;
  const image=photo?`${site}/${photo.src.split('/').map(encodeURIComponent).join('/')}`:'';
  if(image) propertyImages.set(route,image);
  const place={'@type':'Place',name:titleText,...(location?{description:location}:{})};
  const structured={'@context':'https://schema.org','@type':'WebPage','@id':canonical(route),url:canonical(route),name:title,description,isPartOf:{'@id':`${site}/#website`},about:place,breadcrumb:{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:`${site}/`},{'@type':'ListItem',position:2,name:'Properties',item:`${site}/property-list/`},{'@type':'ListItem',position:3,name:titleText,item:canonical(route)}]},...(image?{primaryImageOfPage:image}:{})};
  // Render genuine public property information in the HTML for visitors and
  // non-JavaScript crawlers. Live JS still controls unit vacancy and bookings.
  const factsList=facts.facts.length?`<ul>${facts.facts.map(f=>`<li>${escapeHtml(f)}</li>`).join('')}</ul>`:'';
  const summary=`<section class="container-xxl py-5" aria-label="Property overview"><div class="container"><p><a href="/property-list/">Browse properties</a></p><h1>${escapeHtml(titleText)}</h1>${location?`<p>${escapeHtml(location)}</p>`:''}<p>${escapeHtml(facts.intro)}</p>${facts.authored?`<p>${escapeHtml(facts.authored)}</p>`:''}${factsList}<p>Unit availability changes. View current listings or contact the property team to confirm a viewing.</p>${image?`<img src="${escapeHtml(image)}" alt="${escapeHtml(titleText)} property exterior or interior" loading="eager" style="max-width:100%;height:auto;max-height:500px;object-fit:contain">`:''}</div></section>`;
  let html=rewriteHead(detailTemplate,meta({title,description,route,image,structured}));
  html=html.replace('<head>','<head>\n    <base href="/">');
  html=html.replace('<div id="property-details-container"></div>',`<div id="property-details-container">${summary}</div>`);
  const dest=resolve(out,'properties',id,'index.html');await mkdir(resolve(out,'properties',id),{recursive:true});await writeFile(dest,html);
  const updatedDate=String(property.updated_at||'').slice(0,10);
  if(/^\d{4}-\d{2}-\d{2}$/.test(updatedDate) && !Number.isNaN(Date.parse(updatedDate)))propertyUpdated.set(route,updatedDate);
  propertyRoutes.push(route);
}
if(production && !propertyRoutes.length)throw Error('No publishable properties returned from live public API.');

// Truthful, crawlable category landing pages. Each category is based on actual
// public property/unit classifications, not guessed from marketing names.
const categoryRoutes=[];
const allCanonicalProperties=properties.filter(p=>includedIds.has(String(p.id)));
const categoryBuckets=new Map(Object.keys(rentalCategories).map(k=>[k,[]]));
for(const property of allCanonicalProperties){
  for(const kind of propertyKinds(property)) categoryBuckets.get(kind)?.push(property);
}
const categoryOverviewLinks=[];
for(const [key,category] of Object.entries(rentalCategories)){
  const matches=categoryBuckets.get(key)||[];
  if(!matches.length)continue;
  const route=`/rentals/${key}/`;
  const title=`${category.label} in Kenya | Amani Blue Sky Properties`;
  const areas=[...new Set(matches.map(p=>textOnly(p.location_name||p.location?.name||p.locations?.name||'')).filter(Boolean))].slice(0,5);
  const description=category.description;
  const factualArea=areas.length?`Property locations in this category include ${areas.join(', ')}.`:'';
  const items=matches.map(p=>{
    const id=String(p.id);const loc=textOnly(p.location_name||p.location?.name||p.locations?.name||'');
    return `<li><a href="/properties/${encodeURIComponent(id)}/">${escapeHtml(textOnly(p.title)||id)}</a>${loc?` — ${escapeHtml(loc)}`:''}</li>`;
  }).join('');
  const page=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${meta({title,description,route,structured:{'@context':'https://schema.org','@type':'CollectionPage',url:canonical(route),name:title,description,isPartOf:{'@type':'WebSite',name:brand,url:site}}})}<link rel="stylesheet" href="/css/bootstrap.min.css"><link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/custom_style.css"><link rel="stylesheet" href="/css/signature-design.css"></head><body><header class="container py-4"><a href="/" class="navbar-brand">Amani Blue Sky Properties</a><nav aria-label="Main navigation"><a href="/property-list/">All properties</a> · <a href="/property-type/">Property types</a> · <a href="/contact/">Contact</a></nav></header><main class="container py-5"><h1>${escapeHtml(category.label)}</h1><p>${escapeHtml(description)}</p>${factualArea?`<p>${escapeHtml(factualArea)}</p>`:''}<p>Available units change. Open a property to check its current status before requesting a viewing.</p><ul class="list-group">${items.replace(/<li>/g,'<li class="list-group-item">')}</ul><p class="mt-4"><a href="/property-list/">Browse all property listings</a></p></main></body></html>`;
  const dest=resolve(out,'rentals',key,'index.html');await mkdir(resolve(out,'rentals',key),{recursive:true});await writeFile(dest,page);
  categoryRoutes.push(route);
  categoryOverviewLinks.push(`<li><a href="${route}">${escapeHtml(category.label)}</a> (${matches.length} propert${matches.length===1?'y':'ies'})</li>`);
}
// A stable hub is useful even before categories are present, with a direct link
// to full listings. Never claim that an empty category has available units.
const rentalsRoute='/rentals/';
const hubTitle=`Find Rental Properties in Kenya | ${brand}`;
const hubDesc='Browse Amani Blue Sky Properties rentals by type. Compare apartments, studios, bedsitters, houses and shops where current property records support them.';
const hub=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${meta({title:hubTitle,description:hubDesc,route:rentalsRoute,structured:{'@context':'https://schema.org','@type':'CollectionPage',url:canonical(rentalsRoute),name:hubTitle}})}<link rel="stylesheet" href="/css/bootstrap.min.css"><link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/signature-design.css"></head><body><header class="container py-4"><a href="/">Amani Blue Sky Properties</a> · <a href="/property-list/">All property listings</a></header><main class="container py-5"><h1>Find rental properties</h1><p>${escapeHtml(hubDesc)}</p><ul>${categoryOverviewLinks.join('')}</ul><p><a href="/property-list/">Explore all properties and current availability</a></p></main></body></html>`;
await mkdir(resolve(out,'rentals'),{recursive:true});await writeFile(resolve(out,'rentals','index.html'),hub);
// The existing category UI remains unchanged; a crawlable type index helps
// non-JS search crawlers discover newly generated real category pages.
const categoryHtml=`<nav aria-label="Browse homes by type"><h2>Browse rental property types</h2><ul>${categoryOverviewLinks.join('')}</ul></nav>`;
for(const filename of ['property-type/index.html','property-type.html']){
  const target=resolve(out,filename);
  let html=await readFile(target,'utf8');
  html=html.replace('<div id="property-type-section"></div>',`<div id="property-type-section">${categoryHtml}</div>`);
  await writeFile(target,html);
}

const searchPages=Object.entries(staticRoutes).filter(([name])=>!['404.html','properties.html','property.html','testimonial.html'].includes(name)).map(([,v])=>v[0]);
const routes=[...searchPages,rentalsRoute,...categoryRoutes,...propertyRoutes];
await writeFile(resolve(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${routes.map(route=>`  <url><loc>${escapeHtml(canonical(route))}</loc>${propertyUpdated.has(route)?`<lastmod>${propertyUpdated.get(route)}</lastmod>`:''}${propertyImages.has(route)?`<image:image><image:loc>${escapeHtml(propertyImages.get(route))}</image:loc></image:image>`:''}</url>`).join('\n')}\n</urlset>\n`);
await writeFile(resolve(out,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /.netlify/\nSitemap: ${site}/sitemap.xml\n`);
// Netlify deploys dist/, not source root. Publish a physical _redirects file
// for legacy URLs (even if the old .html exists) and the same-origin API.
const redirects=[
 '# Generated by npm run build; do not edit dist/_redirects by hand.',
 '/api/site/*  /.netlify/functions/site-proxy/:splat  200',
 '/index.html  /  301!',
 ...Object.entries(staticRoutes).filter(([name])=>!['index.html','404.html','properties.html','property.html'].includes(name)).map(([name,[route]])=>`/${name}  ${route}  301!`),
 // Legacy detail templates must retain ?slug= or ?id= query data. Sending
 // them to /properties/ loses selection and that generic route doesn't exist.
 // Leave the legacy HTML operational but noindex; link new pages by ID.
];
await writeFile(resolve(out,'_redirects'),redirects.join('\n')+'\n');
await writeFile(resolve(out,'site.webmanifest'),JSON.stringify({name:brand,short_name:'Amani Blue Sky',start_url:'/',display:'standalone',theme_color:'#1455ba',background_color:'#ffffff',icons:[{src:'/favicon.png',sizes:'any',type:'image/png'}]},null,2));
console.log(`[SEO] Generated ${propertyRoutes.length} property pages, ${categoryRoutes.length} rental-category pages and ${routes.length} canonical sitemap URLs for ${site}`);
