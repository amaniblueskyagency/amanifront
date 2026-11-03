// js/js_files/error_404/renderError404.js

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderError404SearchSection({rootId}) {
  const root=document.getElementById(rootId);
  if (!root) return;
  root.innerHTML=`<section class="container-fluid bg-primary mb-5 py-4" aria-label="Search rental properties"><div class="container"><form action="/property-list/" method="get" role="search" class="row g-2"><div class="col-md-9"><label class="visually-hidden" for="{rootId}-q">Find a property or location</label><input id="{rootId}-q" name="q" type="search" class="form-control border-0 py-3" placeholder="Search published rental properties"></div><div class="col-md-3"><button class="btn btn-dark border-0 w-100 py-3" type="submit">Search listings</button></div></form></div></section>`;
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
            <p class="mb-4">Sorry, the page you are looking for does not exist on the Amani Blue Sky Agency website. Return to the homepage or search current rental listings.</p>
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