/**
 * Entry point for every page.
 * 1. Injects the shared header/footer (layout.js) and the quote cart (quote.js)
 * 2. Fills data-driven text (counts, email, links)
 * 3. Loads page modules on demand (catalogue, home range, contact, flipbook, FAQ, 404, styleguide)
 * 4. Binds WhatsApp links, then starts animations once the DOM is final.
 */
import { CONFIG } from './config.js';
import { $, $$ } from './utils.js';
import { bindLinks } from './whatsapp.js';
import { renderLayout } from './layout.js';
import { initQuote } from './quote.js';
import { initTransitions } from './transitions.js';
import { finishPreloader } from './preloader.js';
import { lines, byLine, products } from '../data/products.js';

/* ---------- Data-driven text (counts, links, year) ---------- */
function fillData() {
  $$('[data-count]').forEach((el) => {
    const id = el.dataset.count;
    el.textContent = id === 'all' ? products.length : byLine(id).length;
  });
  $$('[data-email]').forEach((el) => {
    el.href = `mailto:${CONFIG.EMAIL}`;
    if (!el.textContent.trim()) el.textContent = CONFIG.EMAIL;
  });
  $$('[data-map-link]').forEach((el) => (el.href = CONFIG.MAP_URL));
  $$('[data-pdf]').forEach((el) => (el.href = CONFIG.CATALOGUE_PDF));
  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
  // "32 products" on product line cards.
  $$('[data-line-count]').forEach((el) => {
    const line = lines.find((l) => l.id === el.dataset.lineCount);
    if (line) el.textContent = `${byLine(line.id).length} products`;
  });
}

/* ---------- Boot ---------- */
async function boot() {
  finishPreloader();
  initTransitions();
  renderLayout();
  initQuote();
  fillData();

  const tasks = [];
  const catalogue = $('[data-catalogue]');
  if (catalogue) tasks.push(import('./catalogue.js').then((m) => m.initCatalogue(catalogue)));

  const range = $('[data-range-track]');
  if (range) tasks.push(import('./home.js').then((m) => m.renderRange(range)));

  if ($('[data-enquiry]') || $('[data-map]')) tasks.push(import('./contact.js').then((m) => m.initContact()));

  if ($('[data-styleguide]')) tasks.push(import('./styleguide.js').then((m) => m.initStyleguide()));
  if ($('[data-flipbook]')) tasks.push(import('./flipbook.js').then((m) => m.initFlipbook()));
  if ($('[data-faq]')) tasks.push(import('./faq.js').then((m) => m.initFaq()));
  if ($('[data-pipe-404]')) tasks.push(import('./notfound.js').then((m) => m.initNotFound()));

  await Promise.allSettled(tasks);

  // WhatsApp links after rendering so generated buttons are included.
  bindLinks();

  const { initAnimations } = await import('./animations.js');
  initAnimations();
}

boot();
