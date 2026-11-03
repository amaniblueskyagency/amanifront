import { renderTestimonialMainSection } from './renderTestimonial.js';
// No fabricated client reviews. A genuine feedback source must be explicitly supplied before reviews can be published.
export async function initTestimonialPage() {
  renderTestimonialMainSection({rootId:'testimonial-main-section',testimonials:[]});
}
