import { fetchPropertyHead } from "../../services/amani-api.js";

export async function renderPropertyHeader(propertyId) {
  const container = document.getElementById("property-header-section");
  if (!container || !propertyId) return;

  try {
    const data = await fetchPropertyHead(propertyId);
    if (!data) {
      console.warn("⚠️ No property header found for:", propertyId);
      return;
    }

    const containerClass = data.container_class || "container-fluid header bg-white p-0";
    const title = data.title || "";
    const highlight = data.highlight || "";
    const titleLower = String(data.title || '').toLowerCase();
    const highlights = [
      [/cravers/, 'Near St. Luke Hotel, with ground-floor parking and a choice of one- and two-bedroom apartments.'],
      [/makongeni/, 'Studios and one-bedroom living in Makongeni, with shops conveniently located on the ground floor.'],
      [/heights/, 'Section 9 residences offering studios, one- and two-bedroom homes with biometric entry and ground-floor parking.'],
      [/muhinja/, 'Near Gresta University in Phase 13, with lift access, CCTV, biometric security and basement parking.'],
      [/harmony/, 'Across from Juja City Mall on K Road, with studio and one-bedroom options, secure access and compound parking.'],
      [/vinny/, 'One-bedroom residences in Kibute, Weteithie, featuring CCTV, biometric access and ground-floor parking.'],
      [/amazon/, 'Gated K Road apartments and shops near the underpass and Chief’s Office, close to the main road.'],
      [/viewland/, 'Section 9, Thika living with three-bedroom residences, bedsitters, a gated compound and security lighting.'],
      [/juja farm/, 'Bedsitters along the Juja Farm tarmac road near Rubis Petrol Station, in a secured setting.'],
      [/abby/, 'One-bedroom apartments in Ngoingwa, Tora, offering ground-floor parking and CCTV security.']
    ];
    const matchingHighlight = highlights.find(([match]) => match.test(titleLower));
    const subtitle = matchingHighlight?.[1] || data.subtitle || 'Discover this property’s accommodation and facilities.';
    const buttonText = "Explore This Property";
    const buttonLink = "#property-details-container";

    // Prefer actual current-property images first.
    // Falls back to existing header carousel images only if needed.
    const carouselImages = resolveHeaderImages(data);

    const safeTitle = highlight && title.includes(highlight)
      ? escapeHtml(title).replace(
          escapeHtml(highlight),
          `<span class="text-primary">${escapeHtml(highlight)}</span>`
        )
      : escapeHtml(title);

    const slidesHtml = carouselImages.map((img) => `
      <div class="owl-carousel-item">
        <img class="img-fluid" src="${escapeAttr(img)}" alt="">
      </div>
    `).join("");

    container.innerHTML = `
      <section id="amani-property-upper" style="
        width:min(1400px,calc(100% - 48px));
        margin:22px auto 30px;
        display:grid;
        grid-template-columns:minmax(0,44%) minmax(0,56%);
        min-height:390px;
        max-height:430px;
        overflow:hidden;
        background:linear-gradient(145deg,#ffffff 30%,#eef7fc 100%);
        border:1px solid #d9e7f3;
        border-radius:16px;
        box-shadow:0 14px 38px rgba(18,38,58,.08);
      ">
        <div style="
          display:flex;
          align-items:center;
          min-width:0;
          padding:44px 46px;
        ">
          <div style="width:100%;max-width:540px;">
            <span class="section-eyebrow">Explore this property</span>
            <h1 style="
              margin:0;
              color:#102f52;
              font-size:clamp(34px,3.1vw,52px);
              font-weight:700;
              line-height:1.08;
              letter-spacing:-.025em;
            ">${safeTitle}</h1>
            ${subtitle ? `<p style="
              max-width:520px;
              margin:22px 0 0;
              color:#65717d;
              font-size:15px;
              line-height:1.7;
            ">${escapeHtml(subtitle)}</p>` : ""}
            ${buttonText ? `<a href="${escapeAttr(buttonLink)}" class="btn btn-primary py-3 px-5 mt-4">${escapeHtml(buttonText)}</a>` : ""}
          </div>
        </div>

        <div style="
          min-width:0;
          height:430px;
          overflow:hidden;
          background:#eef3f2;
        ">
          <div class="owl-carousel header-carousel" style="height:430px;">
            ${slidesHtml}
          </div>
        </div>
      </section>
    `;

    const upper = container.querySelector("#amani-property-upper");
    const upperCarousel = upper?.querySelector(".header-carousel");
    if (upperCarousel) {
      upperCarousel.querySelectorAll(".owl-carousel-item").forEach(item => {
        item.style.height = "430px";
        const image = item.querySelector("img");
        if (image) {
          image.style.width = "100%";
          image.style.height = "430px";
          image.style.objectFit = "cover";
          image.style.objectPosition = "center";
          image.style.display = "block";
        }
      });

      const applyUpperLayout = () => {
        if (!upper) return;
        if (window.innerWidth <= 991) {
          upper.style.gridTemplateColumns = "1fr";
          upper.style.maxHeight = "none";
          upper.style.minHeight = "0";
          upper.style.width = "min(820px, calc(100% - 30px))";
          upperCarousel.style.height = window.innerWidth <= 575 ? "260px" : "330px";
          upperCarousel.querySelectorAll(".owl-carousel-item, img").forEach(el => {
            el.style.height = window.innerWidth <= 575 ? "260px" : "330px";
          });
        } else {
          upper.style.gridTemplateColumns = "minmax(0,44%) minmax(0,56%)";
          upper.style.maxHeight = "430px";
          upper.style.minHeight = "390px";
          upper.style.width = "min(1400px, calc(100% - 48px))";
          upperCarousel.style.height = "430px";
          upperCarousel.querySelectorAll(".owl-carousel-item, img").forEach(el => {
            el.style.height = "430px";
          });
        }
      };

      applyUpperLayout();
      window.addEventListener("resize", applyUpperLayout, { passive: true });
    }

    if (window.jQuery) {
      const $carousel = jQuery(container).find(".header-carousel");

      if ($carousel.length) {
        try {
          $carousel.trigger("destroy.owl.carousel");
          $carousel.find(".owl-stage-outer").children().unwrap();
          $carousel.removeClass("owl-center owl-loaded owl-text-select-on");
        } catch {}

        $carousel.owlCarousel({
          autoplay: true,
          smartSpeed: 1000,
          dots: true,
          loop: carouselImages.length > 1,
          items: 1
        });
      }
    }
  } catch (err) {
    console.error("❌ renderPropertyHeader error:", err);
  }
}

function resolveHeaderImages(data) {
  const images = [];

  // 1. Prefer actual property gallery images if present
  if (Array.isArray(data.gallery)) {
    for (const item of data.gallery) {
      if (typeof item === "string" && item.trim()) {
        images.push(item.trim());
      } else if (item && typeof item === "object") {
        const src =
          item.src ||
          item.image ||
          item.url ||
          item.path ||
          "";
        if (src) images.push(String(src).trim());
      }
    }
  }

  // 2. Fallback to carousel_images if gallery is absent/empty
  if (!images.length && Array.isArray(data.carousel_images)) {
    for (const item of data.carousel_images) {
      if (typeof item === "string" && item.trim()) {
        images.push(item.trim());
      } else if (item && typeof item === "object") {
        const src =
          item.src ||
          item.image ||
          item.url ||
          item.path ||
          "";
        if (src) images.push(String(src).trim());
      }
    }
  }

  // 3. Last fallback so the markup does not break
  if (!images.length) {
    const fallback =
      data.thumbnail ||
      data.image ||
      data.cover_image ||
      "";
    if (fallback) images.push(String(fallback).trim());
  }

  // Remove empties + duplicates, keep order
  return [...new Set(images.filter(Boolean))];
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