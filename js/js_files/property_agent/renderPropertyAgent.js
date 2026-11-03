// js/js_files/property_agent/renderPropertyAgent.js

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function agentCard(agent, delay = "0.1s") {
  return `
    <div class="col-lg-3 col-md-6 wow fadeInUp" data-wow-delay="${delay}">
      <div class="team-item rounded overflow-hidden">
        <div class="position-relative">
          <img class="img-fluid" src="${escapeHtml(agent.image)}" alt="${escapeHtml(agent.name)}">
          <div class="position-absolute start-50 top-100 translate-middle d-flex align-items-center">
            <a class="btn btn-square mx-1" href="${agent.phone ? `tel:${escapeHtml(agent.phone)}` : "/contact/"}"><i class="fa fa-phone-alt"></i></a>
            <a class="btn btn-square mx-1" href="${agent.whatsapp ? `https://wa.me/${escapeHtml(String(agent.whatsapp).replace(/\D/g, ""))}` : "/contact/"}"><i class="fab fa-whatsapp"></i></a>
            <a class="btn btn-square mx-1" href="${agent.email ? `mailto:${escapeHtml(agent.email)}` : "/contact/"}"><i class="fa fa-envelope"></i></a>
          </div>
        </div>
        <div class="text-center p-4 mt-3">
          <h5 class="fw-bold mb-0">${escapeHtml(agent.name)}</h5>
          <small>${escapeHtml(agent.role)}</small>
        </div>
      </div>
    </div>
  `;
}

export function renderPropertyAgentSearchSection({ rootId, locations, agents = [] }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const locationOptions = [
    `<option value="">Location</option>`,
    ...locations.map((location) => `<option value="${escapeHtml(location.id)}">${escapeHtml(location.name)}</option>`)
  ].join("");

  root.innerHTML = `
    <div class="container-fluid bg-primary mb-5 wow fadeIn" data-wow-delay="0.1s" style="padding: 35px;">
      <div class="container">
        <div class="row g-2">
          <div class="col-md-10">
            <div class="row g-2">
              <div class="col-md-4">
                <input id="property-agent-keyword" type="text" class="form-control border-0 py-3" placeholder="Search Keyword">
              </div>
              <div class="col-md-4">
                <select id="property-agent-role-filter" class="form-select border-0 py-3">
                  <option value="">Agent Role</option>
                  ${[...new Set(agents.map(a=>String(a.role||'').trim()).filter(Boolean))].sort().map(role=>`<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-4">
                <select id="property-agent-location-filter" class="form-select border-0 py-3">
                  ${locationOptions}
                </select>
              </div>
            </div>
          </div>
          <div class="col-md-2">
            <button id="property-agent-search-btn" class="btn btn-dark border-0 w-100 py-3">Search</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderPropertyAgentSection({ rootId, agents }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const cards = agents.length
    ? agents.map((agent, index) => agentCard(agent, `${0.1 + (index % 4) * 0.2}s`)).join("")
    : `<div class="col-12"><p><a href="/contact/">Contact Amani about a rental or viewing.</a></p></div>`;

  root.innerHTML = `
    <div class="container-xxl py-5">
      <div class="container">
        <div class="text-center mx-auto mb-5 wow fadeInUp" data-wow-delay="0.1s" style="max-width: 600px;">
          <span class="section-eyebrow">Your guides</span>
          <h1 class="mb-3">Property Agents</h1>
          <p>Contact Amani Blue Sky Properties about rental listings and property viewings.</p>
        </div>
        <div class="row g-4">
          ${cards}
        </div>
      </div>
    </div>
  `;
}

export function renderPropertyAgentCTASection({ rootId }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  root.innerHTML = `
    <div class="container-xxl py-5 premium-cta">
      <div class="container">
        <div class="bg-light rounded p-3">
          <div class="bg-white rounded p-4" style="border: 1px dashed rgba(0, 185, 142, .3)">
            <div class="row g-5 align-items-center">
              <div class="col-lg-6 wow fadeIn" data-wow-delay="0.1s">
                <img class="img-fluid rounded w-100" src="img/rental/property-007/exterior/property-007-amazon-two-apartment-exterior-002.webp" alt="">
              </div>
              <div class="col-lg-6 wow fadeIn" data-wow-delay="0.5s">
                <div class="mb-4">
                  <span class="section-eyebrow on-dark">Personal guidance</span>
                  <h1 class="mb-3">Contact the Amani Property Team</h1>
                  <p>Contact Amani about its published property listings and arrange a viewing for a listed unit.</p>
                </div>
                <a href="tel:+254797674649" class="btn btn-primary py-3 px-4 me-2"><i class="fa fa-phone-alt me-2"></i>Make A Call</a>
                <a href="/contact/" class="btn btn-dark py-3 px-4"><i class="fa fa-calendar-alt me-2"></i>Get Appointment</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function filterAgents(agents, properties, filters) {
  const keyword = String(filters.keyword || "").trim().toLowerCase();
  const role = String(filters.role || "").trim().toLowerCase();
  const locationId = String(filters.locationId || "").trim();

  return agents.filter((agent) => {
    const keywordMatch =
      !keyword ||
      [agent.name, agent.role, ...(agent.specialties || [])].join(" ").toLowerCase().includes(keyword);

    const roleMatch =
      !role ||
      String(agent.role || "").toLowerCase().includes(role);

    const locationMatch =
      !locationId ||
      properties.some((property) => String(property.agent_id || "") === String(agent.id || "") && String(property.location_id || "") === locationId);

    return keywordMatch && roleMatch && locationMatch;
  });
}

export function bindPropertyAgentPageEvents({
  agents,
  properties,
  searchRootId,
  sectionRootId
}) {
  const searchRoot = document.getElementById(searchRootId);
  if (!searchRoot) return;

  const keywordEl = searchRoot.querySelector("#property-agent-keyword");
  const roleEl = searchRoot.querySelector("#property-agent-role-filter");
  const locationEl = searchRoot.querySelector("#property-agent-location-filter");
  const searchBtn = searchRoot.querySelector("#property-agent-search-btn");

  const rerender = () => {
    const filtered = filterAgents(agents, properties, {
      keyword: keywordEl?.value || "",
      role: roleEl?.value || "",
      locationId: locationEl?.value || ""
    });

    renderPropertyAgentSection({
      rootId: sectionRootId,
      agents: filtered
    });
  };

  if (searchBtn) searchBtn.addEventListener("click", rerender);
  if (roleEl) roleEl.addEventListener("change", rerender);
  if (locationEl) locationEl.addEventListener("change", rerender);

  if (keywordEl) {
    keywordEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") rerender();
    });
  }
}