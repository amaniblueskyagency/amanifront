// Public property photography is strictly sourced from the numbered folders.
// Never merge DB legacy photos into a property that uses the folder registry.
const ID_PATTERN = /^amani-p(\d{3,})$/i;
const PHOTO_PATTERN = /\.(?:webp|png|jpe?g|avif|gif)$/i;
const NONE = Object.freeze([]);
const EMPTY_INDEX = { version: 5, properties: {} };
let pendingIndex;

export function photosForProperty(index, property) {
  const id = String(property?.id || '');
  const idMatch = id.match(ID_PATTERN);
  if (!idMatch) return null; // Non-numbered legacy properties remain compatible.
  const record = index?.version === 5 ? index.properties?.[id] : null;
  if (!record || record.folder !== `property-${idMatch[1]}`) return NONE;
  if (record.gallery_verified === false) return NONE; // independent identity hold, never title match
  const prefix = `img/rental/${record.folder}/`;
  return (Array.isArray(record.photos) ? record.photos : [])
    .filter(photo => typeof photo?.src === 'string' &&
      photo.src.startsWith(prefix) && PHOTO_PATTERN.test(photo.src) &&
      !photo.src.includes('..') && !photo.src.includes('\\') &&
      !photo.src.includes('?') && !photo.src.includes('#'))
    .map(photo => ({ src: photo.src, file: photo.src, alt: `${property.title} — ${photo.category || 'General'}`, room_category: photo.category || 'General', unit_type: photo.unit_type || '' }));
}

export function useFolderPhotos(property, index) {
  const photos = photosForProperty(index, property);
  if (photos === null) return property;
  const first = photos[0]?.src || '';
  // Remove ALL older image slots (including stock and previously uploaded paths).
  return { ...property, thumbnail: first, image: first, image_url: first,
    cover_image: first, images: photos.map(p => p.src),
    gallery: photos.map(({src,alt,room_category,unit_type}) => ({file:src,src,alt,room_category,unit_type})),
    gallery_source: 'numbered-property-folders' };
}

export function useFolderDetailGallery(payload, index) {
  if (!payload?.property) return payload;
  const photos = photosForProperty(index, payload.property);
  if (photos === null) return payload;
  return { ...payload, property: useFolderPhotos(payload.property, index), gallery: photos,
    // Legacy detail JSON remains intact in the DB but is not a public gallery source.
    gallery_source: 'numbered-property-folders' };
}

export function useFolderHeaderImages(header, index, property) {
  const photos = photosForProperty(index, property);
  return photos === null ? header : { ...header, gallery: [], thumbnail: '', image: '', cover_image: '', carousel_images: photos.slice(0,12).map(p=>p.src) };
}

export async function loadFolderPhotoIndex() {
  if (!pendingIndex) {
    pendingIndex = (async () => {
      try {
        // Relative to the HTML page, NOT /api/site or the JavaScript file.
        const url = new URL('./property_gallery_published.json', document.baseURI);
        const response = await fetch(url, { cache: 'no-store', headers: { Accept:'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data?.version !== 5 || typeof data.properties !== 'object' || Array.isArray(data.properties))
          throw new Error('Unexpected manifest format');
        return data;
      } catch (error) {
        console.error('Property photo index unavailable; legacy images will NOT be shown:', error);
        return EMPTY_INDEX;
      }
    })();
  }
  return pendingIndex;
}
