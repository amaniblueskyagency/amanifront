import {
  fetchProperties,
  fetchPropertyTabs,
  fetchPropertyCategories,
  fetchLocations
} from "../../services/amani-api.js";

const DETAIL_PAGE_URL = "/properties/";

function buildLocationsMap(rows) {
  const map = {};
  (rows || []).forEach(row => {
    map[row.legacy_id || row.id] = row.name;
    map[row.id] = row.name;
  });
  return map;
}

function buildCategoryLookup(categories) {
  return {
    byId: new Map((categories || []).filter(c => c?.id).map(c => [String(c.id), c])),
    byLegacyId: new Map((categories || []).filter(c => c?.legacy_id).map(c => [String(c.legacy_id), c])),
    bySlug: new Map((categories || []).filter(c => c?.slug).map(c => [normalize(c.slug), c])),
    byTitle: new Map((categories || []).filter(c => c?.title).map(c => [normalize(c.title), c]))
  };
}

function buildTypeLookup(types) {
  return {
    byId: new Map((types || []).filter(t => t?.id).map(t => [String(t.id), t])),
    byLegacyId: new Map((types || []).filter(t => t?.legacy_id).map(t => [String(t.legacy_id), t])),
    bySlug: new Map((types || []).filter(t => t?.slug).map(t => [normalize(t.slug), t])),
    byTitle: new Map((types || []).filter(t => t?.title).map(t => [normalize(t.title), t])),
    byCategorySlug: new Map((types || []).filter(t => t?.category_slug).map(t => [normalize(t.category_slug), t]))
  };
}

function resolvePropertyCategory(prop, lookup) {
  const candidates = [];

  if (Array.isArray(prop?.property_categories)) candidates.push(...prop.property_categories);
  if (Array.isArray(prop?.categories)) candidates.push(...prop.categories);
  if (Array.isArray(prop?.category_ids)) candidates.push(...prop.category_ids);

  candidates.push(
    prop?.category_id,
    prop?.category,
    prop?.category_slug,
    prop?.property_category,
    prop?.type,
    prop?.type_slug,
    prop?.property_type,
    prop?.property_type_title
  );

  for (const candidate of candidates) {
    const match = matchCategory(candidate, lookup);
    if (match) return match;
  }

  return null;
}

function matchCategory(candidate, lookup) {
  if (!candidate && candidate !== 0) return null;

  if (typeof candidate === "object") {
    return (
      lookup.byId.get(String(candidate.id || "")) ||
      lookup.byLegacyId.get(String(candidate.legacy_id || "")) ||
      lookup.bySlug.get(normalize(candidate.slug || "")) ||
      lookup.byTitle.get(normalize(candidate.title || candidate.name || "")) ||
      null
    );
  }

  const raw = String(candidate);

  return (
    lookup.byId.get(raw) ||
    lookup.byLegacyId.get(raw) ||
    lookup.bySlug.get(normalize(raw)) ||
    lookup.byTitle.get(normalize(raw)) ||
    null
  );
}

function getRouteFilters() {
  const params = new URLSearchParams(window.location.search);
  return {
    category: normalize(params.get("category") || ""),
    type: normalize(params.get("type") || "")
  };
}

function propertyMatchesCategory(prop, categoryLookup, filterValue) {
  if (!filterValue) return true;

  const matches = new Set();

  const addCandidate = (value) => {
    if (!value && value !== 0) return;

    if (typeof value === "object") {
      if (value.id) matches.add(normalize(value.id));
      if (value.legacy_id) matches.add(normalize(value.legacy_id));
      if (value.slug) matches.add(normalize(value.slug));
      if (value.title) matches.add(normalize(value.title));
      if (value.name) matches.add(normalize(value.name));
      return;
    }

    const raw = String(value);
    matches.add(normalize(raw));

    const found =
      categoryLookup.byId.get(raw) ||
      categoryLookup.byLegacyId.get(raw) ||
      categoryLookup.bySlug.get(normalize(raw)) ||
      categoryLookup.byTitle.get(normalize(raw));

    if (found) {
      if (found.id) matches.add(normalize(found.id));
      if (found.legacy_id) matches.add(normalize(found.legacy_id));
      if (found.slug) matches.add(normalize(found.slug));
      if (found.title) matches.add(normalize(found.title));
    }
  };

  if (Array.isArray(prop?.property_categories)) prop.property_categories.forEach(addCandidate);
  if (Array.isArray(prop?.categories)) prop.categories.forEach(addCandidate);
  if (Array.isArray(prop?.category_ids)) prop.category_ids.forEach(addCandidate);

  addCandidate(prop?.category_id);
  addCandidate(prop?.category);
  addCandidate(prop?.category_slug);
  addCandidate(prop?.property_category);

  return matches.has(filterValue);
}

function filterPropertiesForRoute(properties, categoryLookup, _typeLookup, routeFilters) {
  return (properties || []).filter(prop => {
    const categoryPass = propertyMatchesCategory(prop, categoryLookup, routeFilters.category);
    return categoryPass;
  });
}

function buildPropertyLink(prop, unit = null) {
  // Immutable property IDs anchor the URL; mutable names/slugs never own photos or links.
  const id = String(prop?.id || '');
  if (/^amani-p\d{3,}$/.test(id)) {
    const unitId = unit?.unit_id || unit?.id;
    return `/properties/${encodeURIComponent(id)}/${unitId ? `?unit=${encodeURIComponent(unitId)}` : ''}`;
  }
  const params = new URLSearchParams();
  if (prop?.slug) params.set('slug', prop.slug);
  else if (id) params.set('id', id);
  return `properties.html?${params}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getUnits(prop) {
  return Array.isArray(prop.units) ? prop.units : [];
}

function getAvailableUnits(prop) {
  return getUnits(prop).filter(unit => unit.is_available_now);
}

function getComingSoonUnits(prop) {
  return getUnits(prop).filter(unit => unit.is_coming_soon);
}

function getPrimaryBookableUnit(prop) {
  return getAvailableUnits(prop)[0] || getComingSoonUnits(prop)[0] || getUnits(prop)[0] || null;
}

function renderAvailabilityBlock(prop) {
  const summary = prop.availability_summary || {};
  const units = getUnits(prop);
  const availableUnits = getAvailableUnits(prop);
  const comingSoonUnits = getComingSoonUnits(prop);

  if (!units.length) {
    return `
      <div class="small text-muted mt-2">
        <i class="fa fa-info-circle text-primary me-1"></i>
        Unit availability will be confirmed by the agent.
      </div>
    `;
  }

  if (availableUnits.length) {
    return `
      <div class="mt-2">
        <span class="badge bg-success">${availableUnits.length} unit${availableUnits.length === 1 ? "" : "s"} available now</span>
      </div>
    `;
  }

  if (comingSoonUnits.length) {
    const date = summary.next_available_from || comingSoonUnits[0].public_available_from;
    return `
      <div class="mt-2">
        <span class="badge bg-warning text-dark">Available from ${escapeHtml(formatDate(date))}</span>
      </div>
    `;
  }

  return `
    <div class="mt-2">
      <span class="badge bg-secondary">Currently occupied</span>
    </div>
  `;
}

function renderUnitPreview(prop) {
  const units = getUnits(prop);
  if (!units.length) return "";

  const visibleUnits = units.slice(0, 3);

  return `
    <div class="px-4 pb-3">
      <div class="border rounded p-2 bg-light">
        <div class="fw-bold small mb-1">Units</div>
        ${visibleUnits.map(unit => `
          <div class="d-flex justify-content-between small border-top py-1">
            <span>${escapeHtml(unit.unit_code || unit.unit_name || "Unit")}</span>
            <span class="${unit.is_available_now ? "text-success" : unit.is_coming_soon ? "text-warning" : "text-muted"}">
              ${unit.is_available_now ? "Available" : unit.is_coming_soon ? `From ${escapeHtml(formatDate(unit.public_available_from))}` : "Occupied"}
            </span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

export async function renderPropertyList() {
  const container =
    document.getElementById("property-list-section") ||
    document.querySelector(".container-xxl.py-5");

  if (!container) return;

  try {
    const [tabs, categories, properties, locationRows] = await Promise.all([
      fetchPropertyTabs(),
      fetchPropertyCategories(),
      fetchProperties(),
      fetchLocations()
    ]);

    const locationsMap = buildLocationsMap(locationRows);
    const categoryLookup = buildCategoryLookup(categories || []);
    const typeLookup = buildTypeLookup([]);
    const routeFilters = getRouteFilters();

    const routedProperties = filterPropertiesForRoute(
      properties || [],
      categoryLookup,
      typeLookup,
      routeFilters
    );

    const safeTabs =
      tabs?.length
        ? tabs.map(tab => ({
            id: tab.tab_dom_id || tab.source_tab_id || tab.id,
            title: tab.title || "",
            active: !!tab.is_active
          }))
        : [
            { id: "tab-1", title: "Featured", active: true },
            { id: "tab-2", title: "For Sale", active: false },
            { id: "tab-3", title: "For Rent", active: false }
          ];

    const isFilteredView = !!(routeFilters.category || routeFilters.type);

    const headerHTML = `
      <div class="text-center mx-auto mb-5 wow fadeInUp" data-wow-delay="0.1s" style="max-width: 600px;">
        <h1 class="mb-3">Property Listing</h1>
        <p>Browse properties with live unit availability.</p>
      </div>

      <div class="tab-class text-center">
        <ul class="nav nav-pills d-inline-flex justify-content-center mb-5">
          ${safeTabs.map(tab => `
            <li class="nav-item me-2">
              <a class="btn btn-outline-primary ${tab.active ? "active" : ""}" data-bs-toggle="pill" href="#${escapeAttr(tab.id)}">
                ${escapeHtml(tab.title)}
              </a>
            </li>
          `).join("")}
        </ul>
      </div>
    `;

    const panesHTML = safeTabs.map(tab => {
      const tabProps = routedProperties.filter(p => {
        if (isFilteredView) return true;
        if (tab.id === "tab-1") return !!p.featured;
        if (/sale/i.test(tab.title || "")) return /sale/i.test(p.status || "") || /sale/i.test(p.badge_top || "");
        if (/rent/i.test(tab.title || "")) return /rent/i.test(p.status || "") || /rent/i.test(p.badge_top || "");
        return true;
      });

      const isActive = tab.active ? "show p-0 active" : "fade show p-0";

      const propsHTML = tabProps.map((prop, idx) => {
        const categoryItem = resolvePropertyCategory(prop, categoryLookup);
        const categoryLabel = categoryItem?.title || "";
        const imageSrc = (prop.gallery && prop.gallery[0]?.file) || prop.thumbnail || "";
        const locationLabel = prop.locations?.name || locationsMap[prop.location_id] || "";
        const beds = prop.stats?.bedrooms || "";
        const baths = prop.stats?.bathrooms_text || "";
        const area = prop.stats?.sqft_text || "";
        const badgeText =
          prop.badge_top ||
          (prop.status?.toLowerCase().includes("sale")
            ? "On Sale"
            : "For Rent");

        const bookableUnit = getPrimaryBookableUnit(prop);
        const detailLink = buildPropertyLink(prop);
        const bookingLink = buildPropertyLink(prop, bookableUnit);

        return `
          <div class="col-lg-4 col-md-6 wow fadeInUp" data-wow-delay="0.${idx + 1}s">
            <div class="property-item rounded overflow-hidden h-100 amani-status-property-card">
              <div class="position-relative overflow-hidden">
                <a href="${escapeAttr(detailLink)}">
                  <img class="img-fluid" src="${escapeAttr(imageSrc)}" alt="${escapeAttr(prop.title || "")}">
                </a>
                <div class="bg-primary rounded text-white position-absolute start-0 top-0 m-4 py-1 px-3">
                  ${escapeHtml(badgeText)}
                </div>
                <div class="bg-white rounded-top text-primary position-absolute start-0 bottom-0 mx-4 pt-1 px-3">
                  ${escapeHtml(categoryLabel)}
                </div>
              </div>

              <div class="p-4 pb-2">
                <h5 class="text-primary mb-3">${escapeHtml(prop.price_display || "")}</h5>
                <a class="d-block h5 mb-2" href="${escapeAttr(detailLink)}">
                  ${escapeHtml(prop.title || "")}
                </a>
                <p>
                  <i class="fa fa-map-marker-alt text-primary me-2"></i>
                  ${escapeHtml(locationLabel)}
                </p>
                ${renderAvailabilityBlock(prop)}
              </div>

              ${renderUnitPreview(prop)}

              <div class="d-flex border-top">
                <small class="flex-fill text-center border-end py-2">
                  <i class="fa fa-ruler-combined text-primary me-2"></i>
                  ${escapeHtml(area)}
                </small>
                <small class="flex-fill text-center border-end py-2">
                  <i class="fa fa-bed text-primary me-2"></i>
                  ${escapeHtml(beds)}
                </small>
                <small class="flex-fill text-center py-2">
                  <i class="fa fa-bath text-primary me-2"></i>
                  ${escapeHtml(baths)}
                </small>
              </div>

              <div class="p-3 border-top">
                <a class="btn btn-primary w-100" href="${escapeAttr(bookingLink)}">
                  View ${bookableUnit ? escapeHtml(bookableUnit.unit_code || "Selected Unit") : "Property"}
                </a>
              </div>
            </div>
          </div>`;
      }).join("");

      return `
        <div id="${escapeAttr(tab.id)}" class="tab-pane ${isActive}">
          <div class="row g-4 amani-status-property-grid">
            ${propsHTML || `<div class="col-12 text-center"><p class="text-muted mb-0">No properties found for this selection.</p></div>`}
            <div class="col-12 text-center" data-wow-delay="0.1s">
              <a class="btn btn-primary py-3 px-5" href="/property-list/">Browse More Property</a>
            </div>
          </div>
        </div>`;
    }).join("");

    container.innerHTML = `
      <div class="container-xxl py-5">
        <div class="container">
          ${headerHTML}
          <div class="tab-content">${panesHTML}</div>
        </div>
      </div>
    `;

    if (window.AOS) AOS.refresh();
    if (window.wow && typeof window.wow === "function") {
      try { new WOW().init(); } catch (e) {}
    }
  } catch (err) {
    console.error("Error loading Property List:", err);
    container.innerHTML = `<p class="text-center text-muted">Error loading property listings.</p>`;
  }
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', "&quot;");
}