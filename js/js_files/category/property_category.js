import {
  fetchPropertyCategories,
  fetchProperties
} from "../../services/amani-api.js";

export async function renderPropertyCategory() {
  const container = document.getElementById("property-category-section");
  if (!container) {
    console.warn("⚠️ property-category-section not found");
    return;
  }

  try {
    const [categoryRows, propertyRows] = await Promise.all([
      fetchPropertyCategories(),
      fetchProperties()
    ]);

    const categories = Array.isArray(categoryRows) ? categoryRows : [];
    const properties = Array.isArray(propertyRows) ? propertyRows : [];

    const categoryCounts = buildCategoryCounts(categories, properties);

    const data = {
      title: "Property Types",
      subtitle: "Browse available property categories.",
      items: categories.map((row, i) => ({
        id: row.id || "",
        slug: row.slug || "",
        legacyId: row.legacy_id || "",
        title: row.title || "",
        subtitle: row.title || "",
        icon: row.icon || "img/icon-apartment.png",
        count: categoryCounts[row.id] ?? 0,
        link: buildCategoryListLink(row),
        delay: row.delay || `0.${i + 1}s`
      }))
    };

    const headerHTML = `
      <div class="text-center mx-auto mb-5 wow fadeInUp" data-wow-delay="0.1s" style="max-width: 600px;">
        <span class="section-eyebrow">Browse by space</span>
        <h1 class="mb-3">${escapeHtml(data.title)}</h1>
        <p>${escapeHtml(data.subtitle)}</p>
      </div>
    `;

    const itemsHTML = data.items.map((it, i) => `
      <div class="col-lg-3 col-sm-6 wow fadeInUp" data-wow-delay="${it.delay || `0.${i + 1}s`}">
        <a class="cat-item d-block bg-light text-center rounded p-3" href="${escapeAttr(it.link)}">
          <div class="rounded p-4">
            <div class="icon mb-3">
              <img class="img-fluid" src="${escapeAttr(it.icon)}" alt="${escapeAttr(it.title)} Icon">
            </div>
            <h6>${escapeHtml(it.title)}</h6>
            <span>${escapeHtml(String(it.count))} Properties</span>
          </div>
        </a>
      </div>
    `).join("");

    const finalHTML = `
      <!-- Category Start (rendered by property_category.js) -->
      <div class="container-xxl py-5">
        <div class="container">
          ${headerHTML}
          <div class="row g-4">
            ${itemsHTML}
          </div>
        </div>
      </div>
      <!-- Category End -->
    `;

    container.innerHTML = finalHTML;

    if (window.AOS) AOS.refresh();
    if (window.wow && typeof window.wow === "function") {
      try { new WOW().init(); } catch (e) {}
    }
  } catch (err) {
    console.error("❌ Error loading Property Category:", err);
    container.innerHTML = `<p class="text-center text-muted">Error loading property categories.</p>`;
  }
}

function buildCategoryCounts(categories, properties) {
  const counts = {};
  const categoryById = new Map();
  const categoryByLegacyId = new Map();
  const categoryBySlug = new Map();
  const categoryByTitle = new Map();

  (categories || []).forEach(cat => {
    counts[cat.id] = 0;

    if (cat.id) categoryById.set(String(cat.id), cat);
    if (cat.legacy_id) categoryByLegacyId.set(String(cat.legacy_id), cat);
    if (cat.slug) categoryBySlug.set(normalize(cat.slug), cat);
    if (cat.title) categoryByTitle.set(normalize(cat.title), cat);
  });

  (properties || []).forEach(prop => {
    const matchedCategories = resolvePropertyCategories(prop, {
      categoryById,
      categoryByLegacyId,
      categoryBySlug,
      categoryByTitle
    });

    matchedCategories.forEach(cat => {
      if (cat?.id) counts[cat.id] = (counts[cat.id] || 0) + 1;
    });
  });

  return counts;
}

function resolvePropertyCategories(prop, lookup) {
  const found = new Map();

  const tryAdd = (value) => {
    if (!value && value !== 0) return;

    if (typeof value === "object") {
      const objMatch =
        lookup.categoryById.get(String(value.id || "")) ||
        lookup.categoryByLegacyId.get(String(value.legacy_id || "")) ||
        lookup.categoryBySlug.get(normalize(value.slug || "")) ||
        lookup.categoryByTitle.get(normalize(value.title || value.name || ""));
      if (objMatch?.id) found.set(objMatch.id, objMatch);
      return;
    }

    const raw = String(value);
    const match =
      lookup.categoryById.get(raw) ||
      lookup.categoryByLegacyId.get(raw) ||
      lookup.categoryBySlug.get(normalize(raw)) ||
      lookup.categoryByTitle.get(normalize(raw));

    if (match?.id) found.set(match.id, match);
  };

  if (Array.isArray(prop?.property_categories)) {
    prop.property_categories.forEach(tryAdd);
  }

  if (Array.isArray(prop?.categories)) {
    prop.categories.forEach(tryAdd);
  }

  if (Array.isArray(prop?.category_ids)) {
    prop.category_ids.forEach(tryAdd);
  }

  tryAdd(prop?.category_id);
  tryAdd(prop?.category);
  tryAdd(prop?.category_slug);
  tryAdd(prop?.property_category);
  tryAdd(prop?.type);
  tryAdd(prop?.type_slug);
  tryAdd(prop?.property_type);
  tryAdd(prop?.property_type_title);

  return Array.from(found.values());
}

function buildCategoryListLink(category) {
  const value = category.slug || category.id || category.legacy_id || "";
  return `/property-list/?category=${encodeURIComponent(value)}`;
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