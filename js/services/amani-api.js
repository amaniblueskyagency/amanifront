// Amani public data service.
// Browser data access is intentionally routed through amani-backend only.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const SITE_API_BASE = window.__AMANI_SITE_API_BASE__ ||
  (LOCAL_HOSTS.has(window.location.hostname)
    ? `${window.location.protocol}//${window.location.hostname}:4000/api/site`
    : '/api/site');

function normalizeImagePath(path, propertyId = '') {
  if (!path) return '';
  const raw = String(path).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/') || raw.startsWith('img/')) return raw;
  return propertyId ? `img/rental/${propertyId}/${raw}` : `img/${raw}`;
}

async function fetchSiteApi(path, options = {}) {
  let response;
  try {
    response = await fetch(`${SITE_API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
  } catch (cause) {
    const error = new Error(`Amani backend is unreachable at ${SITE_API_BASE}. Start D:\\amani-backend first.`);
    error.cause = cause;
    throw error;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Amani API request failed with status ${response.status}`);
  }
  return payload?.data ?? payload;
}

function flattenLocations(nodes = [], output = []) {
  for (const node of Array.isArray(nodes) ? nodes : []) {
    const { children = [], ...item } = node || {};
    output.push(item);
    flattenLocations(children, output);
  }
  return output;
}


// Frontend folder catalog is authoritative for numbered properties. It is built
// automatically from actual folders during local serving or Netlify deployment.
// Reading it on the website removes the requirement to redeploy Render for photos.
let publishedGalleryRequest = null;
let publishedGalleryReadAt = 0;
async function getPublishedGalleryIndex() {
  if (!publishedGalleryRequest || Date.now() - publishedGalleryReadAt > 3000) {
    publishedGalleryReadAt = Date.now();
    publishedGalleryRequest = fetch('/property_gallery_published.json', {cache: 'no-store'})
      .then(response => { if (!response.ok) throw new Error(`Gallery catalog HTTP ${response.status}`); return response.json(); })
      .catch(error => { console.warn('Gallery catalog unavailable:', error.message); return null; });
  }
  return publishedGalleryRequest;
}
function folderPhotosForWeb(property, catalog) {
  const id = String(property?.id || '');
  const match = id.match(/^amani-p(\d{3,})$/i);
  if (!match) return null; // Preserve existing behavior for non-numbered properties.
  const entry = catalog?.properties?.[id];
  if (!entry || entry.folder !== `property-${match[1]}`) return [];
  // Do not match photo ownership using a property name: admins may rename it.
  // An explicitly unverified folder stays unpublished until its photos are confirmed.
  if (entry.gallery_verified === false) return [];
  const prefix = `img/rental/${entry.folder}/`;
  return (Array.isArray(entry.photos) ? entry.photos : [])
    .filter(photo => typeof photo?.src === 'string' && photo.src.startsWith(prefix) &&
      /\.(?:jpe?g|png|webp|avif|gif)$/i.test(photo.src) &&
      !photo.src.includes('..') && !photo.src.includes('\\') && !/[?#]/.test(photo.src))
    .map((photo, index) => ({
      src: photo.src, file: photo.src, file_path: photo.src,
      alt: `${property.title} — ${photo.category || 'General'}`,
      category: photo.category || 'General',
      unit_type: photo.unit_type || '',
      metadata_json: {room_category: photo.category || 'General', unit_type: photo.unit_type || ''},
      is_primary: index === 0
    }));
}
async function publicGalleryFor(property) {
  const catalog = await getPublishedGalleryIndex();
  // If the catalog cannot be loaded, fail closed for managed folders rather
  // than silently display superseded Supabase images under General.
  return folderPhotosForWeb(property, catalog);
}
function withPublishedGallery(property, pictures) {
  if (pictures === null) return property;
  return {...property, thumbnail: pictures[0]?.src || '', image: pictures[0]?.src || '',
    images: pictures.map(p=>p.src), gallery: pictures.map(p=>({...p}))};
}
function normalizeProperty(property = {}) {
  const gallery = Array.isArray(property.gallery)
    ? property.gallery.map(item => ({
        ...item,
        file: normalizeImagePath(item?.file || item?.src, property.id)
      }))
    : [];
  const thumbnail = normalizeImagePath(property.thumbnail || property.image, property.id) || gallery[0]?.file || '';
  return { ...property, thumbnail, image: thumbnail, gallery };
}

function normalizeUnit(unit = {}) {
  return {
    ...unit,
    id: unit.id || unit.unit_id,
    unit_id: unit.unit_id || unit.id,
    unit_name: unit.unit_name || unit.unit_code || unit.unit_title || 'Unit',
    thumbnail: normalizeImagePath(unit.thumbnail, unit.property_id)
  };
}

export async function fetchPropertyCategories() {
  return fetchSiteApi('/property-categories');
}

export async function fetchLocations() {
  const tree = await fetchSiteApi('/locations/tree');
  return flattenLocations(tree);
}

export async function fetchAgents() {
  const agents = await fetchSiteApi('/agents');
  return (agents || []).map(agent => ({
    ...agent,
    phone: agent.contact?.phone || agent.contact_json?.phone || '',
    whatsapp: agent.contact?.whatsapp || agent.contact_json?.whatsapp || '',
    email: agent.contact?.email || agent.contact_json?.email || ''
  }));
}

export async function fetchPropertyTabs() {
  return fetchSiteApi('/property-tabs');
}

export async function fetchProperties() {
  const properties = await fetchSiteApi('/properties-with-availability');
  const catalog = await getPublishedGalleryIndex();
  return (properties || []).map(property => ({
    ...withPublishedGallery(normalizeProperty(property), folderPhotosForWeb(property, catalog)),
    units: (property.units || []).map(normalizeUnit)
  }));
}

export async function fetchPropertyUnits(slugOrId) {
  const value = encodeURIComponent(String(slugOrId || '').trim());
  if (!value) return { property: null, units: [], availability_summary: { total_units: 0 } };
  const data = await fetchSiteApi(`/properties/${value}/units`);
  return { ...data, units: (data.units || []).map(normalizeUnit) };
}

export async function fetchPropertyAvailability(slugOrId) {
  const value = encodeURIComponent(String(slugOrId || '').trim());
  if (!value) return { total_units: 0 };
  return fetchSiteApi(`/properties/${value}/availability`);
}

export async function fetchPropertyHead(slugOrId) {
  const value = encodeURIComponent(String(slugOrId || '').trim());
  if (!value) return null;
  const data = await fetchSiteApi(`/properties/${value}/head`);
  const property = {id:data.property_id || data.property?.id, title:data.title || data.property?.title || ''};
  const gallery = await publicGalleryFor(property);
  return {
    ...data,
    carousel_images: gallery === null
      ? (data.carousel_images || []).map(path => normalizeImagePath(path, data.property_id))
      : gallery.map(photo=>photo.src)
  };
}

export async function fetchPropertyDetails(slugOrId) {
  const value = encodeURIComponent(String(slugOrId || '').trim());
  if (!value) return null;
  const data = await fetchSiteApi(`/properties/${value}/details`);
  const folderPhotos = await publicGalleryFor(data.property || {});
  return {
    ...data,
    property: withPublishedGallery(normalizeProperty(data.property || {}), folderPhotos),
    units: (data.units || []).map(normalizeUnit),
    gallery: folderPhotos === null
      ? (data.gallery || []).map(item => ({...item,
          src: normalizeImagePath(item?.src || item?.file, data.property?.id)}))
      : folderPhotos
  };
}

export async function fetchNavigation() {
  return fetchSiteApi('/navigation');
}

export async function fetchFooter() {
  return fetchSiteApi('/footer');
}

export async function submitPropertyVisitRequest(payload) {
  return fetchSiteApi('/book-visit', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function submitPropertyListingEnquiry(payload) {
  return fetchSiteApi('/listing-enquiries', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function submitContactMessage(payload) {
  return fetchSiteApi('/contact-messages', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

