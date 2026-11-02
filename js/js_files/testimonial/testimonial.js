// js/js_files/testimonial/testimonial.js

import {
  fetchPropertyCategories,
  fetchLocations,
  fetchAgents,
  fetchProperties
} from "../../services/amani-api.js";

import {
  renderTestimonialSearchSection,
  renderTestimonialMainSection,
  bindTestimonialPageEvents
} from "./renderTestimonial.js";

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildTestimonials(agentsRaw, propertiesRaw) {
  const agents = normalizeArray(agentsRaw);
  const properties = normalizeArray(propertiesRaw);

  const fallbackTexts = [
    "Amani Blue Sky Agency gave us clear guidance, timely support, and a smooth property search experience from start to finish.",
    "The team was responsive, professional, and helped us find options that matched our budget and preferred location.",
    "We appreciated the honest communication, organized site visits, and confidence the agency brought throughout the process."
  ];

  return agents.slice(0, 6).map((agent, index) => {
    const managedCount = properties.filter(
      (property) =>
        String(property.agents?.id || property.agent_id || "") === String(agent.id || "")
    ).length;

    return {
      id: agent.id || `testimonial-${index + 1}`,
      text: fallbackTexts[index % fallbackTexts.length],
      name: agent.name || "Client",
      role: managedCount > 0 ? `${managedCount} Listed Properties` : (agent.role || "Client"),
      image: agent.image || agent.avatar || `img/testimonial-${(index % 3) + 1}.jpg`
    };
  });
}

export async function initTestimonialPage() {
  const mainRoot = document.getElementById("testimonial-main-section");
  if (!mainRoot) return;

  try {
    const [categoriesRaw, locationsRaw, agentsRaw, propertiesRaw] =
      await Promise.all([
        fetchPropertyCategories(),
        fetchLocations(),
        fetchAgents(),
        fetchProperties()
      ]);

    const testimonials = buildTestimonials(agentsRaw, propertiesRaw);

    renderTestimonialSearchSection({
      rootId: "testimonial-search-section",
      categories: categoriesRaw,
      locations: locationsRaw
    });

    renderTestimonialMainSection({
      rootId: "testimonial-main-section",
      testimonials
    });

    bindTestimonialPageEvents({
      rootId: "testimonial-main-section"
    });
  } catch (err) {
    console.error("❌ initTestimonialPage error:", err);

    mainRoot.innerHTML = `
      <div class="container-xxl py-5">
        <div class="container">
          <div class="alert alert-danger mb-0">
            Failed to load testimonials.
          </div>
        </div>
      </div>
    `;
  }
}