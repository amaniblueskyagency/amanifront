// js/js_files/contact/contact.js

import {
  fetchPropertyCategories,
  fetchLocations
} from "../../services/amani-api.js";

import {
  renderContactSearchSection,
  renderContactMainSection,
  bindContactPageEvents
} from "./renderContact.js";

const CONTACT_INFO = {
  title: "Get In Touch",
  address: "Kigio Plaza , Thika, Kenya",
  phone: "+254 797 674649",
  email: "info@amaniblueskyagency.com",
  mapEmbed: "https://www.google.com/maps?q=Kigio%20Plaza%20Thika%20Kenya&output=embed"
};

export async function initContactPage() {
  const mainRoot = document.getElementById("contact-main-section");
  if (!mainRoot) return;

  try {
    const [categoriesRaw, locationsRaw] = await Promise.all([
      fetchPropertyCategories(),
      fetchLocations()
    ]);

    renderContactSearchSection({
      rootId: "contact-search-section",
      categories: categoriesRaw,
      locations: locationsRaw
    });

    renderContactMainSection({
      rootId: "contact-main-section",
      contact: CONTACT_INFO
    });

    bindContactPageEvents({
      rootId: "contact-main-section"
    });
  } catch (err) {
    console.error("❌ initContactPage error:", err);

    mainRoot.innerHTML = `
      <div class="container-xxl py-5">
        <div class="container">
          <div class="alert alert-danger mb-0">
            Failed to load contact information.
          </div>
        </div>
      </div>
    `;
  }
}