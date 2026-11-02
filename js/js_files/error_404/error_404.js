// js/js_files/error_404/error_404.js

import {
  fetchPropertyCategories,
  fetchLocations
} from "../../services/amani-api.js";

import {
  renderError404SearchSection,
  renderError404MainSection,
  bindError404PageEvents
} from "./renderError404.js";

export async function initError404Page() {
  const mainRoot = document.getElementById("error-404-main-section");
  if (!mainRoot) return;

  try {
    const [categoriesRaw, locationsRaw] = await Promise.all([
      fetchPropertyCategories(),
      fetchLocations()
    ]);

    renderError404SearchSection({
      rootId: "error-404-search-section",
      categories: categoriesRaw,
      locations: locationsRaw
    });

    renderError404MainSection({
      rootId: "error-404-main-section"
    });

    bindError404PageEvents({
      rootId: "error-404-main-section"
    });
  } catch (err) {
    console.error("❌ initError404Page error:", err);

    mainRoot.innerHTML = `
      <div class="container-xxl py-5">
        <div class="container">
          <div class="alert alert-danger mb-0">
            Failed to load the 404 page.
          </div>
        </div>
      </div>
    `;
  }
}