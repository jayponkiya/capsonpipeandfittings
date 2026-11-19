/**
 * Styleguide page helpers: live colour values + contrast ratios, and real
 * product cards / spec table rendered from data/products.js.
 */
import { $, $$ } from './utils.js';
import { getProduct } from '../data/products.js';
import { cardTemplate, tableTemplate } from './catalogue.js';

/** WCAG relative luminance of an "rgb(r, g, b)" string. */
function luminance(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const toHex = (rgb) =>
  '#' + rgb.match(/\d+/g).slice(0, 3).map((v) => Number(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const grade = (r) => (r >= 4.5 ? 'AA' : r >= 3 ? 'AA large' : 'fail');

function swatches() {
  $$('[data-swatch]').forEach((li) => {
    const chip = $('[data-chip]', li);
    chip.style.setProperty('background', `var(${li.dataset.swatch})`);
    const rgb = getComputedStyle(chip).backgroundColor;
    const L = luminance(rgb);
    const onWhite = ratio(L, 1);
    const onBlack = ratio(L, luminance('rgb(10, 10, 10)'));
    $('[data-hex]', li).textContent = toHex(rgb);
    $('[data-contrast]', li).textContent =
      `White text ${onWhite.toFixed(2)}:1 (${grade(onWhite)}) · on black ${onBlack.toFixed(2)}:1 (${grade(onBlack)})`;
  });
}

export function initStyleguide() {
  swatches();
  const cards = $('[data-sg-cards]');
  if (cards) {
    cards.innerHTML = ['upvc-ball-valve-short', 'cpvc-brass-mta', 'upvc-tank-nipple-thread', 'garden-colour-virgin']
      .map(getProduct)
      .map(cardTemplate)
      .join('');
  }
  const table = $('[data-sg-table]');
  if (table) table.innerHTML = tableTemplate(getProduct('upvc-plain-elbow'));
  $('[data-sg-form]')?.addEventListener('submit', (e) => e.preventDefault());
}
