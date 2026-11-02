AMANI SEO FILES — SOURCE AND DEPLOY OUTPUT

Source files you can inspect directly:
  public/robots.txt
  public/sitemap.xml     (baseline for the 10 known property IDs)
  public/_redirects
  public/favicon.png
  public/site.webmanifest

Netlify publishes dist/ (configured by netlify.toml).
Run npm run build to copy public/ to dist/ then regenerate current
sitemap.xml, robots.txt and _redirects from the build and live API.

After production deployment, use:
  https://amanibluesky.com/robots.txt
  https://amanibluesky.com/sitemap.xml
  https://amanibluesky.com/favicon.png

For production: SITE_URL=https://amanibluesky.com and
AMANI_BACKEND_ORIGIN=https://YOUR_ACTUAL_RENDER_SERVICE.onrender.com.
Production requires live API data. The public/ baseline is not a
substitute for a fresh build after editing or adding properties.
