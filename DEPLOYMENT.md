# Amani Blue Sky — Netlify public website deploy

This repository is an existing static frontend backed by `amani-backend`. The production SEO build produces an indexable HTML page for every public property returned by the backend. Its URL is **ID-based**, e.g. `/properties/amani-p007/`; marketing names may be edited in Supabase without breaking links or galleries. Changes to titles, locations, or property records require a *new Netlify deployment* to refresh prerendered SEO text and sitemap.

## Deployment order

1. Deploy the **backend on Render** first and verify its `/health` and `/api/site/properties-with-availability` endpoints return HTTP 200 and `success: true`.
2. Configure the **public website on Netlify** from the `amani-web` directory (the repository root if it is a separate repo; **Base directory = `amani-web`** if the repo contains multiple sibling applications). Use the repository's `netlify.toml`: build `npm run build`, publish `dist`, Node 20.
3. Set Netlify environment variables (both **Builds and Functions** access):
   - `SITE_URL=https://amanibluesky.com` (HTTPS origin only, no slash after the host, no path or query; use the primary domain chosen in Netlify).
   - `AMANI_BACKEND_ORIGIN=https://YOUR-RENDER-SERVICE.onrender.com` (HTTPS origin only, no `/api`). Used by the build and `/api/site/*` proxy.
4. Deploy. Production will **intentionally fail** if Render cannot be reached or does not return a valid list of public properties. This avoids publishing stale names and SEO pages. Check logs for `[SEO] Fetched ... live properties`.
5. Visit `https://amanibluesky.com/sitemap.xml`, `/robots.txt`, `/property-list/`, `/properties/amani-p007/`, a property page with no photos, and form submissions. Verify the browser Network panel shows `/api/site/*` returning HTTP 200 and gallery images loading. Run a viewing request for an actually vacant unit and verify it in the backend/admin.
6. In Google Search Console, verify the **canonical** domain and submit `/sitemap.xml`. Request indexing after first deployment and after substantial page updates. Google controls whether and when to index/rank pages; no technical patch guarantees search positions.

**Old links:** Main `.html` pages redirect to their pretty URLs on Netlify. Legacy `properties.html?slug=...` and `properties.html?id=...` remain available at those exact URLs (with `noindex`) so the requested property is not lost; new ID-stable links point to `/properties/amani-pNNN/`. Netlify normally also standardizes trailing slashes. Preview builds should not be submitted to search engines. Select and redirect secondary/www domain aliases in Netlify's domain settings after you know the actual domain.

**Local development:** Existing `RUN_WEB.cmd` and port 8080 still work. It redirects ID-style detail URLs to the old `properties.html?id=...` page. A local test build can run `set SITE_URL=https://example.com` then `npm run build` and `npm run check:deploy` in CMD, but its property names are sourced from the **local registry preview** unless `AMANI_BACKEND_ORIGIN` is set. This preview is not valid production SEO output.

**Asset rules:** Published gallery files are generated from populated `img/rental/property-NNN/category/` folders, not property names. Empty galleries show a neutral placeholder. A static Netlify deployment cannot read new files from a local `D:\` drive after publishing: new images require a Git push/redeploy or a hosted media service.

**Security:** Do not publish `.env` files or Supabase secret keys. The *admin* is a separate site requiring its own **site-level access controls**; `robots.txt` or `noindex` do not protect it. Do not publicly expose the current `amaniadmin` Netlify proxy without access restrictions, because its function injects a privileged admin API key for upstream requests.

**SEO limitations:** No invented reviews, availability, contact details, business address, or price claims are added to schema markup. The `Organization` schema and individual property `WebPage`/`Place` descriptions are based on known source data. Consider publishing verified contact information, genuine service-area details, and useful neighborhood descriptions for stronger local SEO.

## November 2026 redirect, robots, sitemap and category corrections

- `amani-web/public/_redirects`, `public/robots.txt` and `public/sitemap.xml` are inspectable source files. The production build copies them to `dist/` then regenerates **`dist/_redirects`**, **`dist/robots.txt`** and **`dist/sitemap.xml`** from the real site settings and live property API. The root `_redirects` is an additional source reference, not the published version. **Do not upload the source directory as a static site. Deploy `dist/`.**
- Every source HTML page has a specific title, meta description, canonical, OG/Twitter tags and favicon **in its own source head** and in the built output; page bodies are left intact by the source-head patch. The legacy detail templates, unverified testimonial page, and 404 are deliberately `noindex` (not omitted by mistake).
- Stable property IDs (`/properties/amani-pNNN/`) are indexed; rental-type landing pages are generated **only** for types present in the live API's public unit classifications (`/rentals/apartments/`, `/rentals/studios/`, `/rentals/bedsitters/`, `/rentals/shops/`, `/rentals/houses/`), with a permanent `/rentals/` hub.
- The checker (`npm run check:deploy`) validates **every produced HTML file**, redirects, sitemap URL-to-page, structured data, canonical host, and referenced sitemap images, not just the homepage.
- An HTTPS production `SITE_URL` must be the *real* primary domain. Build runs against the live Render public API and rejects example.com as a production canonical domain. Actual custom-domain/DNS redirects and search-engine indexing can be verified only after deployment.
- `D:\CHECK_AMANI_SEO.cmd` runs the strict production-style build and audit after you enter the real domains. For offline preview, use `SITE_URL=https://example.com npm run build` without `AMANI_REQUIRE_LIVE_SEO`, but **never deploy that preview dist**.
- The backend's existing gallery/availability test suite has unresolved failures; this patch intentionally does not touch those business rules. The public admin proxy must also be protected before an admin site goes live.
