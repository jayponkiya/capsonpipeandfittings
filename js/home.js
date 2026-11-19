/**
 * Home page: renders the horizontal "range" strip from product data.
 * Each item deep-links to its category page, opening the spec dialog (#slug).
 */
import { getProduct, getLine } from '../data/products.js';
import { esc } from './utils.js';

const FEATURED = [
  'upvc-pipe-sch-40',
  'upvc-ball-valve-short',
  'upvc-tank-nipple-thread',
  'upvc-brass-tee',
  'cpvc-pipe-sdr-11',
  'cpvc-union',
  'cpvc-brass-mta',
  'cpvc-ball-valve',
  'garden-colour-virgin',
  'garden-blue-metallic',
  'garden-level-pipe',
];

export function renderRange(track) {
  track.innerHTML = FEATURED.map(getProduct)
    .filter(Boolean)
    .map((p) => {
      const cat = getLine(p.line);
      return `
        <a class="range__item" href="${cat.page}#${p.slug}">
          <figure class="range__figure">
            <img src="${p.image}" alt="${esc(p.name)}" width="300" height="400" loading="lazy" decoding="async">
            <figcaption>${esc(p.name)}<small>${esc(cat.name)}</small></figcaption>
          </figure>
        </a>`;
    })
    .join('');
}
