// js/js_files/about/about.js

import {
  fetchAgents,
  fetchProperties,
  fetchPropertyCategories,
  fetchLocations
} from "../../services/amani-api.js";

import {
  renderAboutSearchSection,
  renderAboutMainSection,
  renderAboutCTASection,
  renderAboutAgentsSection,
  bindAboutPageEvents
} from "./renderAbout.js";

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildStats(properties, categories, locations, agents) {
  return {
    propertyCount: normalizeArray(properties).length,
    categoryCount: normalizeArray(categories).length,
    locationCount: normalizeArray(locations).length,
    agentCount: normalizeArray(agents).length
  };
}

export async function initAboutPage() {
  const mainRoot = document.getElementById("about-main-section");
  if (!mainRoot) return;

  try {
    const [agentsRaw, propertiesRaw, categoriesRaw, locationsRaw] = await Promise.all([
      fetchAgents(),
      fetchProperties(),
      fetchPropertyCategories(),
      fetchLocations()
    ]);

    const agents = normalizeArray(agentsRaw).map((agent) => ({
      ...agent,
      image: agent.image || agent.avatar || "img/team-1.jpg",
      role: agent.role || "Property Consultant"
    }));

    const stats = buildStats(propertiesRaw, categoriesRaw, locationsRaw, agentsRaw);

    renderAboutSearchSection({
      rootId: "about-search-section",
      categories: categoriesRaw,
      locations: locationsRaw
    });

    renderAboutMainSection({
      rootId: "about-main-section",
      stats
    });

    renderAboutCTASection({
      rootId: "about-cta-section"
    });

    renderAboutAgentsSection({
      rootId: "about-agents-section",
      agents
    });

    bindAboutPageEvents({
      searchRootId: "about-search-section"
    });
  } catch (err) {
    console.error("❌ initAboutPage error:", err);

    mainRoot.innerHTML = `
      <div class="container-xxl py-5">
        <div class="container">
          <div class="alert alert-danger mb-0">
            Failed to load the About page from the database.
          </div>
        </div>
      </div>
    `;
  }
}