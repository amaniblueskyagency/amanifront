// Image filtering is driven by the metadata/folders that actually exist.
// A missing bedroom (or any other category) must never hide an entire home.
const ROOM = new Map(Object.entries({
  'exterior':'Exterior','exteriors':'Exterior','outside':'Exterior',
  'bedroom':'Bedrooms','bedrooms':'Bedrooms','sleeping-areas':'Bedrooms',
  'bathroom':'Bathrooms','bathrooms':'Bathrooms','washroom':'Bathrooms','washrooms':'Bathrooms',
  'kitchen':'Kitchen','kitchens':'Kitchen','kitchenette':'Kitchen',
  'dining':'Dining','dinning':'Dining','dining-room':'Dining',
  'living-areas':'Living Areas','living-room':'Living Areas','living-rooms':'Living Areas',
  'sitting-room':'Living Areas','lounge':'Living Areas',
  'corridor':'Corridors','corridors':'Corridors','corridos':'Corridors','hallways':'Corridors','hallway':'Corridors',
  'balcony':'Balcony','balconies':'Balcony','terrace':'Terrace','rooftop':'Rooftop',
  'parking':'Parking','compound':'Compound','stairs':'Stairs','staircase':'Stairs',
  'amenities':'Amenities','facilities':'Amenities','garden':'Garden',
  'floorplan':'Floor Plan','floorplans':'Floor Plan','general':'General','gallery':'General',
  'studio':'Living Areas','studios':'Living Areas',
  'photos':'General','other':'General'
}));

const PRIORITY = ["Exterior", "Living Areas", "Dining", "Bedrooms", "Kitchen", "Bathrooms", "Balcony", "Corridors", "Stairs", "Parking", "Amenities", "Floor Plan", "General"];
const slug = value => String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
function unitName(raw) {
  const s = slug(raw);
  if (s === 'studio' || s === 'studios') return 'Studio';
  if (/^(bedsitter|bedsitters|bed-sitter|bed-sitters)$/.test(s)) return 'Bedsitter';
  if (/^(shop|shops|retail)$/.test(s)) return 'Shop';
  const m = s.match(/^([1-9])(?:br|bedroom|bedrooms|-br|-bedroom|-bedrooms)$/);
  return m ? `${m[1]}BR` : '';
}
function categoryName(raw) {
  const s = slug(raw);
  if (!s) return '';
  return ROOM.get(s) || (unitName(s) ? '' : s.split('-').map(x => x.charAt(0).toUpperCase() + x.slice(1)).join(' '));
}
export function describePhoto(photo) {
  const path = String(photo?.src || photo?.file_path || '').replaceAll('\\','/');
  const segments = path.split('/').slice(0,-1).map(slug).filter(Boolean);
  const start = segments.findIndex(x => /^property-\d{3,}$/.test(x));
  const branches = start === -1 ? [] : segments.slice(start + 1);
  const unitType = unitName(photo?.unit_type) || branches.map(unitName).find(Boolean) || '';
  // Prefer declared metadata, then the most specific known room branch.
  // Never assume a category from a filename or from missing rooms.
  const explicit = photo?.room_category ? categoryName(photo.room_category) : '';
  const known = [...branches].reverse().map(x => ROOM.get(x) || '').find(Boolean) || '';
  const unknown = [...branches].reverse().find(x => !ROOM.has(x) && !unitName(x));
  const branch = known || (unknown ? categoryName(unknown) : '');
  return { unitType, category: explicit || branch || 'General' };
}
export function availableCategories(items, unitType='') {
  const unique = [...new Set(items.filter(x=>x.unitType===unitType).map(x=>x.category).filter(Boolean))];
  return unique.sort((a,b) => {
    const ia=PRIORITY.indexOf(a),ib=PRIORITY.indexOf(b);
    return (ia<0?999:ia)-(ib<0?999:ib) || a.localeCompare(b);
  });
}
