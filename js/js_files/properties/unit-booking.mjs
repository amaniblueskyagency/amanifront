// Use live public availability flags from the API; never assume a unit is vacant.
export function isBookableUnit(unit) {
  if (!unit) return false;
  return String(unit.status || '').trim().toLowerCase() === 'vacant' &&
    unit.is_available_now === true &&
    unit.available_for_public !== false &&
    unit.is_listed !== false &&
    unit.is_active !== false;
}

export function availableBookingUnits(units) {
  return (Array.isArray(units) ? units : []).filter(isBookableUnit);
}

export function bookingUnitType(unit) {
  const raw = String(unit?.unit_type || unit?.unit_category || '').toLowerCase();
  if (/studio/.test(raw)) return 'Studio';
  if (/bed\s*sitter|bedsitter/.test(raw)) return 'Bedsitter';
  if (/shop|commercial|retail/.test(raw)) return 'Shop';
  if (/small room|single room/.test(raw)) return 'Small Room';
  const match = raw.match(/([1-9])\s*(?:br|bedroom|bed room|bed)/);
  if (match) return `${match[1]}BR`;
  const n = Number(unit?.bedrooms);
  return Number.isInteger(n) && n > 0 ? `${n}BR` : 'Other';
}
