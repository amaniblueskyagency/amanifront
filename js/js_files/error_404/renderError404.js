// js/js_files/error_404/renderError404.js

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderError404SearchSection({ rootId, categories, locations }) {
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

export function renderError404MainSection({ rootId }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  root.innerHTML = `
    <div class="container-xxl py-5 wow fadeInUp" data-wow-delay="0.1s">
      <div class="container text-center">
        <div class="row justify-content-center">
          <div class="col-lg-6">
            <i class="bi bi-exclamation-triangle display-1 text-primary"></i>
            <h1 class="display-1">404</h1>
            <h1 class="mb-4">Page Not Found</h1>
            <p class="mb-4">Sorry, the page you are looking for does not exist on the Amani Blue Sky Agency website. Please return home or use the search section above.</p>
            <a class="btn btn-primary py-3 px-5" href="/">Go Back To Home</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindError404PageEvents() {
  // kept minimal to match current page behavior
}