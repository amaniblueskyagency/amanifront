// js/js_files/about/renderAbout.js

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

export function renderAboutSearchSection({rootId}) {
  const root=document.getElementById(rootId);
  if (!root) return;
  root.innerHTML=`<section class="container-fluid bg-primary mb-5 py-4" aria-label="Search rental properties"><div class="container"><form action="/property-list/" method="get" role="search" class="row g-2"><div class="col-md-9"><label class="visually-hidden" for="{rootId}-q">Find a property or location</label><input id="{rootId}-q" name="q" type="search" class="form-control border-0 py-3" placeholder="Search published rental properties"></div><div class="col-md-3"><button class="btn btn-dark border-0 w-100 py-3" type="submit">Search listings</button></div></form></div></section>`;
}

export function renderAboutMainSection({ rootId, stats }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  root.innerHTML = `
    <div class="container-xxl py-5">
      <div class="container">
        <div class="row g-5 align-items-center">
          <div class="col-lg-6 wow fadeIn" data-wow-delay="0.1s">
            <div class="about-img position-relative overflow-hidden p-5 pe-0">
              <img class="img-fluid w-100" src="/img/rental/property-007/exterior/property-007-amazon-two-apartments-exterior-001.webp">
            </div>
          </div>
          <div class="col-lg-6 wow fadeIn" data-wow-delay="0.5s">
            <span class="section-eyebrow">Who we are</span>
            <h1 class="mb-4">A trusted place to find the right property</h1>
            <p class="mb-4">Amani Blue Sky Properties presents rental properties in Thika, Juja and surrounding areas. Browse individual property listings to see their locations, published photos and unit enquiries.</p>
            <p><i class="fa fa-check text-primary me-3"></i>Named rental properties and searchable locations</p>
            <p><i class="fa fa-check text-primary me-3"></i>Property-specific photos and unit information</p>
            <p><i class="fa fa-check text-primary me-3"></i>Viewing requests submitted for selected units</p>
            <a class="btn btn-primary py-3 px-5 mt-3" href="/property-list/">View Properties</a>
            <div class="mt-4">
              <small class="d-block">Properties listed: ${Number(stats.propertyCount || 0).toLocaleString()}</small>
              <small class="d-block">Property categories: ${Number(stats.categoryCount || 0).toLocaleString()}</small>
              <small class="d-block">Locations covered: ${Number(stats.locationCount || 0).toLocaleString()}</small>

            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderAboutCTASection({ rootId }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  root.innerHTML = `
    <div class="container-xxl py-5 premium-cta">
      <div class="container">
        <div class="bg-light rounded p-3">
          <div class="bg-white rounded p-4" style="border: 1px dashed rgba(0, 185, 142, .3)">
            <div class="row g-5 align-items-center">
              <div class="col-lg-6 wow fadeIn" data-wow-delay="0.1s">
                <img class="img-fluid rounded w-100" src="/img/rental/property-007/exterior/property-007-amazon-two-apartments-exterior-002.webp" alt="">
              </div>
              <div class="col-lg-6 wow fadeIn" data-wow-delay="0.5s">
                <div class="mb-4">
                  <span class="section-eyebrow on-dark">Personal guidance</span>
                  <h1 class="mb-3">Contact the Amani Property Team</h1>
                  <p>Contact Amani Blue Sky Properties about current rental listings and property viewing requests.</p>
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

export function renderAboutAgentsSection({ rootId, agents }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const cards = agents.length
    ? agents.slice(0, 4).map((agent, index) => agentCard(agent, `${0.1 + (index % 4) * 0.2}s`)).join("")
    : `<div class="col-12"><p><a href="/contact/">Contact Amani about a rental or viewing.</a></p></div>`;

  root.innerHTML = `
    <div class="container-xxl py-5">
      <div class="container">
        <div class="text-center mx-auto mb-5 wow fadeInUp" data-wow-delay="0.1s" style="max-width: 600px;">
          <span class="section-eyebrow">Our people</span>
          <h1 class="mb-3">Property Agents</h1>
          <p>Use the contact page to ask Amani about a named rental property or a viewing.</p>
        </div>
        <div class="row g-4">
          ${cards}
        </div>
      </div>
    </div>
  `;
}

export function bindAboutPageEvents() {
  // Reserved for future interactions while keeping the page JS-driven
}