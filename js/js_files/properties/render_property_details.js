import { fetchPropertyDetails } from "../../services/amani-api.js";
import { renderQuoteForm } from "./quote.js";
import { describePhoto, availableCategories } from "./photo-categories.mjs";
import { availableBookingUnits, isBookableUnit, bookingUnitType } from "./unit-booking.mjs";

export async function renderPropertyDetails(propertyId) {
  const container = document.getElementById("property-details-container");
  if (!container || !propertyId) return;

  try {
    const payload = await fetchPropertyDetails(propertyId);
    if (!payload?.property) {
      container.innerHTML = `<main class="amani-pd"><div class="amani-pd-shell"><p>Property not found.</p></div></main>`;
      return;
    }

    const property = payload.property;
    const details = payload.details || {};
    const location = property.locations?.name || property.location || "";
    const agent = property.agents || {};
    const units = Array.isArray(payload.units) ? payload.units : (Array.isArray(property.units) ? property.units : []);
    const availableUnits = availableBookingUnits(units);
    const requestedUnitId = new URLSearchParams(locationSearch()).get("unit") || "";
    const unit =
      availableUnits.find(x => String(x.unit_id || x.id || "") === requestedUnitId) ||
      availableUnits[0] ||
      null;

    const rawGallery = Array.isArray(payload.gallery) && payload.gallery.length
      ? payload.gallery
      : (property.thumbnail ? [{ src: property.thumbnail, alt: property.title || 'Property' }] : []);
    const gallery = [...new Map(rawGallery.filter(photo => photo?.src).reverse().map(photo => [photo.src, photo])).values()].reverse();
    const photoMeta = gallery.map(describePhoto);
    const photoRoomTypes = [...new Set(photoMeta.map(x => x.unitType).filter(Boolean))];
    const categoryTabs = (kind = '') => availableCategories(photoMeta, kind);
    const generalCategories = categoryTabs('');
    const price = unit?.price_display || payload.price_display || property.price_display || (unit ? formatMoney(unit.rent_amount) : "Contact for availability");
    const bedrooms = unit?.bedrooms ?? property.stats?.bedrooms ?? "—";
    const bathrooms = unit?.bathrooms ?? unit?.bathrooms_text ?? property.stats?.bathrooms_text ?? "—";
    const size = unit?.area_label || property.stats?.sqft_text || property.area_label || "—";
    const floor = unit?.floor_level || unit?.floor || unit?.floor_number || property.floor_level || "";
    const type = unit?.unit_type || property.property_type || property.type || details.property_type || "Property";
    const phone = String(agent.phone || agent.contact_json?.phone || "");
    const paragraphs = Array.isArray(payload.paragraphs) ? payload.paragraphs : [];
    const features = Array.isArray(payload.features) ? payload.features : [];
    const map = payload.map_embed || "";
    const status = availableUnits.length ? `${availableUnits.length} Available ${availableUnits.length === 1 ? "Unit" : "Units"}` : "Currently Unavailable";

    container.innerHTML = `
      <main class="amani-pd">
        <div class="amani-pd-shell">
          <div class="amani-pd-toolbar">
            <div class="amani-pd-crumbs">
              <i class="fa fa-home"></i><span>›</span><a href="/property-list/">Properties</a><span>›</span><span>${escapeHtml(property.title || "")}</span>
            </div>
            <a class="amani-pd-back" href="/property-list/"><i class="fa fa-arrow-left"></i> Back to Properties</a>
          </div>

          <div class="amani-pd-grid">
            <section class="amani-pd-left">
              ${gallery.length ? `<div class="amani-pd-hero">
                <img class="amani-pd-soft-backdrop" src="${escapeAttr(gallery[0].src)}" alt="" aria-hidden="true" draggable="false">
                <img id="amani-pd-main-image" src="${escapeAttr(gallery[0].src)}" alt="${escapeAttr(gallery[0].alt || property.title || "")}">
                ${gallery.length > 1 ? `
                  <button class="amani-pd-photo-nav prev" type="button" data-photo-prev aria-label="Previous image"><i class="fa fa-chevron-left"></i></button>
                  <button class="amani-pd-photo-nav next" type="button" data-photo-next aria-label="Next image"><i class="fa fa-chevron-right"></i></button>
                ` : ""}
                <span class="amani-pd-count"><b data-photo-count>1</b> / <span data-photo-total>${gallery.length}</span></span>
                <button class="amani-pd-fullscreen" type="button" data-photo-fullscreen aria-label="Fullscreen"><i class="fa fa-expand"></i></button>
              </div>` : `<div class="amani-pd-no-photos" role="status"><i class="fa fa-image" aria-hidden="true"></i><p>Property photographs have not been uploaded yet.</p></div>`}

              ${gallery.length > 1 ? `
                <div class="amani-pd-thumbs-wrap">
                  <button class="amani-pd-thumb-nav" type="button" data-thumbs-prev aria-label="Scroll thumbnails left"><i class="fa fa-chevron-left"></i></button>
                  <div class="amani-pd-thumbs" data-thumbs>
                    ${gallery.map((img,i)=>`
                      <button class="amani-pd-thumb ${i===0?"active":""}" type="button" data-photo-index="${i}" data-photo-src="${escapeAttr(img.src)}" aria-label="Photo ${i+1}">
                        <img src="${escapeAttr(img.src)}" alt="${escapeAttr(img.alt || `${property.title || "Property"} photo ${i+1}`)}" loading="lazy">
                      </button>`).join("")}
                  </div>
                  <button class="amani-pd-thumb-nav" type="button" data-thumbs-next aria-label="Scroll thumbnails right"><i class="fa fa-chevron-right"></i></button>
                </div>
              ` : ""}

              <div class="amani-pd-tabs">
                <button class="active" type="button" data-tab="description"><i class="far fa-file-alt"></i> Description</button>
                ${features.length ? `<button type="button" data-tab="features"><i class="fa fa-list"></i> Features</button>` : ""}
                ${map ? `<button type="button" data-tab="location"><i class="fa fa-map-marker-alt"></i> Location</button>` : ""}
                ${gallery.length ? `<button type="button" data-tab="photos" data-gallery-filter="All Photos"><i class="fa fa-images"></i> All Photos</button>` : ""}
                ${photoRoomTypes.map(kind=>`<button type="button" data-photo-unit-type="${escapeAttr(kind)}"><i class="fa fa-home"></i> ${escapeHtml(kind)} Photos</button>`).join("")}
                <span data-photo-room-tabs>${generalCategories.map(label=>`<button type="button" data-room-category="${escapeAttr(label)}"><i class="fa fa-camera"></i> ${escapeHtml(label)}</button>`).join("")}</span>
                ${availableUnits.length ? `<button type="button" data-tab="available" class="amani-pd-availability-tab" aria-controls="amani-pd-available-panel" aria-expanded="false"><i class="fa fa-key"></i> Available Units <span class="amani-pd-availability-count">${availableUnits.length}</span></button>` : ""}
              </div>

              <div class="amani-pd-panel" data-panel="description">
                <h2>Property Description</h2>
                ${(paragraphs.length ? paragraphs : [details.description || property.notes || "Property details are available from the agent."]).map(x=>`<p>${escapeHtml(x)}</p>`).join("")}
              </div>
              ${features.length ? `<div class="amani-pd-panel hidden" data-panel="features"><h2>Features</h2><div class="amani-pd-features">${features.map(x=>`<div><i class="fa fa-check"></i>${escapeHtml(x)}</div>`).join("")}</div></div>` : ""}
              ${map ? `<div class="amani-pd-panel hidden" data-panel="location"><h2>Location</h2><iframe src="${escapeAttr(map)}" loading="lazy"></iframe></div>` : ""}
              ${gallery.length ? `<div class="amani-pd-panel hidden" data-panel="photos"><h2 data-photo-category-heading>Property Photos</h2></div>` : ""}
              ${availableUnits.length ? `<div class="amani-pd-panel hidden" data-panel="available" id="amani-pd-available-panel">
                <div class="amani-pd-available-heading"><div><p class="amani-pd-available-kicker">LIVE UNIT AVAILABILITY</p><h2>Choose the unit you'd like to view</h2><p>Select a vacant unit below. Your visit request will be attached to that exact unit.</p></div><span class="amani-pd-available-total">${availableUnits.length} available</span></div>
                <div class="amani-pd-availability-types" data-availability-types></div>
                <div class="amani-pd-unit-grid" data-available-unit-results></div>
              </div>` : ""}
              <div id="quote-form-placeholder" aria-live="polite"></div>
            </section>

            <aside class="amani-pd-right">
              <div class="amani-pd-card amani-pd-summary">
                <span class="amani-pd-status">${escapeHtml(status)}</span>
                <h1>${escapeHtml(property.title || "")}</h1>
                <p class="amani-pd-location"><i class="fa fa-map-marker-alt"></i>${escapeHtml(location)}</p>
                <hr>
                <div class="amani-pd-stats">
                  <div><strong><i class="fa fa-bed"></i> ${escapeHtml(bedrooms)}</strong><span>Bedrooms</span></div>
                  <div><strong><i class="fa fa-bath"></i> ${escapeHtml(bathrooms)}</strong><span>Bathrooms</span></div>
                  <div><strong><i class="fa fa-ruler-combined"></i> ${escapeHtml(size)}</strong><span>Unit Size</span></div>
                  ${floor ? `<div><strong><i class="fa fa-layer-group"></i> ${escapeHtml(floor)}</strong><span>Floor Level</span></div>` : ""}
                </div>
                <hr>
                <div class="amani-pd-price">${escapeHtml(price)}</div>
                <div class="amani-pd-period">per month</div>
                ${availableUnits.length ? `<button type="button" class="amani-pd-enquire" data-view-available><i class="fa fa-key"></i> View ${availableUnits.length} Available ${availableUnits.length === 1 ? "Unit" : "Units"}</button>` : `<p class="amani-pd-unavailable-note" role="status">There are no vacant units currently listed for viewing. You can contact the agent for future availability.</p>`}
                ${phone ? `<a class="amani-pd-call" href="tel:${escapeAttr(phone.replace(/\s+/g,""))}"><i class="fa fa-phone-alt"></i> Call ${escapeHtml(phone)}</a>` : ""}
              </div>

              <div class="amani-pd-card amani-pd-quick">
                <h2><span><i class="far fa-file-alt"></i></span> Quick Details</h2>
                <dl>
                  <div><dt>Property Type</dt><dd>${escapeHtml(type)}</dd></div>
                  <div><dt>Status</dt><dd><span class="amani-pd-inline-status">${escapeHtml(status)}</span></dd></div>
                  <div><dt>Location</dt><dd>${escapeHtml(location || "—")}</dd></div>
                  <div><dt>Bedrooms</dt><dd>${escapeHtml(bedrooms)}</dd></div>
                  <div><dt>Bathrooms</dt><dd>${escapeHtml(bathrooms)}</dd></div>
                  <div><dt>Unit Size</dt><dd>${escapeHtml(size)}</dd></div>
                  ${floor ? `<div><dt>Floor Level</dt><dd>${escapeHtml(floor)}</dd></div>` : ""}
                </dl>
              </div>
            </aside>
          </div>
        </div>
      </main>`;

    const main = container.querySelector("#amani-pd-main-image");
    const softBackdrop = container.querySelector(".amani-pd-soft-backdrop");
    const thumbs = [...container.querySelectorAll("[data-photo-index]")];
    const count = container.querySelector("[data-photo-count]");
    let index = 0;
    const show = next => {
      if (!gallery.length) return;
      index = (next + gallery.length) % gallery.length;
      if (filteredIndices.length && !filteredIndices.includes(index)) index = filteredIndices[0];
      if (main) main.src = gallery[index].src;
      if (softBackdrop) softBackdrop.src = gallery[index].src;
      if (count) count.textContent = String(filteredIndices.includes(index) ? filteredIndices.indexOf(index) + 1 : index + 1);
      thumbs.forEach((x,i)=>x.classList.toggle("active", i===index));
      thumbs[index]?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});
    };
    let filteredIndices = gallery.map((_, i) => i);
    let currentPhotoType = "";
    const roomTabContainer = container.querySelector('[data-photo-room-tabs]');
    const refreshRoomTabs = () => {
      const cats = currentPhotoType ? categoryTabs(currentPhotoType) : generalCategories;
      if (!roomTabContainer) return;
      roomTabContainer.innerHTML = `${currentPhotoType ? '<button type="button" data-room-category="All Type Photos">All Type Photos</button>' : ''}${cats.map(c => `<button type="button" data-room-category="${escapeAttr(c)}">${escapeHtml(c)}</button>`).join('')}`;
      roomTabContainer.querySelectorAll('[data-room-category]').forEach(btn => btn.addEventListener('click', () => {
        selectPhotoCategory(btn.dataset.roomCategory);
        activatePanel('photos');
      }));
    };
    const activatePanel = key => {
      container.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===key));
      container.querySelectorAll('[data-panel]').forEach(x=>x.classList.toggle('hidden',x.dataset.panel!==key));
      container.querySelector('[data-tab="available"]')?.setAttribute('aria-expanded', String(key === 'available'));
    };
    const selectPhotoCategory = category => {
      filteredIndices = gallery.map((_, i) => i).filter(i => {
        const meta = photoMeta[i];
        if (category === "All Photos") return true;
        return meta.unitType === currentPhotoType && (category === "All Type Photos" || meta.category === category);
      });
      thumbs.forEach((thumb, i) => { thumb.hidden = !filteredIndices.includes(i); });
      const heading = container.querySelector("[data-photo-category-heading]");
      if (heading) heading.textContent = category === "All Photos" ? "All Property Photos" : `${category} Photos`;
      const total = container.querySelector("[data-photo-total]");
      if (total) total.textContent = String(filteredIndices.length);
      if (filteredIndices.length) show(filteredIndices.includes(index) ? index : filteredIndices[0]);
      container.querySelectorAll("[data-gallery-filter]").forEach(x=>x.classList.toggle("active",x.dataset.galleryFilter===category));
    };
    // Build available-unit choices from the public API flags, never from a
    // hardcoded property/unit list or from unit-type counts alone.
    const availableByType = new Map();
    for (const item of availableUnits) {
      const kind = bookingUnitType(item);
      if (!availableByType.has(kind)) availableByType.set(kind, []);
      availableByType.get(kind).push(item);
    }
    const availabilityTypes = container.querySelector('[data-availability-types]');
    const availableResults = container.querySelector('[data-available-unit-results]');
    const renderAvailableChoices = type => {
      const choices = type === 'All' ? availableUnits : (availableByType.get(type) || []);
      if (availableResults) availableResults.innerHTML = choices.map(renderAvailableUnitCard).join('');
      availabilityTypes?.querySelectorAll('[data-availability-type]').forEach(button => {
        const active = button.dataset.availabilityType === type;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      availableResults?.querySelectorAll('[data-unit-select]').forEach(button => button.addEventListener('click', () => {
        const selected = availableUnits.find(x => String(x.unit_id || x.id || '') === button.dataset.unitSelect);
        if (isBookableUnit(selected)) openEnquiry(selected);
      }));
    };
    if (availabilityTypes) {
      availabilityTypes.innerHTML = ['All', ...availableByType.keys()].map(type =>
        `<button type="button" data-availability-type="${escapeAttr(type)}" aria-pressed="${type === 'All' ? 'true' : 'false'}" class="${type === 'All' ? 'active' : ''}">${escapeHtml(type)} <span>${type === 'All' ? availableUnits.length : availableByType.get(type).length}</span></button>`
      ).join('');
      availabilityTypes.querySelectorAll('[data-availability-type]').forEach(button => button.addEventListener('click', () => renderAvailableChoices(button.dataset.availabilityType)));
      renderAvailableChoices('All');
    }
    container.querySelectorAll("[data-gallery-filter]").forEach(button => button.addEventListener("click",()=>{
      currentPhotoType = ""; refreshRoomTabs(); selectPhotoCategory("All Photos");
    }));
    container.querySelectorAll('[data-photo-unit-type]').forEach(button => button.addEventListener('click', () => {
      currentPhotoType=button.dataset.photoUnitType;
      refreshRoomTabs(); selectPhotoCategory('All Type Photos'); activatePanel('photos');
    }));
    refreshRoomTabs();
    thumbs.forEach((x,i)=>x.addEventListener("click",()=>show(i)));
    container.querySelector("[data-photo-prev]")?.addEventListener("click",()=>show(filteredIndices[(filteredIndices.indexOf(index)-1+filteredIndices.length)%filteredIndices.length] ?? index-1));
    container.querySelector("[data-photo-next]")?.addEventListener("click",()=>show(filteredIndices[(filteredIndices.indexOf(index)+1)%filteredIndices.length] ?? index+1));
    const strip=container.querySelector("[data-thumbs]");
    container.querySelector("[data-thumbs-prev]")?.addEventListener("click",()=>strip?.scrollBy({left:-420,behavior:"smooth"}));
    container.querySelector("[data-thumbs-next]")?.addEventListener("click",()=>strip?.scrollBy({left:420,behavior:"smooth"}));
    container.querySelector("[data-photo-fullscreen]")?.addEventListener("click",async()=>{
      try { document.fullscreenElement ? await document.exitFullscreen() : await main.parentElement.requestFullscreen(); } catch {}
    });
    container.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>activatePanel(btn.dataset.tab)));
    container.querySelector('[data-view-available]')?.addEventListener('click', () => {
      activatePanel('available');
      container.querySelector('#amani-pd-available-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    if (requestedUnitId && availableUnits.some(x => String(x.unit_id || x.id) === requestedUnitId)) {
      activatePanel('available');
    }

    // The form is created once and opened explicitly. An available unit replaces
    // its context in place; no page re-render or lost tab state.
    const openEnquiry = (requestedUnit = null) => {
      if (!isBookableUnit(requestedUnit)) return;
      activatePanel('available');
      renderQuoteForm('#quote-form-placeholder', property, requestedUnit);
      const formPanel = container.querySelector('#quote-form-container');
      formPanel?.classList.add('show');
      formPanel?.setAttribute('aria-expanded', 'true');
      const target = container.querySelector('#quote-form-placeholder');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Focus the first input only after the form has been inserted.
      target?.querySelector('#user-name')?.focus({ preventScroll: true });
    };
    // Do not render or submit a booking form before a visitor chooses a unit.
  } catch (err) {
    console.error("renderPropertyDetails error:", err);
    container.innerHTML = `<main class="amani-pd"><div class="amani-pd-shell"><p>Unable to load property details.</p></div></main>`;
  }
}

function locationSearch() { return window.location.search; }

function renderAvailableUnitCard(unit) {
  const id = unit.unit_id || unit.id || '';
  const name = getUnitDisplayName(unit);
  const kind = bookingUnitType(unit);
  const floor = unit.floor_label || unit.floor_level || (unit.floor_no != null ? `Floor ${unit.floor_no}` : '');
  const price = unit.price_display || formatMoney(unit.rent_amount);
  return `<article class="amani-pd-available-card">
    <div class="amani-pd-unit-title"><span class="amani-pd-available-pill"><i class="fa fa-check-circle"></i> Vacant</span><strong>${escapeHtml(name)}</strong><span>${escapeHtml(kind)}${floor ? ` · ${escapeHtml(floor)}` : ''}</span></div>
    <div class="amani-pd-unit-price"><b>${escapeHtml(price)}</b><small>${escapeHtml(formatUnitAvailability(unit))}</small></div>
    <button type="button" data-unit-select="${escapeAttr(id)}" aria-label="Request visit for ${escapeAttr(name)}"><i class="fa fa-calendar-alt"></i> Book Visit · ${escapeHtml(name)}</button>
  </article>`;
}

function getUnitDisplayName(unit = {}) {
  return unit.unit_code || unit.unit_name || unit.unit_title || unit.block_name || "Unit";
}

function formatUnitAvailability(unit) {
  if (unit.is_available_now) return "Available now";
  if (unit.is_coming_soon) return `Available from ${formatDate(unit.public_available_from)}`;
  const status = unit.public_availability_status || unit.unit_status || "Occupied";
  return String(status).replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "N/A";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0
  }).format(amount);
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