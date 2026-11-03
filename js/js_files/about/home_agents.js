// Homepage team cards sourced from the existing read-only site API.
// Avoids public-facing "Full Name / Designation" placeholder cards.
import { fetchAgents } from '../../services/amani-api.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export async function renderHomeAgents() {
  const root = document.getElementById('homepage-agent-cards');
  const section = document.getElementById('homepage-team-section');
  if (!root) return;
  try {
    const agents = (await fetchAgents()).filter(person => person?.name && person.is_synthetic !== true && (person.image || person.avatar)).slice(0, 4);
    if (!agents.length) {
      root.innerHTML = '';
      if(section)section.hidden=true;
      return;
    }
    if(section)section.hidden=false;
    root.innerHTML = agents.map((person, index) => {
      const phone = String(person.phone || '').replace(/[^+\d]/g, '');
      const email = String(person.email || '');
      const contact = [
        phone ? `<a class="btn btn-square mx-1" href="tel:${escapeHtml(phone)}" aria-label="Call ${escapeHtml(person.name)}"><i class="fa fa-phone-alt"></i></a>` : '',
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `<a class="btn btn-square mx-1" href="mailto:${escapeHtml(email)}" aria-label="Email ${escapeHtml(person.name)}"><i class="fa fa-envelope"></i></a>` : ''
      ].join('');
      return `<div class="col-lg-3 col-md-6 wow fadeInUp" data-wow-delay="${0.1 + index*0.15}s"><article class="team-item rounded overflow-hidden">
        <div class="position-relative"><img class="img-fluid" loading="lazy" src="${escapeHtml(person.image || person.avatar)}" alt="${escapeHtml(person.name)}">${contact ? `<div class="position-absolute start-50 top-100 translate-middle d-flex align-items-center">${contact}</div>` : ''}</div>
        <div class="text-center p-4 mt-3"><h5 class="fw-bold mb-0">${escapeHtml(person.name)}</h5><small>${escapeHtml(person.role || 'Property consultant')}</small></div>
      </article></div>`;
    }).join('');
    if (window.WOW) { try { new window.WOW().init(); } catch {} }
  } catch (error) {
    console.error('Unable to load homepage agents:', error);
    root.innerHTML = '';
    if(section)section.hidden=true;
  }
}
