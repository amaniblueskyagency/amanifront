// js/js_files/property_agent/property_agent.js

import {
  fetchAgents,
  fetchProperties,
  fetchLocations,
  fetchPropertyCategories
} from "../../services/amani-api.js";

import {
  renderPropertyAgentSearchSection,
  renderPropertyAgentSection,
  renderPropertyAgentCTASection,
  bindPropertyAgentPageEvents
} from "./renderPropertyAgent.js";

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

function normalizeProperty(property, locationMap) {
  const location = locationMap.get(String(property.location_id || "")) || property.locations || null;

  return {
    ...property,
    location_id: property.location_id || location?.id || "",
    location_name: location?.name || property.location || property.location_name || "Location not specified",
    agent_id: property.agents?.id || property.agent_id || "",
    category_ids: Array.isArray(property.category_ids) ? property.category_ids.map(v => String(v)) : []
  };
}

function normalizeAgent(agent, properties, categoriesMap) {
  const agentId = String(agent.id || "");
  const myProperties = properties.filter((property) => String(property.agent_id || "") === agentId);

  const primaryCategories = new Set();
  myProperties.forEach((property) => {
    (property.category_ids || []).forEach((id) => primaryCategories.add(String(id)));
  });

  const categoryNames = [...primaryCategories]
    .map((id) => categoriesMap.get(String(id))?.title || categoriesMap.get(String(id))?.name || "")
    .filter(Boolean);

  return {
    ...agent,
    image: agent.image || agent.avatar,
    role: agent.role || "Property Consultant",
    property_count: myProperties.length,
    specialties: categoryNames
  };
}

export async function initPropertyAgentPage() {
  const searchRoot = document.getElementById("property-agent-search-section");
  const sectionRoot = document.getElementById("property-agent-section");
  const ctaRoot = document.getElementById("property-agent-cta-section");

  if (!sectionRoot) return;

  try {
    const [agentsRaw, propertiesRaw, locationsRaw, categoriesRaw] = await Promise.all([
      fetchAgents(),
      fetchProperties(),
      fetchLocations(),
      fetchPropertyCategories()
    ]);

    const locationMap = buildMap(locationsRaw, "id");
    const categoriesMap = buildMap(categoriesRaw, "id");

    const properties = normalizeArray(propertiesRaw).map((item) => normalizeProperty(item, locationMap));
    const agents = normalizeArray(agentsRaw).filter(agent => agent?.name && agent.is_synthetic !== true && (agent.image || agent.avatar)).map((agent) => normalizeAgent(agent, properties, categoriesMap));

    const locations = normalizeArray(locationsRaw)
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    renderPropertyAgentSearchSection({
      rootId: "property-agent-search-section",
      locations,
      agents
    });

    renderPropertyAgentSection({
      rootId: "property-agent-section",
      agents
    });

    renderPropertyAgentCTASection({
      rootId: "property-agent-cta-section"
    });

    bindPropertyAgentPageEvents({
      agents,
      properties,
      locations,
      searchRootId: "property-agent-search-section",
      sectionRootId: "property-agent-section"
    });
  } catch (err) {
    console.error("❌ initPropertyAgentPage error:", err);

    sectionRoot.innerHTML = `
      <div class="container-xxl py-5">
        <div class="container">
          <div class="alert alert-danger mb-0">
            Failed to load property agents from the database.
          </div>
        </div>
      </div>
    `;
  }
}