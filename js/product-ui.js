/**
 * Shared product templates: cards (overview grid), panels (line pages),
 * quote-ready spec tables (qty stepper + Add to Quote per row), swatches.
 * Used by catalogue.js (pages + detail modal) and styleguide.js.
 */
import { CONFIG } from './config.js';
import { getLine, rowLabel, sizeRange } from '../data/products.js';
import { esc, ICONS } from './utils.js';
import { buildLink } from './whatsapp.js';

export const RATE_NOTE = 'Rates in INR, GST extra, subject to change.';

/**
 * Responsive product image: 400px and 800px files (800 = 2x of a 400px card).
 * `sizes` tells the browser how wide the image is shown so it never upscales.
 */
export function productImg(p, { sizes, alt = p.name, lazy = true, width = 400 } = {}) {
  const small = p.image.replace(/\.webp$/, '-400.webp');
  return `<img src="${small}" srcset="${small} 400w, ${p.image} 800w" sizes="${sizes}" alt="${esc(alt)}" width="${width}" height="${width}"${lazy ? ' loading="lazy"' : ''} decoding="async">`;
}

/** WhatsApp text for a list of { name, size, qty } lines (+ optional customer details). */
export function quoteText(items, details = {}) {
  const lines = items.map((it, i) => `${i + 1}. ${it.name} - ${it.size}${it.qty ? ` x ${it.qty}` : ''}`);
  const extra = [
    details.name && `Name: ${details.name}`,
    details.city && `City: ${details.city}`,
    details.note && `Note: ${details.note}`,
  ].filter(Boolean);
  return ['Hello Capson (Shreenath Polytech), I want a quote for:', ...lines, ...(extra.length ? ['', ...extra] : [])].join('\n');
}

/** Single-product "Get Quote": direct WhatsApp link listing its sizes. */
export const singleQuoteLink = (p) =>
  buildLink(quoteText([{ name: p.name, size: p.rows.length > 1 ? `all sizes (${sizeRange(p)})` : rowLabel(p, p.rows[0]) }]));

/** Columns visible to visitors (rate hidden unless SHOW_PRICES). */
export const visibleColumns = (p) => p.columns.filter((c) => CONFIG.SHOW_PRICES || c.key !== 'rate');

/** Normalised text used for search matching. */
export const normalise = (s) =>
  String(s)
    .toLowerCase()
    .replace(/["″”]/g, '')
    .replace(/[^a-z0-9/.\-× ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ARROW_ICON = ICONS.arrow;
// Plain characters (not SVG): line pages render ~165 steppers, so markup weight matters.
const PLUS = '+';
const MINUS = '−';

/** Colour swatches (agri pipes). */
export function swatchesTemplate(p) {
  if (!p.colours?.length) return '';
  return `
    <div class="swatches">
      <span class="swatches__label">Colours in catalogue photo</span>
      <ul class="swatches__list">
        ${p.colours
          .map((c) => `<li class="swatch"><span class="swatch__dot swatch--${esc(c.hex.slice(1))}" data-hex="${esc(c.hex)}"></span>${esc(c.name)}</li>`)
          .join('')}
      </ul>
    </div>`;
}

/** Agri facts: coil length and weight range from the table. */
export function agriFactsTemplate(p) {
  if (p.kind !== 'garden') return '';
  const weights = p.rows.flatMap((r) => r.weight.split(/\s*TO\s*/i).map(Number)).filter((n) => !Number.isNaN(n));
  const meters = [...new Set(p.rows.map((r) => r.meter))];
  return `
    <ul class="agri-facts">
      <li><strong>${esc(meters.join(' / '))} m</strong> coil</li>
      <li><strong>${Math.min(...weights).toFixed(2)} – ${Math.max(...weights).toFixed(2)}</strong> coil weight range</li>
    </ul>`;
}

/** Spec table with a qty stepper + Add to Quote on every row. Stacks into cards on mobile. */
export function quoteTableTemplate(p, { caption = true } = {}) {
  const cols = visibleColumns(p);
  const head = cols.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('');
  const body = p.rows
    .map((row) => {
      const size = rowLabel(p, row);
      const cells = cols
        .map((c, n) =>
          n === 0
            ? `<th scope="row" class="spec-table__size" data-label="${esc(c.label)}">${esc(row[c.key])}</th>`
            : `<td data-label="${esc(c.label)}">${esc(row[c.key])}</td>`
        )
        .join('');
      return `<tr data-size="${esc(normalise(size))}">
        ${cells}
        <td class="spec-table__qty" data-label="Qty">
          <div class="qty" data-qty>
            <button class="qty__btn" type="button" data-step="-1" aria-label="Decrease quantity of ${esc(size)}">${MINUS}</button>
            <input class="qty__input" type="number" inputmode="numeric" min="1" max="99999" value="1" aria-label="Quantity of ${esc(p.name)} ${esc(size)}">
            <button class="qty__btn" type="button" data-step="1" aria-label="Increase quantity of ${esc(size)}">${PLUS}</button>
          </div>
        </td>
        <td class="spec-table__add">
          <button class="btn btn--sm btn--dark" type="button" data-add data-slug="${p.slug}" data-size="${esc(size)}">
            <span data-add-label>Add to Quote</span>
          </button>
        </td>
      </tr>`;
    })
    .join('');
  return `
    <div class="table-wrap table-wrap--quote${p.kind === 'pipe' ? ' table-wrap--pipe' : ''}" role="region" aria-label="${esc(p.name)} sizes and packing" tabindex="0">
      <table class="spec-table spec-table--quote${p.kind === 'pipe' ? ' spec-table--pipe' : ''}">
        ${caption ? `<caption>${esc(p.name)}</caption>` : ''}
        <thead><tr>${head}<th scope="col">Qty</th><th scope="col"><span class="sr-only">Add</span></th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    ${CONFIG.SHOW_PRICES ? `<p class="rate-note">${RATE_NOTE}</p>` : ''}`;
}

/** Overview card (products.html grid, related products). */
export function cardTemplate(p, { compact = false } = {}) {
  const line = getLine(p.line);
  const count = p.rows.length;
  return `
    <article class="product-card${compact ? ' product-card--compact' : ''}" data-item data-slug="${p.slug}" data-line="${p.line}" data-type="${p.type}">
      <button class="product-card__media" type="button" data-open="${p.slug}" data-mask>
        <span class="sr-only">View details: </span>
        ${productImg(p, { sizes: compact ? '(min-width: 640px) 200px, 45vw' : '(min-width: 1440px) 320px, (min-width: 1100px) 22vw, (min-width: 768px) 30vw, 46vw' })}
      </button>
      <div class="product-card__body">
        <span class="product-card__tag product-card__tag--${line.id}">${esc(line.short)} · ${esc(sizeRange(p))}</span>
        <h3 class="product-card__title">${esc(p.name)}</h3>
        ${p.aka ? `<span class="product-card__aka">${esc(p.aka)}</span>` : ''}
        <p class="product-card__sizes">${esc(sizeRange(p))} · ${count} ${count === 1 ? 'option' : 'options'}</p>
        ${
          compact
            ? ''
            : `<div class="product-card__actions">
          <button class="btn btn--dark btn--sm" type="button" data-open="${p.slug}">Details</button>
          <a class="btn btn--sm" href="${singleQuoteLink(p)}" target="_blank" rel="noopener">${ICONS.whatsapp}Get Quote</a>
        </div>`
        }
      </div>
    </article>`;
}

/** Line-page panel: product info + full quote table. */
export function panelTemplate(p) {
  const count = p.rows.length;
  return `
    <article class="product-panel" id="${p.slug}" data-item data-slug="${p.slug}" data-line="${p.line}" data-type="${p.type}">
      <div class="product-panel__info">
        <button class="product-panel__media" type="button" data-open="${p.slug}" data-mask>
          <span class="sr-only">View details: </span>
          ${productImg(p, { sizes: '(min-width: 1024px) 260px, 96px' })}
        </button>
        <div class="product-panel__text">
          <h3 class="product-panel__title">${esc(p.name)}</h3>
          ${p.aka ? `<p class="product-card__aka">${esc(p.aka)}</p>` : ''}
          <p class="product-card__sizes">${esc(sizeRange(p))} · ${count} ${count === 1 ? 'option' : 'options'}</p>
          ${agriFactsTemplate(p)}
          ${swatchesTemplate(p)}
          <div class="product-panel__actions">
            <a class="btn btn--sm" href="${singleQuoteLink(p)}" target="_blank" rel="noopener">${ICONS.whatsapp}Get Quote</a>
            <button class="btn btn--sm btn--ghost" type="button" data-open="${p.slug}">Details ${ARROW_ICON}</button>
          </div>
        </div>
      </div>
      <div class="product-panel__table">${quoteTableTemplate(p, { caption: false })}</div>
    </article>`;
}
