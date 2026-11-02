// js/js_files/property_type/property_type.js

import {
  fetchPropertyCategories,
  fetchProperties,
  fetchLocations
} from "../../services/amani-api.js";

import {
  renderPropertyTypeSearchSection,
  renderPropertyTypeSection,
  bindPropertyTypePageEvents
} from "./renderPropertyType.js";

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildMap(items, key = "id") {
  const map = new Map();
  for (const item of normalizeArray(items)) {
    if (item && item[key] != null) {
      map.set(String(item[key]), item);
    }
  }
  return map;
}

function resolveCategoryTitle(category) {
  return category?.title || category?.name || "Property";
}

function resolveCategorySlug(category) {
  return category?.slug || category?.legacy_id || category?.id || "";
}

function resolveCategoryImage(category) {
  return (
    category?.image ||
    category?.icon ||
    category?.icon_path ||
    category?.image_path ||
    "img/icon-apartment.png"
  );
}

function normalizeCategory(category, properties) {
  const categoryKeyCandidates = new Set([
    String(category?.id ?? ""),
    String(category?.legacy_id ?? ""),
    String(category?.slug ?? "")
  ]);

  const count = properties.filter((property) => {
    const ids = Array.isArray(property.category_ids) ? property.category_ids.map(v => String(v)) : [];
    for (const key of categoryKeyCandidates) {
      if (key && ids.includes(key)) return true;
    }
    return false;
  }).length;

  return {
    ...category,
    id: category.id,
    title: resolveCategoryTitle(category),
    slug: resolveCategorySlug(category),
    image: resolveCategoryImage(category),
    property_count: count
  };
}

function normalizeLocationMap(locations) {
  return buildMap(locations, "id");
}

function normalizeProperty(property, locationMap) {
  const location = locationMap.get(String(property.location_id || "")) || property.locations || null;

  return {
    ...property,
    location_id: property.location_id || location?.id || "",
    location_name: location?.name || property.location || property.location_name || "Location not specified",
    category_ids: Array.isArray(property.category_ids) ? property.category_ids.map(v => String(v)) : []
  };
}

export async function initPropertyTypePage() {
  const searchRoot = document.getElementById("property-type-search-section");
  const sectionRoot = document.getElementById("property-type-section");

  if (!sectionRoot) return;

  try {
    const [categoriesRaw, propertiesRaw, locationsRaw] = await Promise.all([
      fetchPropertyCategories(),
      fetchProperties(),
      fetchLocations()
    ]);

    const locationMap = normalizeLocationMap(locationsRaw);

    const properties = normalizeArray(propertiesRaw).map((item) =>
      normalizeProperty(item, locationMap)
    );

    const categories = normalizeArray(categoriesRaw)
      .map((item) => normalizeCategory(item, properties))
      .sort((a, b) => String(a.title).localeCompare(String(b.title)));

    const locations = normalizeArray(locationsRaw)
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    renderPropertyTypeSearchSection({
      rootId: "property-type-search-section",
      categories,
      locations
    });

    renderPropertyTypeSection({
      rootId: "property-type-section",
      categories
    });

    bindPropertyTypePageEvents({
      categories,
      properties,
      locations,
      searchRootId: "property-type-search-section",
      sectionRootId: "property-type-section"
    });
  } catch (err) {
    console.error("❌ initPropertyTypePage error:", err);

    sectionRoot.innerHTML = `
      <div class="container-xxl py-5">
        <div class="container">
          <div class="alert alert-danger mb-0">
            Failed to load property types from the database.
          </div>
        </div>
      </div>
    `;
  }
}