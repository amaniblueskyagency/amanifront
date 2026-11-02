import { submitPropertyVisitRequest } from '../../services/amani-api.js';

export function renderQuoteForm(selector, property, selectedUnit = null) {
  const container = document.querySelector(selector);
  if (!container) return;
  // A visit is always about a specific publicly available unit.
  if (!selectedUnit?.unit_id && !selectedUnit?.id) {
    container.innerHTML = '<p role="status">Select an available unit above to request a visit.</p>';
    return;
  }

  let userEmail = "";
  try {
    const stored = localStorage.getItem("userEmail");
    if (stored) userEmail = stored;
  } catch {}

  const propertyTitle = property?.title || "N/A";
  const contactPhone = String(property?.agents?.phone || property?.agents?.contact_json?.phone || '').replace(/[^+\d]/g, '');
  const whatsappDigits = contactPhone.startsWith('0') ? `254${contactPhone.slice(1)}` : contactPhone.replace(/^\+/, '');
  const unitCode = selectedUnit?.unit_code || selectedUnit?.unit_name || "";
  const unitStatus = selectedUnit?.public_availability_status || selectedUnit?.unit_status || "";
  const unitAvailableFrom = selectedUnit?.public_available_from || "";

  container.innerHTML = `
    <div class="amani-contact-methods">
      ${contactPhone ? `<a class="btn btn-outline-primary btn-sm" href="tel:${escapeAttr(contactPhone)}">Call Agent</a>` : ''}
      ${whatsappDigits ? `<a class="btn btn-outline-primary btn-sm" href="https://wa.me/${escapeAttr(whatsappDigits)}?text=${encodeURIComponent('Hello, I am enquiring about '+propertyTitle+(unitCode?' unit '+unitCode:''))}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}
    </div>
    <button id="send-quote-btn" class="btn btn-sm btn-outline-primary mt-2">
      View Visit Form · ${escapeHtml(unitCode)}
    </button>

    <div id="quote-form-container" class="collapse mt-3">
      <div class="alert alert-light border small mb-3">
        <div><strong>Property:</strong> ${escapeHtml(propertyTitle)}</div>
        ${unitCode ? `<div><strong>Selected Unit:</strong> ${escapeHtml(unitCode)}</div>` : ""}
        ${unitStatus ? `<div><strong>Status:</strong> ${escapeHtml(formatStatus(unitStatus))}</div>` : ""}
        ${unitAvailableFrom ? `<div><strong>Available from:</strong> ${escapeHtml(formatDate(unitAvailableFrom))}</div>` : ""}
      </div>

      <form id="quote-form">
        <input type="hidden" name="property_id" value="${escapeAttr(property?.id || "")}">
        <input type="hidden" name="property_slug" value="${escapeAttr(property?.slug || "")}">
        <input type="hidden" name="property_title" value="${escapeAttr(propertyTitle)}">
        <input type="hidden" name="unit_id" value="${escapeAttr(selectedUnit?.unit_id || selectedUnit?.id || "")}">
        <input type="hidden" name="unit_code" value="${escapeAttr(unitCode)}">

        <div class="mb-3">
          <label for="preferred-contact-method">Preferred contact method</label>
          <select id="preferred-contact-method" name="contact_method" class="form-control">
            <option value="form">Enquiry form</option><option value="phone">Phone call</option>
            <option value="whatsapp">WhatsApp</option><option value="email">Email</option>
          </select>
        </div>
        <div class="mb-2">
          <label for="user-budget">Your Budget / Offer (Ksh)</label>
          <input type="number" id="user-budget" name="budget" class="form-control" placeholder="e.g. 50000">
        </div>

        <div class="mb-2">
          <label for="user-name">Your Name</label>
          <input type="text" id="user-name" name="name" class="form-control" placeholder="Enter your name">
        </div>

        <div class="mb-2">
          <label for="user-phone">Phone / WhatsApp</label>
          <input type="tel" id="user-phone" name="phone" class="form-control" placeholder="07..." required>
        </div>

        <div class="mb-2">
          <label for="user-email">Your Email</label>
          <input type="email" id="user-email" name="email" class="form-control" placeholder="Enter your email" value="${escapeAttr(userEmail)}">
        </div>

        <div class="row g-2">
          <div class="col-md-6 mb-2">
            <label for="preferred-visit-date">Preferred Visit Date</label>
            <input type="date" id="preferred-visit-date" name="preferred_visit_date" class="form-control">
          </div>
          <div class="col-md-6 mb-2">
            <label for="preferred-visit-time">Preferred Visit Time</label>
            <input type="time" id="preferred-visit-time" name="preferred_visit_time" class="form-control">
          </div>
        </div>

        <div class="mb-2">
          <label for="user-message">Message</label>
          <textarea id="user-message" name="message" class="form-control" rows="3" placeholder="I want to book a visit for this unit."></textarea>
        </div>

        <button type="submit" class="btn btn-primary btn-sm">
          Request Visit for ${escapeHtml(unitCode)}
        </button>
      </form>

      <div id="quote-success" class="text-success mt-2" style="display:none;">
        Your visit request for ${escapeHtml(unitCode)} has been sent. The team will contact you to confirm the appointment.
      </div>
      <div id="quote-error" class="text-danger mt-2" style="display:none;">
        Error sending request.
      </div>
    </div>
  `;

  const quoteBtn = container.querySelector("#send-quote-btn");
  const quoteContainer = container.querySelector("#quote-form-container");
  const quoteForm = container.querySelector("#quote-form");
  const quoteSuccess = container.querySelector("#quote-success");
  const quoteError = container.querySelector("#quote-error");

  quoteBtn.addEventListener("click", () => quoteContainer.classList.toggle("show"));

  quoteForm.addEventListener("submit", async e => {
    e.preventDefault();
    quoteSuccess.style.display = "none";
    quoteError.style.display = "none";

    const formData = new FormData(quoteForm);
    const email = String(formData.get("email") || "").trim();

    if (email) {
      try { localStorage.setItem("userEmail", email); } catch {}
    }

    const payload = {
      formType: "PropertyUnitBooking",
      contact_method: formData.get("contact_method") || "form",
      budget: formData.get("budget") || "",
      name: formData.get("name") || "",
      phone: formData.get("phone") || "",
      email,
      message: formData.get("message") || "",
      preferred_visit_date: formData.get("preferred_visit_date") || "",
      preferred_visit_time: formData.get("preferred_visit_time") || "",
      property_id: formData.get("property_id") || "",
      property_slug: formData.get("property_slug") || "",
      property: formData.get("property_title") || propertyTitle,
      unit_id: formData.get("unit_id") || "",
      unit_code: formData.get("unit_code") || "",
      unit_status: unitStatus,
      unit_available_from: unitAvailableFrom
    };

    const submitButton = quoteForm.querySelector('button[type="submit"]');
    if (submitButton?.disabled) return;
    if (submitButton) submitButton.disabled = true;
    try {
      const result = await submitPropertyVisitRequest(payload);

      if (result?.submitted) {
        quoteSuccess.style.display = "block";
        quoteForm.reset();
        setTimeout(() => quoteContainer.classList.remove("show"), 2000);
      } else {
        quoteError.textContent = result.error || "Error sending request.";
        quoteError.style.display = "block";
      }
    } catch (err) {
      console.error(err);
      quoteError.textContent = err.message || 'Could not send visit request.';
      quoteError.style.display = "block";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function formatStatus(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, char => char.toUpperCase());
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}