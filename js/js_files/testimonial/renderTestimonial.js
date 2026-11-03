// The former testimonial template generated invented reviews attributed to agents.
// Publish only factual enquiry information until actual verified reviews are supplied.
export function renderTestimonialMainSection({rootId}) {
  const root=document.getElementById(rootId);
  if(!root)return;
  root.innerHTML=`<section class="container-xxl py-5"><div class="container">
    <h2>Property enquiries and viewings</h2>
    <p>Amani Blue Sky Properties lists properties in Thika, Juja and nearby areas. You can review a property page, check its displayed unit availability and submit a viewing request.</p>
    <p><a class="btn btn-primary" href="/property-list/">Browse actual properties</a> <a class="btn btn-outline-primary" href="/contact/">Contact Amani</a></p>
  </div></section>`;
}
export function renderTestimonialSearchSection(){/* This retired sample search is intentionally not rendered. */}
export function bindTestimonialPageEvents(){}
