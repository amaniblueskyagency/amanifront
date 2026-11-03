// js/js_files/contact/contact.js

import {
  fetchPropertyCategories,
  fetchLocations,
  fetchFooter
} from "../../services/amani-api.js";

import {
  renderContactSearchSection,
  renderContactMainSection,
  bindContactPageEvents
} from "./renderContact.js";

// Contact data comes from the public Amani site configuration. Do not
// advertise a guessed office address or an unverified mailbox on the website.
const CONTACT_FALLBACK = {
  title: 'Contact Amani',
  address: '', email: '',
  phone: '+254 797 674649',
  mapEmbed: ''
};

export async function initContactPage() {
  const mainRoot = document.getElementById("contact-main-section");
  if (!mainRoot) return;

  try {
    const [categoriesRaw, locationsRaw, footerResponse] = await Promise.all([
      fetchPropertyCategories(),
      fetchLocations(),
      fetchFooter().catch(() => null)
    ]);
    const savedContact = footerResponse?.footer?.columns?.contact || {};
    const contact = {
      ...CONTACT_FALLBACK,
      address: String(savedContact.address || '').trim(),
      phone: String(savedContact.phone || CONTACT_FALLBACK.phone).trim(),
      email: String(savedContact.email || '').trim(),
      // Use a verified map stored by the site admin, not a guessed location.
      mapEmbed: String(savedContact.mapEmbed || '').trim()
    };

    renderContactSearchSection({
      rootId: "contact-search-section",
      categories: categoriesRaw,
      locations: locationsRaw
    });

    renderContactMainSection({
      rootId: "contact-main-section",
      contact
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