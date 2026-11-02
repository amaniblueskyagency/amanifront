// js/js_files/property_list/property_list_main/property_list_main.js

import {
  fetchProperties,
  fetchPropertyCategories,
  fetchLocations
} from "../../../services/amani-api.js";
import {
  renderPropertyListSearchSection,
  renderDynamicPropertyListSection,
  bindPropertyListPageEvents
} from "./renderProperties.js";

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

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getRouteParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    category: normalize(params.get("category")),
    type: normalize(params.get("type"))
  };
}

function getListingMode(property) {
  const raw = String(
    property.listing_type ||
    property.purpose ||
    property.offer_type ||
    property.sale_rent ||
    property.status ||
    ""
  ).toLowerCase();

  if (raw.includes("rent") || raw.includes("lease")) return "For Rent";
  if (raw.includes("sell") || raw.includes("sale")) return "For Sell";
  return "Available";
}

function buildCategoryMatchers(category) {
  return [
    normalize(category.id),
    normalize(category.legacy_id),
    normalize(category.slug),
    normalize(category.title),
    normalize(category.name)
  ].filter(Boolean);
}

function resolvePropertyCategories(property, categories) {
  const rawValues = [];

  if (Array.isArray(property.category_ids)) rawValues.push(...property.category_ids);
  if (Array.isArray(property.categories)) rawValues.push(...property.categories);
  if (Array.isArray(property.property_categories)) rawValues.push(...property.property_categories);

  rawValues.push(
    property.category_id,
    property.category_slug,
    property.category,
    property.property_category
  );

  const found = new Map();

  for (const category of categories) {
    const matchers = buildCategoryMatchers(category);

    for (const rawValue of rawValues) {
      if (!rawValue && rawValue !== 0) continue;

      if (typeof rawValue === "object") {
        const objectValues = [
          normalize(rawValue.id),
          normalize(rawValue.legacy_id),
          normalize(rawValue.slug),
          normalize(rawValue.title),
          normalize(rawValue.name)
        ].filter(Boolean);

        if (objectValues.some(value => matchers.includes(value))) {
          found.set(String(category.id), category);
          break;
        }
      } else {
        const current = normalize(rawValue);
        if (matchers.includes(current)) {
          found.set(String(category.id), category);
          break;
        }
      }
    }
  }

  return Array.from(found.values());
}

function normalizeProperty(property, lookup) {
  const matchedCategories = resolvePropertyCategories(property, lookup.categoriesArray);
  const primaryCategory = matchedCategories[0] || null;

  const location =
    lookup.locations.get(String(property.location_id || "")) || null;

  return {
    ...property,
    id: property.id,
    slug: property.slug || property.id || "",
    title: property.title || property.name || "Untitled Property",
    description: property.description || property.summary || "",
    type_id: primaryCategory?.id || "",
    type_name: primaryCategory?.title || primaryCategory?.name || "Property",
    category_id: primaryCategory?.id || "",
    category_slug: primaryCategory?.slug || "",
    category_name: primaryCategory?.title || primaryCategory?.name || "Property",
    resolved_category_ids: matchedCategories.map(item => String(item.id)),
    location_id: property.location_id || "",
    location_name: location?.name || property.location || property.location_name || "Location not specified",
    image: property.thumbnail || property.image || property.image_url || property.cover_image || "img/photo-unavailable.svg",
    price: asNumber(property.price || property.amount || property.price_numeric || 0),
    price_display: property.price_display || property.formatted_price || "",
    bedrooms: asNumber(property.bedrooms || property.beds || property.bed || property.stats?.bedrooms || 0),
    bathrooms: asNumber(property.bathrooms || property.baths || property.bath || property.stats?.bathrooms_text || 0),
    area: asNumber(property.area || property.size || property.sqft || property.square_feet || property.stats?.sqft_text || 0),
    listing_mode: getListingMode(property),
    featured: Boolean(property.featured)
  };
}

function resolveRouteCategoryId(categories, route) {
  const routeValue = route.category || route.type;
  if (!routeValue) return "";

  const matched = categories.find(category =>
    buildCategoryMatchers(category).includes(routeValue)
  );

  return matched?.id ? String(matched.id) : "";
}

export async function initPropertyListPage() {
  const searchRoot = document.getElementById("property-list-search-section");
  const listRoot = document.getElementById("property-list-section");

  if (!listRoot) return;

  try {
    const [propertiesRaw, categoriesRaw, locationsRaw] = await Promise.all([
      fetchProperties(),
      fetchPropertyCategories(),
      fetchLocations()
    ]);

    const lookup = {
      categories: buildMap(categoriesRaw),
      categoriesArray: normalizeArray(categoriesRaw),
      locations: buildMap(locationsRaw)
    };

    const properties = normalizeArray(propertiesRaw).map((item) =>
      normalizeProperty(item, lookup)
    );

    // Keep the build-time property directory visible if the API temporarily
    // returns no listings. Replacing it with an empty JS view makes Google
    // see an otherwise valid page as an empty or error-like page (Soft 404).
    if (!properties.length && listRoot.querySelector('a[href^="/properties/"]')) {
      console.warn("Property API returned no listings; retaining the published property directory.");
      return;
    }

    const route = getRouteParams();

    const categories = normalizeArray(categoriesRaw)
      .map((item) => ({
        ...item,
        name: item.name || item.title || "Property"
      }))
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    const locations = normalizeArray(locationsRaw)
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    const initialActiveTypeId = resolveRouteCategoryId(categories, route);

    if (searchRoot) {
      renderPropertyListSearchSection({
        rootId: "property-list-search-section",
        types: categories,
        locations
      });
    }

    renderDynamicPropertyListSection({
      rootId: "property-list-section",
      properties,
      types: categories,
      activeTypeId: initialActiveTypeId
    });

    bindPropertyListPageEvents({
      properties,
      types: categories,
      searchRootId: "property-list-search-section",
      listRootId: "property-list-section",
      initialTypeId: initialActiveTypeId
    });
  } catch (err) {
    console.error("❌ initPropertyListPage error:", err);

    // Do not erase the meaningful build-time property directory on a transient
    // API error. The static directory remains useful to both visitors and
    // search crawlers; availability is checked on the linked detail pages.
    if (!listRoot.querySelector('a[href^="/properties/"]')) {
      listRoot.innerHTML = `<section class="container py-5"><h2>Explore rental properties</h2><p>Browse our <a href="/rentals/">rental categories</a> or <a href="/contact/">contact our team</a> for viewing assistance.</p></section>`;
    }
  }
}