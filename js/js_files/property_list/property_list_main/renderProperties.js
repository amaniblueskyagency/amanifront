// js/js_files/property_list/property_list_main/renderProperties.js

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPrice(value, display = "") {
  if (display && String(display).trim()) return display;

  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Price on request";

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatArea(value) {
  const area = Number(value || 0);
  if (!Number.isFinite(area) || area <= 0) return "N/A";
  return `${area.toLocaleString()} Sqft`;
}


function getAvailabilityLine(property = {}) {
  const summary = property.availability_summary || {};
  const units = Array.isArray(property.units) ? property.units : [];

  const availableNow = Number(summary.available_now ?? units.filter(unit => unit.is_available_now).length);
  const comingSoon = Number(summary.coming_soon ?? units.filter(unit => unit.is_coming_soon).length);
  const nextDate =
    summary.next_available_from ||
    units
      .filter(unit => unit.is_coming_soon && unit.public_available_from)
      .map(unit => unit.public_available_from)
      .sort((a, b) => new Date(a) - new Date(b))[0] ||
    "";

  if (availableNow > 0) {
    return `${availableNow} unit${availableNow === 1 ? "" : "s"} available`;
  }

  if (comingSoon > 0 && nextDate) {
    return `Available from ${formatDate(nextDate)}`;
  }

  if (units.length > 0 || Number(summary.total_units || 0) > 0) {
    return "Fully occupied";
  }

  return "";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getPropertyLink(property) {
  const id = String(property?.id || '');
  if (/^amani-p\d{3,}$/.test(id)) return `/properties/${encodeURIComponent(id)}/`;
  if (property.slug) return `properties.html?slug=${encodeURIComponent(property.slug)}`;
  if (id) return `properties.html?id=${encodeURIComponent(id)}`;
  return '/property-list/';
}

function propertyCard(property, delay = "0.1s") {
  const availabilityLine = getAvailabilityLine(property);

  return `
    <div class="col-lg-4 col-md-6 wow fadeInUp" data-wow-delay="${delay}">
      <div class="property-item rounded overflow-hidden h-100">
        <div class="position-relative overflow-hidden">
          <a href="${getPropertyLink(property)}">
            <img class="img-fluid w-100" src="${escapeHtml(property.image)}" alt="${escapeHtml(property.title)}">
          </a>
          <div class="bg-primary rounded text-white position-absolute start-0 top-0 m-4 py-1 px-3">
            ${escapeHtml(property.listing_mode)}
          </div>
          <div class="bg-white rounded-top text-primary position-absolute start-0 bottom-0 mx-4 pt-1 px-3">
            ${escapeHtml(property.category_name || property.type_name)}
          </div>
        </div>
        <div class="p-4 pb-0">
          <h5 class="text-primary mb-3">${escapeHtml(formatPrice(property.price, property.price_display))}</h5>
          <a class="d-block h5 mb-2" href="${getPropertyLink(property)}">${escapeHtml(property.title)}</a>
          <p>
            <i class="fa fa-map-marker-alt text-primary me-2"></i>
            ${escapeHtml(property.location_name)}
          </p>
          ${availabilityLine ? `<div class="small text-primary fw-semibold mb-3"><i class="fa fa-home me-1"></i>${escapeHtml(availabilityLine)}</div>` : ""}
        </div>
        <div class="d-flex border-top">
          <small class="flex-fill text-center border-end py-2">
            <i class="fa fa-ruler-combined text-primary me-2"></i>${escapeHtml(formatArea(property.area))}
          </small>
          <small class="flex-fill text-center border-end py-2">
            <i class="fa fa-bed text-primary me-2"></i>${Number(property.bedrooms)>0?`${escapeHtml(property.bedrooms)} Bed`:'Beds not listed'}
          </small>
          <small class="flex-fill text-center py-2">
            <i class="fa fa-bath text-primary me-2"></i>${Number(property.bathrooms)>0?`${escapeHtml(property.bathrooms)} Bath`:'Baths not listed'}
          </small>
        </div>
      </div>
    </div>
  `;
}

function emptyState(message) {
  return `
    <div class="col-12">
      <div class="alert alert-light border">${escapeHtml(message)}</div>
    </div>
  `;
}

function groupByType(properties, types) {
  const grouped = new Map();

  for (const type of types) {
    grouped.set(String(type.id), []);
  }

  for (const property of properties) {
    const keys = Array.isArray(property.resolved_category_ids) && property.resolved_category_ids.length
      ? property.resolved_category_ids.map(String)
      : [String(property.category_id || property.type_id || "")];

    for (const key of keys) {
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(property);
    }
  }

  return grouped;
}

function renderTabPane(tabId, properties, active = false) {
  const inner = properties.length
    ? properties.map((item, index) => propertyCard(item, `${0.1 + (index % 3) * 0.2}s`)).join("")
    : emptyState("No properties found.");

  return `
    <div id="${tabId}" class="tab-pane fade show p-0 ${active ? "active" : ""}">
      <div class="row g-4">
        ${inner}
      </div>
    </div>
  `;
}

export function renderPropertyListSearchSection({ rootId, types, locations }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  root.innerHTML = `
    <div class="container-fluid bg-primary mb-5 wow fadeIn" data-wow-delay="0.1s" style="padding: 35px;">
      <div class="container">
        <div class="row g-2">
          <div class="col-md-10">
            <div class="row g-2">
              <div class="col-md-4">
                <input id="property-list-keyword" type="text" class="form-control border-0 py-3" placeholder="Search Keyword">
              </div>
              <div class="col-md-4">
                <select id="property-list-type-filter" class="form-select border-0 py-3">
                  <option value="">Property Type</option>
                  ${types.map(type => `<option value="${escapeHtml(type.id)}">${escapeHtml(type.name)}</option>`).join("")}
                </select>
              </div>
              <div class="col-md-4">
                <select id="property-list-location-filter" class="form-select border-0 py-3">
                  <option value="">Location</option>
                  ${locations.map(location => `<option value="${escapeHtml(location.id)}">${escapeHtml(location.name)}</option>`).join("")}
                </select>
              </div>
            </div>
          </div>
          <div class="col-md-2">
            <button id="property-list-search-btn" class="btn btn-dark border-0 w-100 py-3">Search</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderDynamicPropertyListSection({ rootId, properties, types, activeTypeId = "" }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const normalizedActiveTypeId = String(activeTypeId || "").trim();
  const grouped = groupByType(properties, types);
  const hasActiveType = normalizedActiveTypeId && types.some(type => String(type.id) === normalizedActiveTypeId);

  const tabs = [
    `
      <li class="nav-item me-2">
        <a class="btn btn-outline-primary ${hasActiveType ? "" : "active"}" data-bs-toggle="pill" href="#tab-all">All</a>
      </li>
    `,
    ...types.map(type => `
      <li class="nav-item me-2">
        <a class="btn btn-outline-primary ${String(type.id) === normalizedActiveTypeId ? "active" : ""}" data-bs-toggle="pill" href="#tab-${escapeHtml(type.id)}">${escapeHtml(type.name)}</a>
      </li>
    `)
  ].join("");

  const panes = [
    renderTabPane("tab-all", properties, !hasActiveType),
    ...types.map(type => renderTabPane(`tab-${type.id}`, grouped.get(String(type.id)) || [], String(type.id) === normalizedActiveTypeId))
  ].join("");

  const availableCount = properties.filter(property => {
    const summary = property.availability_summary || {};
    const units = Array.isArray(property.units) ? property.units : [];
    return Number(summary.available_now ?? units.filter(unit => unit.is_available_now).length) > 0;
  }).length;

  const locationCount = new Set(
    properties.map(property => String(property.location_id || property.location_name || "").trim()).filter(Boolean)
  ).size;

  root.innerHTML = `
    <section class="amani-listing">
      <div class="amani-listing-shell">
        <div class="amani-listing-top">
          <div class="amani-listing-intro wow slideInLeft" data-wow-delay="0.1s">
            <span class="amani-listing-kicker">Find your next property</span>
            <h1>Property Listing</h1>
            <p>Browse our current properties and narrow the results by property type.</p>
          </div>

          <aside class="amani-listing-overview wow slideInRight" data-wow-delay="0.1s" aria-label="Property listing overview">
            <div class="amani-listing-overview-head">
              <span>Portfolio overview</span>
              <i class="fa fa-building" aria-hidden="true"></i>
            </div>
            <div class="amani-listing-metrics">
              <div><strong>${properties.length}</strong><span>Properties</span></div>
              <div><strong>${availableCount}</strong><span>Available now</span></div>
              <div><strong>${locationCount}</strong><span>Locations</span></div>
            </div>
          </aside>
        </div>

        <div class="amani-listing-filterbar">
          <span class="amani-listing-filter-label">Property type</span>
          <ul class="nav nav-pills amani-listing-tabs">
            ${tabs}
          </ul>
        </div>

        <div class="tab-content amani-listing-results">
          ${panes}
        </div>
      </div>
    </section>
  `;
}

function filterProperties(properties, keyword, typeId, locationId) {
  const key = String(keyword || "").trim().toLowerCase();
  const type = String(typeId || "").trim();
  const location = String(locationId || "").trim();

  return properties.filter((property) => {
    const keywordMatch = !key || [
      property.title,
      property.description,
      property.category_name,
      property.location_name
    ].join(" ").toLowerCase().includes(key);

    const typeMatch =
      !type ||
      String(property.category_id || "") === type ||
      (Array.isArray(property.resolved_category_ids) && property.resolved_category_ids.map(String).includes(type));

    const locationMatch = !location || String(property.location_id) === location;

    return keywordMatch && typeMatch && locationMatch;
  });
}

export function bindPropertyListPageEvents({
  properties,
  types,
  searchRootId,
  listRootId,
  initialTypeId = ""
}) {
  const searchRoot = document.getElementById(searchRootId);
  if (!searchRoot) return;

  const keywordEl = searchRoot.querySelector("#property-list-keyword");
  const typeEl = searchRoot.querySelector("#property-list-type-filter");
  const locationEl = searchRoot.querySelector("#property-list-location-filter");
  const searchBtn = searchRoot.querySelector("#property-list-search-btn");

  if (typeEl && initialTypeId) {
    typeEl.value = String(initialTypeId);
  }

  const rerender = () => {
    const selectedTypeId = typeEl?.value || "";
    const filtered = filterProperties(
      properties,
      keywordEl?.value || "",
      selectedTypeId,
      locationEl?.value || ""
    );

    renderDynamicPropertyListSection({
      rootId: listRootId,
      properties: filtered,
      types,
      activeTypeId: selectedTypeId
    });
  };

  // Homepage links use /property-list/?q=...; apply the search automatically.
  const initialKeyword = new URLSearchParams(window.location.search).get('q');
  if (keywordEl && initialKeyword) { keywordEl.value = initialKeyword.slice(0,120); rerender(); }
  if (searchBtn) searchBtn.addEventListener("click", rerender);
  if (typeEl) typeEl.addEventListener("change", rerender);
  if (locationEl) locationEl.addEventListener("change", rerender);

  if (keywordEl) {
    keywordEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") rerender();
    });
  }
}