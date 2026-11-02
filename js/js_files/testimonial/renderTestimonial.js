// js/js_files/testimonial/renderTestimonial.js

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function testimonialCard(item) {
  return `
    <div class="testimonial-item bg-light rounded p-3">
      <div class="bg-white border rounded p-4">
        <p>${escapeHtml(item.text)}</p>
        <div class="d-flex align-items-center">
          <img class="img-fluid flex-shrink-0 rounded" src="${escapeHtml(item.image)}" style="width: 45px; height: 45px;">
          <div class="ps-3">
            <h6 class="fw-bold mb-1">${escapeHtml(item.name)}</h6>
            <small>${escapeHtml(item.role)}</small>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderTestimonialSearchSection({ rootId, categories, locations }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const categoryOptions = [
    `<option selected>Property Type</option>`,
    ...categories.map(
      (category) =>
        `<option value="${escapeHtml(category.id)}">${escapeHtml(category.title || category.name)}</option>`
    )
  ].join("");

  const locationOptions = [
    `<option selected>Location</option>`,
    ...locations.map(
      (location) =>
        `<option value="${escapeHtml(location.id)}">${escapeHtml(location.name)}</option>`
    )
  ].join("");

  root.innerHTML = `
    <div class="container-fluid bg-primary mb-5 wow fadeIn" data-wow-delay="0.1s" style="padding: 35px;">
      <div class="container">
        <div class="row g-2">
          <div class="col-md-10">
            <div class="row g-2">
              <div class="col-md-4">
                <input type="text" class="form-control border-0 py-3" placeholder="Search Keyword">
              </div>
              <div class="col-md-4">
                <select class="form-select border-0 py-3">
                  ${categoryOptions}
                </select>
              </div>
              <div class="col-md-4">
                <select class="form-select border-0 py-3">
                  ${locationOptions}
                </select>
              </div>
            </div>
          </div>
          <div class="col-md-2">
            <button class="btn btn-dark border-0 w-100 py-3">Search</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderTestimonialMainSection({ rootId, testimonials }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const items = testimonials.length
    ? testimonials.map(testimonialCard).join("")
    : `
      <div class="col-12">
        <div class="alert alert-light border mb-0">No testimonials available.</div>
      </div>
    `;

  root.innerHTML = `
    <div class="container-xxl py-5">
      <div class="container">
        <div class="text-center mx-auto mb-5 wow fadeInUp" data-wow-delay="0.1s" style="max-width: 600px;">
          <span class="section-eyebrow">The experience</span>
          <h1 class="mb-3">Our Clients Say!</h1>
          <p>Here is what clients appreciate about working with Amani Blue Sky Agency across rentals, purchases, and property guidance.</p>
        </div>
        <div class="owl-carousel testimonial-carousel wow fadeInUp" data-wow-delay="0.1s">
          ${items}
        </div>
      </div>
    </div>
  `;
}

export function bindTestimonialPageEvents() {
  // carousel is initialized by the existing main.js logic
}