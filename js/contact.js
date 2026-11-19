/**
 * Contact page: WhatsApp enquiry form (name, phone, city, requirement) with inline
 * validation, plus a click-to-load Google Map (iframe only loads on request).
 */
import { CONFIG } from './config.js';
import { $ } from './utils.js';
import { buildLink } from './whatsapp.js';

/** Indian mobile/landline: 10+ digits after removing spaces, dashes, brackets and +91. */
const validPhone = (v) => {
  const digits = v.replace(/[^\d]/g, '').replace(/^91(?=\d{10}$)/, '');
  return digits.length >= 10 && digits.length <= 12;
};

const RULES = {
  name: (v) => (v.length >= 2 ? '' : 'Please enter your name.'),
  phone: (v) => (validPhone(v) ? '' : 'Please enter a valid phone number (10 digits).'),
  city: (v) => (v.length >= 2 ? '' : 'Please enter your city.'),
  requirement: (v) => (v.length >= 5 ? '' : 'Please tell us which products, sizes and quantities you need.'),
};

function initEnquiry(form) {
  const status = $('[data-form-status]', form);
  const value = (k) => String(form.elements[k].value || '').trim();

  const check = (key) => {
    const msg = RULES[key](value(key));
    $(`[data-error-for="${key}"]`, form).textContent = msg;
    form.elements[key].setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };

  form.addEventListener('input', (e) => {
    if (RULES[e.target.name] && e.target.getAttribute('aria-invalid') === 'true') check(e.target.name);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = Object.keys(RULES).filter((k) => !check(k));
    if (bad.length) {
      form.elements[bad[0]].focus();
      status.textContent = '';
      return;
    }
    const message = [
      'Hello Capson (Shreenath Polytech), I have an enquiry.',
      '',
      `Name: ${value('name')}`,
      `Phone: ${value('phone')}`,
      `City: ${value('city')}`,
      `Requirement: ${value('requirement')}`,
    ].join('\n');
    window.open(buildLink(message), '_blank', 'noopener');
    status.textContent = 'Opening WhatsApp with your message…';
  });
}

function initMap(box) {
  $('[data-map-load]', box)?.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = CONFIG.MAP_EMBED_URL;
    iframe.title = 'Map: Shreenath Polytech, Shapar, Rajkot';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    box.append(iframe);
    $('.map__placeholder', box)?.remove();
  });
}

export function initContact() {
  const form = $('[data-enquiry]');
  if (form) initEnquiry(form);
  const map = $('[data-map]');
  if (map) initMap(map);
}
