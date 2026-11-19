/**
 * Quote cart.
 * - Store: localStorage ("capson-quote-v1"), items { slug, size, qty }, synced across tabs.
 * - UI: right-side drawer (GSAP slide), header badge with bounce, validated send form.
 * - Any element with [data-add][data-slug][data-size] adds the qty from the [data-qty]
 *   stepper in the same table row; [data-step] buttons change that stepper.
 * - Send builds the WhatsApp message (see quoteText in product-ui.js).
 */
import { getProduct } from '../data/products.js';
import { isLiteMotion } from './motion-prefs.js';
import { $, $$, esc, notifyModal, ICONS } from './utils.js';
import { buildLink } from './whatsapp.js';
import { quoteText } from './product-ui.js';

const KEY = 'capson-quote-v1';
const MAX_QTY = 99999;
const listeners = new Set();

/* ---------- Store ---------- */
function read() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(items) ? items.filter((it) => getProduct(it.slug) && it.size && it.qty > 0) : [];
  } catch {
    return [];
  }
}

let items = read();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage blocked (private mode): cart still works for this page view */
  }
  listeners.forEach((fn) => fn(items));
}

const clampQty = (n) => Math.min(MAX_QTY, Math.max(1, Math.round(Number(n) || 1)));

export const quote = {
  get items() {
    return items;
  },
  get count() {
    return items.length;
  },
  add(slug, size, qty = 1) {
    const found = items.find((it) => it.slug === slug && it.size === size);
    if (found) found.qty = clampQty(found.qty + Number(qty));
    else items = [...items, { slug, size, qty: clampQty(qty) }];
    save();
  },
  setQty(index, qty) {
    if (!items[index]) return;
    items[index].qty = clampQty(qty);
    save();
  },
  remove(index) {
    items = items.filter((_, i) => i !== index);
    save();
  },
  clear() {
    items = [];
    save();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// Keep tabs in sync.
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  items = read();
  listeners.forEach((fn) => fn(items));
});

/* ---------- Helpers ---------- */
const motionOK = () => window.gsap && !isLiteMotion();
const named = () => items.map((it) => ({ ...it, name: getProduct(it.slug).name }));

/* ---------- Qty steppers + Add to Quote (delegated, works on pages and in modals) ---------- */
function initRowControls(announce) {
  document.addEventListener('click', (e) => {
    const step = e.target.closest('[data-step]');
    if (step) {
      const input = $('input', step.closest('[data-qty]'));
      input.value = clampQty(Number(input.value) + Number(step.dataset.step));
      return;
    }
    const add = e.target.closest('[data-add]');
    if (!add) return;
    const input = $('[data-qty] input', add.closest('tr') || add.parentElement);
    const qty = clampQty(input?.value);
    if (input) input.value = qty;
    quote.add(add.dataset.slug, add.dataset.size, qty);

    const label = $('[data-add-label]', add);
    add.classList.add('is-added');
    if (label) label.textContent = 'Added ✓';
    clearTimeout(add._t);
    add._t = setTimeout(() => {
      add.classList.remove('is-added');
      if (label) label.textContent = 'Add to Quote';
    }, 1600);
    announce(`Added ${getProduct(add.dataset.slug).name} ${add.dataset.size} × ${qty} to your quote.`);
  });
  // Keep typed quantities in range.
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-qty] input')) e.target.value = clampQty(e.target.value);
  });
}

/* ---------- Drawer ---------- */
function drawerHTML() {
  return `
  <div class="quote-overlay" data-quote-overlay hidden></div>
  <aside class="quote-drawer" id="quote-drawer" data-quote-drawer role="dialog" aria-modal="true" aria-labelledby="quote-title" hidden>
    <header class="quote-drawer__head">
      <h2 id="quote-title">Your quote <span class="quote-drawer__count" data-quote-heading-count></span></h2>
      <button class="quote-drawer__close" type="button" data-quote-close aria-label="Close quote">${ICONS.close}</button>
    </header>
    <div class="quote-drawer__body">
      <ul class="quote-list" data-quote-list></ul>
      <div class="quote-empty" data-quote-empty>
        <p>Your quote list is empty.</p>
        <p>Use <strong>Add to Quote</strong> on any size row in the catalogue.</p>
        <a class="btn btn--sm btn--dark" href="products.html">Browse catalogue</a>
      </div>
    </div>
    <form class="quote-form" data-quote-form novalidate>
      <div class="quote-form__row">
        <div class="field">
          <label for="q-name">Name *</label>
          <input id="q-name" name="name" type="text" autocomplete="name" required aria-describedby="q-name-err">
          <p class="field__error" id="q-name-err" data-error-for="name"></p>
        </div>
        <div class="field">
          <label for="q-city">City *</label>
          <input id="q-city" name="city" type="text" autocomplete="address-level2" required aria-describedby="q-city-err">
          <p class="field__error" id="q-city-err" data-error-for="city"></p>
        </div>
      </div>
      <div class="field">
        <label for="q-note">Note (optional)</label>
        <textarea id="q-note" name="note" rows="2" placeholder="Delivery location, timeline, packing…"></textarea>
      </div>
      <p class="field__error" data-error-for="items"></p>
      <div class="quote-form__actions">
        <button class="btn" type="submit" data-quote-send>${ICONS.whatsapp}Send Quote on WhatsApp</button>
        <button class="btn btn--sm btn--ghost" type="button" data-quote-clear>Clear all</button>
      </div>
      <p class="quote-form__note">Opens WhatsApp with your list. Rates are shared by CAPSON; GST extra.</p>
    </form>
    <p class="sr-only" aria-live="polite" data-quote-live></p>
  </aside>`;
}

function itemHTML(it, i) {
  const p = getProduct(it.slug);
  return `
    <li class="quote-item" data-index="${i}">
      <img src="${p.image.replace(/\.webp$/, '-400.webp')}" alt="" width="64" height="64" loading="lazy">
      <div class="quote-item__text">
        <strong>${esc(p.name)}</strong>
        <span>Size: ${esc(it.size)}</span>
      </div>
      <div class="qty qty--sm">
        <button class="qty__btn" type="button" data-item-step="-1" aria-label="Decrease ${esc(p.name)} ${esc(it.size)}">−</button>
        <input class="qty__input" type="number" inputmode="numeric" min="1" max="${MAX_QTY}" value="${it.qty}" data-item-qty aria-label="Quantity of ${esc(p.name)} ${esc(it.size)}">
        <button class="qty__btn" type="button" data-item-step="1" aria-label="Increase ${esc(p.name)} ${esc(it.size)}">+</button>
      </div>
      <button class="quote-item__remove" type="button" data-item-remove aria-label="Remove ${esc(p.name)} ${esc(it.size)}">${ICONS.close}</button>
    </li>`;
}

function initDrawer() {
  document.body.insertAdjacentHTML('beforeend', drawerHTML());
  const drawer = $('[data-quote-drawer]');
  const overlay = $('[data-quote-overlay]');
  const list = $('[data-quote-list]', drawer);
  const empty = $('[data-quote-empty]', drawer);
  const form = $('[data-quote-form]', drawer);
  const live = $('[data-quote-live]', drawer);
  let open = false;
  let opener = null;

  const render = () => {
    list.innerHTML = items.map(itemHTML).join('');
    empty.hidden = items.length > 0;
    list.hidden = items.length === 0;
    $('[data-quote-heading-count]', drawer).textContent = items.length ? `(${items.length})` : '';
    $('[data-quote-clear]', drawer).hidden = items.length === 0;
  };

  const setOpen = (next, trigger) => {
    if (next === open) return;
    open = next;
    document.documentElement.classList.toggle('is-locked', open);
    notifyModal(open);
    $$('[data-quote-open]').forEach((b) => b.setAttribute('aria-expanded', String(open)));
    if (open) {
      opener = trigger || document.activeElement;
      render();
      drawer.hidden = false;
      overlay.hidden = false;
      if (motionOK()) {
        window.gsap.fromTo(drawer, { xPercent: 100 }, { xPercent: 0, duration: 0.45, ease: 'power3.out' });
        window.gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        window.gsap.from($$('.quote-item', drawer), { x: 24, opacity: 0, stagger: 0.04, duration: 0.3, delay: 0.15 });
      }
      $('[data-quote-close]', drawer).focus();
    } else {
      const done = () => {
        drawer.hidden = true;
        overlay.hidden = true;
      };
      if (motionOK()) {
        window.gsap.to(overlay, { opacity: 0, duration: 0.25 });
        window.gsap.to(drawer, { xPercent: 100, duration: 0.35, ease: 'power2.in', onComplete: done });
      } else done();
      opener?.focus?.();
    }
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-quote-open]');
    if (trigger) setOpen(true, trigger);
  });
  overlay.addEventListener('click', () => setOpen(false));
  $('[data-quote-close]', drawer).addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) setOpen(false);
    // Keep Tab inside the drawer while it is open.
    if (e.key === 'Tab' && open) {
      const focusable = $$('button:not([hidden]), a[href], input, textarea', drawer).filter((el) => el.offsetParent);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Item controls
  list.addEventListener('click', (e) => {
    const row = e.target.closest('[data-index]');
    if (!row) return;
    const i = Number(row.dataset.index);
    if (e.target.closest('[data-item-remove]')) {
      const name = `${getProduct(items[i].slug).name} ${items[i].size}`;
      quote.remove(i);
      live.textContent = `Removed ${name}.`;
      ($('[data-item-remove]', list) || $('[data-quote-close]', drawer)).focus();
    }
    const step = e.target.closest('[data-item-step]');
    if (step) quote.setQty(i, items[i].qty + Number(step.dataset.itemStep));
  });
  list.addEventListener('change', (e) => {
    if (e.target.matches('[data-item-qty]')) quote.setQty(Number(e.target.closest('[data-index]').dataset.index), e.target.value);
  });
  $('[data-quote-clear]', drawer).addEventListener('click', () => {
    quote.clear();
    live.textContent = 'Quote cleared.';
    $('[data-quote-close]', drawer).focus();
  });

  // Validate + send
  const showError = (key, msg) => {
    const el = $(`[data-error-for="${key}"]`, form);
    el.textContent = msg;
    const input = form.elements[key];
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };
  form.addEventListener('input', (e) => e.target.name && showError(e.target.name, ''));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const city = form.elements.city.value.trim();
    const note = form.elements.note.value.trim();
    showError('items', items.length ? '' : 'Add at least one product size to your quote first.');
    showError('name', name.length >= 2 ? '' : 'Please enter your name.');
    showError('city', city.length >= 2 ? '' : 'Please enter your city.');
    const firstBad = !items.length ? null : name.length < 2 ? form.elements.name : city.length < 2 ? form.elements.city : null;
    if (!items.length || firstBad) {
      firstBad?.focus();
      return;
    }
    window.open(buildLink(quoteText(named(), { name, city, note })), '_blank', 'noopener');
    live.textContent = 'Opening WhatsApp with your quote.';
  });

  quote.subscribe(() => open && render());
  return { announce: (msg) => (live.textContent = msg) };
}

/* ---------- Header badge ---------- */
function updateBadges(bounce) {
  $$('[data-quote-count]').forEach((badge) => {
    badge.textContent = items.length;
    badge.hidden = items.length === 0;
    if (bounce && items.length && motionOK()) {
      window.gsap.fromTo(badge, { scale: 1.7 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    }
  });
  $$('[data-quote-open]').forEach((b) =>
    b.setAttribute('aria-label', `Quote list, ${items.length} ${items.length === 1 ? 'item' : 'items'}`)
  );
}

export function initQuote() {
  const { announce } = initDrawer();
  initRowControls(announce);
  let last = items.length;
  updateBadges(false);
  // Bounce when something was added (count same or higher); stay still on removals.
  quote.subscribe(() => {
    updateBadges(items.length >= last);
    last = items.length;
  });
}
