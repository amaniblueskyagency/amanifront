// js/main.js

/* ---------------------------------------------------------
   Imports
--------------------------------------------------------- */
import { initAll } from "./helper_main.js";

/* ---------------------------------------------------------
   DOM Utilities & jQuery Wrappers
--------------------------------------------------------- */
(function ($) {
  "use strict";


  const spinner = () => {
    setTimeout(() => {
      const s = $("#spinner");
      if (s.length > 0) s.removeClass("show");
    }, 1);
  };
  spinner();

  if (typeof WOW !== "undefined") {
    try {
      new WOW().init();
    } catch (e) {
      console.warn("WOW init failed", e);
    }
  }

  $(window).scroll(() => {
    if ($(window).scrollTop() > 45) {
      $(".nav-bar").addClass("sticky-top");
    } else {
      $(".nav-bar").removeClass("sticky-top");
    }
  });

  $(window).scroll(() => {
    if ($(window).scrollTop() > 300) {
      $(".back-to-top").fadeIn("slow");
    } else {
      $(".back-to-top").fadeOut("slow");
    }
  });

  $(".back-to-top").click(() => {
    $("html, body").animate({ scrollTop: 0 }, 1500, "easeInOutExpo");
    return false;
  });
})(jQuery);

/* ---------------------------------------------------------
   Owl Carousel Initializer
--------------------------------------------------------- */
function initOwlCarousels() {
  if (!window.jQuery || typeof jQuery.fn.owlCarousel !== "function") {
    // Local/offline preview: leave the CSS fallback grid visible; do not retry forever.
    return;
  }

  console.log("🟢 OwlCarousel initialized!");

  const headerCarousel = jQuery(".header-carousel");
  if (headerCarousel.length && !headerCarousel.hasClass("owl-loaded")) {
    headerCarousel.owlCarousel({
      autoplay: true,
      smartSpeed: 1000,
      items: 1,
      dots: true,
      loop: true
    });
  }

  const testimonialCarousel = jQuery(".testimonial-carousel");
  if (testimonialCarousel.length && !testimonialCarousel.hasClass("owl-loaded")) {
    testimonialCarousel.owlCarousel({
      autoplay: true,
      smartSpeed: 1000,
      center: true,
      dots: true,
      loop: true,
      margin: 25,
      responsive: {
        0: { items: 1 },
        576: { items: 1 },
        768: { items: 2 },
        992: { items: 3 }
      }
    });
  }
}

/* ---------------------------------------------------------
   DOMContentLoaded — Global Init
--------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  initOwlCarousels();

  const params = new URLSearchParams(window.location.search);
  const stablePathMatch = window.location.pathname.match(/^\/properties\/(amani-p\d{3,})\/?$/i);
  const propertyId = stablePathMatch?.[1] || params.get("slug") || params.get("id") || null;

  try {
    await initAll(propertyId);
    // Some page sections are generated after DOMContentLoaded. Initialize them now.
    initOwlCarousels();
  } catch (err) {
    console.error("❌ Error initializing app:", err);
  }
});