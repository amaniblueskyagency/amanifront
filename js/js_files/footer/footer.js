import { fetchFooter } from '../../services/amani-api.js';

export async function renderFooter() {
  const container = document.getElementById('footer-section');
  if (!container) return;

  try {
    const payload = await fetchFooter();
    const data = payload?.footer;
    if (!data) throw new Error('No Amani footer record is configured in the database.');

    const contact = data.columns?.contact || {};
    const quick = data.columns?.quickLinks || { links: [] };
    const gallery = data.columns?.gallery || { images: [] };
    const newsletter = data.columns?.newsletter || {};

    const contactHTML = `<div class="col-lg-3 col-md-6"><h5 class="text-white mb-4">${escapeHtml(contact.title || '')}</h5>${contact.address ? `<p class="mb-2"><i class="fa fa-map-marker-alt me-3"></i>${escapeHtml(contact.address)}</p>` : ''}${contact.phone ? `<p class="mb-2"><i class="fa fa-phone-alt me-3"></i>${escapeHtml(contact.phone)}</p>` : ''}${contact.email ? `<p class="mb-2"><i class="fa fa-envelope me-3"></i>${escapeHtml(contact.email)}</p>` : ''}<div class="d-flex pt-2">${(contact.social || []).filter(s=>/^(https:\/\/|mailto:|tel:)/i.test(String(s.href||''))).map(s => `<a class="btn btn-outline-light btn-social" href="${escapeAttr(s.href || '#')}"><i class="${escapeAttr(s.icon || '')}"></i></a>`).join('')}</div></div>`;
    const quickHTML = `<div class="col-lg-3 col-md-6"><h5 class="text-white mb-4">${escapeHtml(quick.title || '')}</h5>${(quick.links || []).filter(l=>(/^(\/|https:\/\/)/i.test(String(l.href||'')) || /^[a-z0-9_/-]+\.html(?:[?#].*)?$/i.test(String(l.href||''))) && !/testimonial|review/i.test(String(l.href))).map(l => `<a class="btn btn-link text-white-50" href="${escapeAttr(l.href || '#')}">${escapeHtml(l.text)}</a>`).join('')}</div>`;
    const galleryHTML = `<div class="col-lg-3 col-md-6"><h5 class="text-white mb-4">${escapeHtml(gallery.title || '')}</h5><div class="row g-2 pt-2">${(gallery.images || []).map(src => `<div class="col-4"><img class="img-fluid rounded bg-light p-1" src="${escapeAttr(src)}" alt="Amani property"></div>`).join('')}</div></div>`;
    const newsletterHTML = `<div class="col-lg-3 col-md-6"><h5 class="text-white mb-4">Contact Amani Blue Sky</h5><p>Ask about a property, an available unit or a viewing.</p><a class="btn btn-outline-light" href="/contact/">Contact the property team</a></div>`;

    container.innerHTML = `<div class="${escapeAttr(data.rootClasses)}" data-wow-delay="${escapeAttr(data.wowDelay || '')}"><div class="${escapeAttr(data.innerContainerClasses)}"><div class="row g-5">${contactHTML}${quickHTML}${galleryHTML}${newsletterHTML}</div></div><div class="container"><div class="copyright"><div class="row"><div class="col-md-6 text-center text-md-start mb-3 mb-md-0">${sanitizeHtml(data.copyright?.leftHtml || '')}</div><div class="col-md-6 text-center text-md-end"><div class="footer-menu">${(data.copyright?.rightMenu || []).filter(m=>(/^(\/|https:\/\/)/i.test(String(m.href||'')) || /^[a-z0-9_/-]+\.html(?:[?#].*)?$/i.test(String(m.href||''))) && !/testimonial|review/i.test(String(m.href))).map(m => `<a href="${escapeAttr(m.href || '#')}">${escapeHtml(m.text)}</a>`).join('')}</div></div></div></div></div></div>`;

    if (window.AOS) window.AOS.refresh();
    if (window.WOW) { try { new window.WOW().init(); } catch {} }
  } catch (error) {
    console.error('Amani footer error:', error);
    container.innerHTML = `<div class="container py-3 text-center text-danger">Unable to load site footer.</div>`;
  }
}

function sanitizeHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  template.content.querySelectorAll('script,style,iframe,object,embed,form').forEach(node => node.remove());
  template.content.querySelectorAll('*').forEach(node => {
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || (['href','src'].includes(name) && value.startsWith('javascript:'))) node.removeAttribute(attr.name);
    }
  });
  return template.innerHTML;
}
function escapeHtml(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function escapeAttr(value) { return escapeHtml(value); }
