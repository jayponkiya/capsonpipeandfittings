/**
 * WhatsApp helpers. Every "Get Quote" action on the site goes through buildLink().
 */
import { CONFIG } from './config.js';

const number = String(CONFIG.WHATSAPP_NUMBER).replace(/\D/g, '');

if (/x/i.test(CONFIG.WHATSAPP_NUMBER)) {
  console.warn('[CAPSON] WHATSAPP_NUMBER in js/config.js is still a placeholder.');
}

/** wa.me link with a prefilled message. */
export function buildLink(message = CONFIG.DEFAULT_MESSAGE) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Point every <a data-wa="optional message"> at WhatsApp (new tab). */
export function bindLinks(root = document) {
  root.querySelectorAll('[data-wa]').forEach((link) => {
    link.href = buildLink(link.dataset.wa || undefined);
    link.target = '_blank';
    link.rel = 'noopener';
  });
}
