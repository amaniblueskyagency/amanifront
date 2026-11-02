// js/js_files/property_type/renderPropertyType.js

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCategoryLink(category) {
  const slug = category?.slug ? encodeURIComponent(category.slug) : "";
  return slug ? `/property-list/?category=${slug}` : "/property-list/";
}

function renderCategoryCard(category, delay = "0.1s") {
  const countText = `${Number(category.property_count || 0).toLocaleString()} Properties`;

  return `
    <div class="col-lg-3 col-sm-6 wow fadeInUp" data-wow-delay="${delay}">
      <a class="cat-item d-block bg-light text-center rounded p-3" href="${getCategoryLink(category)}">
        <div class="rounded p-4">
          <div class="icon mb-3">
            <img class="img-fluid" src="${escapeHtml(category.image)}" alt="${escapeHtml(category.title)}">
          </div>
          <h6>${escapeHtml(category.title)}</h6>
          <span>${escapeHtml(countText)}</span>
        </div>
      </a>
    </div>
  `;
}

function renderEmptyState(message) {
  return `
    <div class="col-12">
      <div class="alert alert-light border mb-0">${escapeHtml(message)}</div>
    </div>
  `;
}

export function renderPropertyTypeSearchSection({ rootId, categories, locations }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const categoryOptions = [
    `<option value="">Property Type</option>`,
    ...categories.map((category) => `
      <option value="${escapeHtml(category.id)}">${escapeHtml(category.title)}</option>
    `)
  ].join("");

  const locationOptions = [
    `<option value="">Location</option>`,
    ...locations.map((location) => `
      <option value="${escapeHtml(location.id)}">${escapeHtml(location.name)}</option>
    `)
  ].join("");

  root.innerHTML = `
    <div class="container-fluid bg-primary mb-5 wow fadeIn" data-wow-delay="0.1s" style="padding: 35px;">
      <div class="container">
        <div class="row g-2">
          <div class="col-md-10">
            <div class="row g-2">
              <div class="col-md-4">
                <input id="property-type-keyword" type="text" class="form-control border-0 py-3" placeholder="Search Keyword">
              </div>
              <div class="col-md-4">
                <select id="property-type-filter" class="form-select border-0 py-3">
                  ${categoryOptions}
                </select>
              </div>
              <div class="col-md-4">
                <select id="property-type-location-filter" class="form-select border-0 py-3">
                  ${locationOptions}
                </select>
              </div>
            </div>
          </div>
          <div class="col-md-2">
            <button id="property-type-search-btn" class="btn btn-dark border-0 w-100 py-3">Search</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderPropertyTypeSection({ rootId, categories }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const cards = categories.length
    ? categories.map((category, index) => renderCategoryCard(category, `${0.1 + (index % 4) * 0.2}s`)).join("")
    : renderEmptyState("No property types found.");

  root.innerHTML = `
    <section class="amani-property-types">
      <div class="container-xxl">
        <div class="container">
          <div class="amani-property-types-heading text-center mx-auto wow fadeInUp" data-wow-delay="0.1s">
            <span class="amani-property-types-kicker">Explore by category</span>
            <h1>Property Types</h1>
            <p>Find the right space for your needs, from homes and apartments to offices, event spaces and other available property categories.</p>
          </div>
          <div class="row g-4 amani-property-types-grid">
            ${cards}
          </div>
        </div>
      </div>
    </section>
  `;
}

function filterCategories(categories, properties, filters) {
  const keyword = String(filters.keyword || "").trim().toLowerCase();
  const categoryId = String(filters.categoryId || "").trim();
  const locationId = String(filters.locationId || "").trim();

  const propertiesInLocation = !locationId
    ? properties
    : properties.filter((property) => String(property.location_id || "") === locationId);

  return categories
    .map((category) => {
      const categoryKeyCandidates = new Set([
        String(category.id ?? ""),
        String(category.legacy_id ?? ""),
        String(category.slug ?? "")
      ]);

      const propertyCount = propertiesInLocation.filter((property) => {
        const ids = Array.isArray(property.category_ids) ? property.category_ids.map(v => String(v)) : [];
        for (const key of categoryKeyCandidates) {
          if (key && ids.includes(key)) return true;
        }
        return false;
      }).length;

      return {
        ...category,
        property_count: propertyCount
      };
    })
    .filter((category) => {
      const keywordMatch =
        !keyword ||
        String(category.title || "").toLowerCase().includes(keyword);

      const categoryMatch =
        !categoryId ||
        String(category.id || "") === categoryId;

      const countMatch =
        !locationId || Number(category.property_count || 0) > 0;

      return keywordMatch && categoryMatch && countMatch;
    });
}

export function bindPropertyTypePageEvents({
  categories,
  properties,
  searchRootId,
  sectionRootId
}) {
  const searchRoot = document.getElementById(searchRootId);
  if (!searchRoot) return;

  const keywordEl = searchRoot.querySelector("#property-type-keyword");
  const categoryEl = searchRoot.querySelector("#property-type-filter");
  const locationEl = searchRoot.querySelector("#property-type-location-filter");
  const searchBtn = searchRoot.querySelector("#property-type-search-btn");

  const rerender = () => {
    const filtered = filterCategories(categories, properties, {
      keyword: keywordEl?.value || "",
      categoryId: categoryEl?.value || "",
      locationId: locationEl?.value || ""
    });

    renderPropertyTypeSection({
      rootId: sectionRootId,
      categories: filtered
    });
  };

  if (searchBtn) searchBtn.addEventListener("click", rerender);
  if (categoryEl) categoryEl.addEventListener("change", rerender);
  if (locationEl) locationEl.addEventListener("change", rerender);

  if (keywordEl) {
    keywordEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") rerender();
    });
  }
}