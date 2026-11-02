import { submitContactMessage } from '../../services/amani-api.js';

// js/js_files/contact/renderContact.js

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderContactSearchSection({ rootId, categories, locations }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const categoryOptions = [
    `<option selected>Property Type</option>`,
    ...categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.title || category.name)}</option>`)
  ].join("");

  const locationOptions = [
    `<option selected>Location</option>`,
    ...locations.map((location) => `<option value="${escapeHtml(location.id)}">${escapeHtml(location.name)}</option>`)
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

export function renderContactMainSection({ rootId, contact }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  root.innerHTML = `
    <div class="container-xxl py-5">
      <div class="container">
        <div class="text-center mx-auto mb-5 wow fadeInUp" data-wow-delay="0.1s" style="max-width: 600px;">
          <span class="section-eyebrow">Start a conversation</span>
          <h1 class="mb-3">Contact Us</h1>
          <p>Reach Amani Blue Sky Agency for inquiries about property listings, rentals, purchases, site visits, and professional support.</p>
        </div>
        <div class="row g-4 premium-contact-layout">
          <div class="col-12">
            <div class="row gy-4">
              <div class="col-md-6 col-lg-4 wow fadeIn" data-wow-delay="0.1s">
                <div class="bg-light rounded p-3">
                  <div class="d-flex align-items-center bg-white rounded p-3" style="border: 1px dashed rgba(0, 185, 142, .3)">
                    <div class="icon me-3" style="width: 45px; height: 45px;">
                      <i class="fa fa-map-marker-alt text-primary"></i>
                    </div>
                    <span>${escapeHtml(contact.address)}</span>
                  </div>
                </div>
              </div>
              <div class="col-md-6 col-lg-4 wow fadeIn" data-wow-delay="0.3s">
                <div class="bg-light rounded p-3">
                  <div class="d-flex align-items-center bg-white rounded p-3" style="border: 1px dashed rgba(0, 185, 142, .3)">
                    <div class="icon me-3" style="width: 45px; height: 45px;">
                      <i class="fa fa-envelope-open text-primary"></i>
                    </div>
                    <span>${escapeHtml(contact.email)}</span>
                  </div>
                </div>
              </div>
              <div class="col-md-6 col-lg-4 wow fadeIn" data-wow-delay="0.5s">
                <div class="bg-light rounded p-3">
                  <div class="d-flex align-items-center bg-white rounded p-3" style="border: 1px dashed rgba(0, 185, 142, .3)">
                    <div class="icon me-3" style="width: 45px; height: 45px;">
                      <i class="fa fa-phone-alt text-primary"></i>
                    </div>
                    <span>${escapeHtml(contact.phone)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-6 wow fadeInUp" data-wow-delay="0.1s">
            <iframe class="position-relative rounded w-100 h-100"
              src="${escapeHtml(contact.mapEmbed)}"
              frameborder="0" style="min-height: 400px; border:0;" allowfullscreen="" aria-hidden="false"
              tabindex="0"></iframe>
          </div>
          <div class="col-md-6">
            <div class="wow fadeInUp" data-wow-delay="0.5s">
              <p class="mb-4">Use the form below to reach Amani Blue Sky Agency. Share your name, contact details, and message, and our team will follow up to assist you.</p>
              <form>
                <div class="row g-3">
                  <div class="col-md-6">
                    <div class="form-floating">
                      <input type="text" class="form-control" id="name" placeholder="Your Name">
                      <label for="name">Your Name</label>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-floating">
                      <input type="email" class="form-control" id="email" placeholder="Your Email">
                      <label for="email">Your Email</label>
                    </div>
                  </div> 
                  <div class="col-md-6">
                    <div class="form-floating">
                      <input type="tel" class="form-control" id="phone" placeholder="Your Phone">
                      <label for="phone">Your Phone</label>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="form-floating">
                      <input type="text" class="form-control" id="subject" placeholder="Subject">
                      <label for="subject">Subject</label>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="form-floating">
                      <textarea class="form-control" placeholder="Leave a message here" id="message" style="height: 150px"></textarea>
                      <label for="message">Message</label>
                    </div>
                  </div>
                  <div class="col-12">
                    <div id="amani-contact-feedback" role="status" aria-live="polite" aria-atomic="true" hidden style="padding:12px 16px;border-radius:8px;margin-bottom:12px;font-size:14px;"></div>
                    <button class="btn btn-primary w-100 py-3" type="submit">Send Message</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindContactPageEvents({ rootId }) {
  const root = document.getElementById(rootId);
  if (!root) return;

  const form = root.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const values = {
      name: form.querySelector('#name')?.value || '',
      email: form.querySelector('#email')?.value || '',
      phone: form.querySelector('#phone')?.value || '',
      subject: form.querySelector('#subject')?.value || '',
      message: form.querySelector('#message')?.value || ''
    };
    const feedback = form.querySelector('#amani-contact-feedback');
    feedback.hidden = true;
    feedback.textContent = '';
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      await submitContactMessage(values);
      form.reset();
      feedback.textContent = "Thank you. Your message has been received and our team will get back to you.";
      feedback.style.cssText = 'padding:12px 16px;border-radius:8px;margin-bottom:12px;font-size:14px;background:#e7f7ef;color:#176b45;border:1px solid #a7dec3;';
      feedback.hidden = false;
    } catch (error) {
      feedback.textContent = error.message || "Unable to send your message. Please try again.";
      feedback.style.cssText = 'padding:12px 16px;border-radius:8px;margin-bottom:12px;font-size:14px;background:#fff0f0;color:#a32d32;border:1px solid #f1c0c0;';
      feedback.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = 'Send Message';
    }
  });
}