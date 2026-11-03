import { fetchNavigation, fetchPropertyCategories, fetchLocations, submitPropertyListingEnquiry } from '../../services/amani-api.js';

export async function renderNavBar() {
  const container = document.getElementById('nav-bar-section');
  if (!container) return;

  try {
    const payload = await fetchNavigation();
    const data = payload?.navBar;
    if (!data) throw new Error('No Amani navigation record is configured in the database.');

    const brandHTML = `
      <a href="${escapeAttr(data.brand?.link || 'index.html')}" class="navbar-brand d-flex align-items-center text-center">
        ${data.brand?.icon?.src ? `<div class="icon p-2 me-2"><img class="img-fluid" src="${escapeAttr(data.brand.icon.src)}" alt="${escapeAttr(data.brand.icon.alt || data.brand.title || 'Amani')}" style="${escapeAttr(data.brand.icon.style || '')}"></div>` : ''}
        <h1 class="m-0 text-primary">${escapeHtml(data.brand?.title || '')}</h1>
      </a>`;

    const validHref = value => typeof value === 'string' && (/^(\/|https:\/\/|mailto:|tel:)/i.test(value) || /^[a-z0-9_/-]+\.html(?:[?#].*)?$/i.test(value));
    const isRetiredReview = link => /testimonial|review/i.test(String(link?.href || ''));
    const itemsHTML = (data.items || []).filter(it=>!isRetiredReview(it)).map((it) => {
      if (it.type === 'link') return validHref(it.href) ? `<a href="${escapeAttr(it.href)}" class="${escapeAttr(it.classes || 'nav-item nav-link')}">${escapeHtml(it.text)}</a>` : '';
      if (it.type === 'dropdown') {
        const inner = (it.items || []).filter(ii=>!isRetiredReview(ii) && validHref(ii.href)).map(ii => `<a href="${escapeAttr(ii.href)}" class="dropdown-item">${escapeHtml(ii.text)}</a>`).join('');
        return inner ? `<div class="nav-item dropdown"><a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-expanded="false">${escapeHtml(it.text)}</a><div class="${escapeAttr(data.dropdownMenuClasses || 'dropdown-menu rounded-0 m-0')}">${inner}</div></div>` : '';
      }
      return '';
    }).join('');

    const cta = data.cta || {};
    container.innerHTML = `<div class="${escapeAttr(data.rootClasses)}" id="__nav-bar-root"><nav class="${escapeAttr(data.navClasses)}">${brandHTML}<button type="button" class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navbarCollapse"><span class="navbar-toggler-icon"></span></button><div class="collapse navbar-collapse" id="navbarCollapse"><div class="navbar-nav ms-auto">${itemsHTML}</div>${cta.text ? `<a href="${escapeAttr(cta.href || '#list-property')}" id="amani-list-property-cta" class="${escapeAttr(cta.classes || '')}">${escapeHtml(cta.text)}</a>` : ''}</div></nav></div>`;


    const listCta = container.querySelector('#amani-list-property-cta');
    if (listCta) {
      listCta.addEventListener('click', async (event) => {
        if ((listCta.getAttribute('href') || '').includes('list-property') || listCta.textContent.toLowerCase().includes('list')) {
          event.preventDefault();
          await openListingEnquiryModal();
        }
      });
    }

    if (window.AOS) window.AOS.refresh();
    if (window.WOW) { try { new window.WOW().init(); } catch {} }
  } catch (error) {
    console.error('Amani navigation error:', error);
    container.innerHTML = `<div class="container py-3 text-center text-danger">Unable to load site navigation.</div>`;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
function escapeAttr(value) { return escapeHtml(value); }


function ensureListingModalStyles() {
  if (document.getElementById('amani-list-property-modal-styles')) return;
  const style = document.createElement('style');
  style.id = 'amani-list-property-modal-styles';
  style.textContent = `
    body.amani-modal-open{overflow:hidden!important}
    .amani-list-modal{position:fixed!important;inset:0!important;z-index:2147483000!important;display:none!important;align-items:center!important;justify-content:center!important;padding:22px!important}
    .amani-list-modal.open{display:flex!important}
    .amani-list-modal__backdrop{position:absolute!important;inset:0!important;background:rgba(8,27,45,.72)!important;backdrop-filter:blur(4px)}
    .amani-list-modal__dialog{position:relative!important;z-index:1!important;width:min(760px,calc(100vw - 32px))!important;max-height:calc(100vh - 44px)!important;overflow:auto!important;padding:30px!important;margin:0!important;border:0!important;border-radius:18px!important;background:#fff!important;box-shadow:0 30px 80px rgba(4,24,42,.3)!important}
    .amani-list-modal__close{position:absolute!important;top:16px!important;right:18px!important;width:38px!important;height:38px!important;border:0!important;border-radius:50%!important;background:#eaf4ff!important;color:#173653!important;font-size:25px!important;line-height:1!important;cursor:pointer!important}
    .amani-list-modal__intro{padding-right:48px!important;margin-bottom:23px!important}
    .amani-list-modal__intro>span{color:#1466b8!important;font-size:12px!important;font-weight:700!important;letter-spacing:.1em!important;text-transform:uppercase!important}
    .amani-list-modal__intro h2{margin:6px 0 8px!important;color:#0e3157!important;font-size:30px!important;line-height:1.15!important}
    .amani-list-modal__intro p{margin:0!important;color:#687686!important;line-height:1.6!important}
    .amani-list-form-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:15px!important}
    .amani-list-form-grid label{display:block!important;margin:0!important;color:#29435c!important;font-size:13px!important;font-weight:600!important}
    .amani-list-form-grid label>span{display:block!important;margin-bottom:6px!important}
    .amani-list-form-grid input,.amani-list-form-grid select,.amani-list-form-grid textarea{display:block!important;width:100%!important;min-height:44px!important;margin:0!important;border:1px solid #dbe6e2!important;border-radius:9px!important;background:#fbfdfc!important;color:#18324c!important;padding:11px 12px!important;outline:none!important;font:inherit!important;box-sizing:border-box!important}
    .amani-list-form-grid textarea{min-height:110px!important;resize:vertical!important}
    .amani-list-form-grid input:focus,.amani-list-form-grid select:focus,.amani-list-form-grid textarea:focus{border-color:#1466b8!important;box-shadow:0 0 0 3px rgba(20,102,184,.13)!important}
    .amani-list-form-wide{grid-column:1/-1!important}
    .amani-list-form-submit{display:block!important;width:100%!important;margin-top:16px!important;padding:13px 18px!important;border:0!important;border-radius:9px!important;background:#1466b8!important;color:#fff!important;font-weight:700!important;cursor:pointer!important}
    .amani-list-form-submit:disabled{opacity:.65!important}
    .amani-list-form-feedback{min-height:0!important;margin-top:12px!important;font-size:13px!important}
    .amani-list-form-feedback.success{padding:10px 12px!important;border-radius:8px!important;background:#e9f8f2!important;color:#08704f!important}
    .amani-list-form-feedback.error{padding:10px 12px!important;border-radius:8px!important;background:#fff0f0!important;color:#9d2929!important}
    .amani-list-form-privacy{margin:10px 0 0!important;text-align:center!important;color:#7b8792!important;font-size:11px!important}
    @media(max-width:650px){.amani-list-modal{padding:10px!important}.amani-list-modal__dialog{padding:24px 18px!important}.amani-list-form-grid{grid-template-columns:1fr!important}.amani-list-form-wide{grid-column:auto!important}.amani-list-modal__intro h2{font-size:25px!important}}
  `;
  document.head.appendChild(style);
}

async function openListingEnquiryModal() {
  ensureListingModalStyles();
  let host = document.getElementById('amani-list-property-modal');
  if (!host) {
    host = document.createElement('div');
    host.id = 'amani-list-property-modal';
    host.className = 'amani-list-modal';
    host.innerHTML = `
      <div class="amani-list-modal__backdrop" data-close-listing></div>
      <section class="amani-list-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="amani-list-modal-title">
        <button class="amani-list-modal__close" type="button" data-close-listing aria-label="Close">&times;</button>
        <div class="amani-list-modal__intro">
          <span>List with Amani</span>
          <h2 id="amani-list-modal-title">Tell us about your property</h2>
          <p>Share the essentials. Our team will review the details and contact you about the next step.</p>
        </div>
        <form id="amani-list-property-form">
          <div class="amani-list-form-grid">
            <label><span>Name *</span><input name="owner_name" autocomplete="name" maxlength="120" required></label>
            <label><span>Phone *</span><input name="phone" type="tel" autocomplete="tel" maxlength="30" required></label>
            <label><span>Email</span><input name="email" type="email" autocomplete="email" maxlength="254"></label>
            <label><span>Property type *</span><select name="property_category_id" required><option value="">Loading…</option></select></label>
            <label><span>Location *</span><select name="location_id" required><option value="">Loading…</option></select></label>
            <label><span>Stories *</span><select name="stories" required><option value="">Select stories</option>${Array.from({length: 20}, (_,i) => `<option value="${i+1}">${i+1}${i === 0 ? ' story' : ' stories'}</option>`).join('')}<option value="21">21+ stories</option></select></label>
            <label class="amani-list-form-wide"><span>Brief property details *</span><textarea name="details" rows="4" maxlength="3000" placeholder="For example: property condition, approximate size, number of units, access or notable features." required></textarea></label>
          </div>
          <div id="amani-list-property-feedback" class="amani-list-form-feedback" aria-live="polite"></div>
          <button class="amani-list-form-submit" type="submit">Send property details</button>
          <p class="amani-list-form-privacy">Your details are used only to respond to this property-listing enquiry.</p>
        </form>
      </section>`;
    document.body.appendChild(host);
    host.querySelectorAll('[data-close-listing]').forEach(el => el.addEventListener('click', () => closeListingModal(host)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && host.classList.contains('open')) closeListingModal(host);
    });
  }

  host.classList.add('open');
  document.body.classList.add('amani-modal-open');
  const form = host.querySelector('#amani-list-property-form');
  const feedback = host.querySelector('#amani-list-property-feedback');
  const categorySelect = form.elements.property_category_id;
  const locationSelect = form.elements.location_id;

  try {
    const [categories, locations] = await Promise.all([fetchPropertyCategories(), fetchLocations()]);
    categorySelect.innerHTML = `<option value="">Select property type</option>${(categories || []).map(x => `<option value="${escapeAttr(x.id)}">${escapeHtml(x.title || x.name || '')}</option>`).join('')}`;
    locationSelect.innerHTML = `<option value="">Select location</option>${(locations || []).map(x => `<option value="${escapeAttr(x.id)}">${escapeHtml(x.name || '')}</option>`).join('')}`;
  } catch (error) {
    feedback.textContent = 'Unable to load property types and locations. Please try again.';
    feedback.className = 'amani-list-form-feedback error';
  }

  if (!form.dataset.bound) {
    form.dataset.bound = 'true';
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      feedback.textContent = '';
      feedback.className = 'amani-list-form-feedback';
      button.disabled = true;
      button.textContent = 'Sending…';
      try {
        const values = Object.fromEntries(new FormData(form).entries());
        if (values.stories === '21') values.stories = 21;
        await submitPropertyListingEnquiry(values);
        form.reset();
        feedback.textContent = 'Thank you. Your property details have been received and our team will contact you.';
        feedback.className = 'amani-list-form-feedback success';
      } catch (error) {
        feedback.textContent = error.message || 'Unable to submit your property details.';
        feedback.className = 'amani-list-form-feedback error';
      } finally {
        button.disabled = false;
        button.textContent = 'Send property details';
      }
    });
  }
  form.elements.owner_name?.focus();
}

function closeListingModal(host) {
  host.classList.remove('open');
  document.body.classList.remove('amani-modal-open');
}
