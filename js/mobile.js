/**
 * Mobile app shell (phones, <= 768px). Loaded by main.js only when that media query matches.
 *
 * Everything injected here carries .m-only (hidden from 769px up by components.css) and all
 * styles live in css/mobile.css (linked with media="(max-width: 768px)"), so the desktop
 * layout never changes. html.m-app marks that this script is running; CSS that depends on
 * it (skeletons, hidden sections, sticky offsets) is scoped to that class.
 *
 *  - App bar: slim header that hides on scroll down and returns on scroll up; search button.
 *  - Tab bar: Home · Products (sheet) · Catalogue · Quote (sheet) · WhatsApp, sliding pill.
 *  - Bottom sheets with drag handle: products menu, quick add (sizes of one product); the
 *    quote drawer becomes a full-height sheet (css) with the same swipe-to-close.
 *  - Full-screen search with recent / popular suggestions and live results.
 *  - Home: category chips + swipeable product rails ("Popular", UPVC, CPVC, Garden).
 *  - Spec tables become tap-to-expand size cards; footer becomes accordions + contact buttons.
 *  - Image skeletons, staggered card entrance. Motion respects prefers-reduced-motion.
 */
import { CONFIG, BRAND } from './config.js';
import { lines, categories, products, FILTERS, getLine, getProduct, rowLabel, sizeRange, byLine } from '../data/products.js';
import { $, $$, esc, notifyModal, ICONS } from './utils.js';
import { bindLinks } from './whatsapp.js';
import { prefersReducedMotion } from './motion-prefs.js';
import { quote } from './quote.js';
import { productImg, quoteTableTemplate, singleQuoteLink, normalise, PLUS_ICON } from './product-ui.js';

const root = document.documentElement;
const animate = () => Boolean(window.gsap) && !prefersReducedMotion();

/* ---------- Icons (inline SVG, decorative) ---------- */
const svg = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
const I = {
  home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>'),
  grid: svg('<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>'),
  book: svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8 7h8"/>'),
  quote: svg('<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="M9 11h6M9 15h4"/>'),
  phone: svg('<path d="M5 3h3l2 5-2.5 1.5a11 11 0 0 0 7 7L16 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  chevron: svg('<path d="m6 9 6 6 6-6"/>', ' class="m-chevron"'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  trend: svg('<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
};

/* ---------- Helpers ---------- */
const pageKey = (path) => path.split('#')[0].split('/').pop().replace(/\.html$/, '') || 'index';
const current = pageKey(location.pathname);
const html = (markup) => {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
};
const store = {
  get(key, fallback) {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value, session = false) {
    try {
      (session ? sessionStorage : localStorage).setItem(key, JSON.stringify(value));
    } catch {
      /* storage blocked: feature simply does not persist */
    }
  },
};
/** Line page, or the products page when the product is not in a line page. */
const productHref = (p) => `${getLine(p.line).page}#${p.slug}`;
const thumb = (src) => src.replace(/\.webp$/, '-400.webp');

/* ==========================================================================
   Bottom sheets
   ========================================================================== */
const sheets = new Set();
let openSheet = null;

/** True while the quote drawer (owned by quote.js) is open. */
const quoteOpen = () => $('[data-quote-drawer]')?.hidden === false;

function lock(on) {
  // Another modal surface may still be open: only unlock when none is.
  if (!on && (openSheet || quoteOpen() || $('[data-m-search]')?.hidden === false)) return;
  root.classList.toggle('is-locked', on);
  notifyModal(on);
}

/** Drag the sheet down by its handle/header; release past the threshold to close. */
function enableDrag(panel, onClose) {
  let startY = 0;
  let dy = 0;
  let t0 = 0;
  let dragging = false;
  panel.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('[data-sheet-drag]') || e.target.closest('a, input, button:not(.sheet__grab)')) return;
    dragging = true;
    startY = e.clientY;
    dy = 0;
    t0 = performance.now();
    try {
      panel.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already released (very quick tap): dragging still works without capture */
    }
  });
  panel.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - startY);
    panel.style.transform = `translateY(${dy}px)`;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    const velocity = dy / Math.max(1, performance.now() - t0);
    const height = panel.offsetHeight || 1;
    panel.style.transform = '';
    if (dy > Math.min(120, height * 0.3) || velocity > 0.6) {
      // Hand the current offset to GSAP so the close tween continues from the finger.
      if (window.gsap) window.gsap.set(panel, { yPercent: (dy / height) * 100, y: 0 });
      onClose();
    } else if (dy > 0 && animate()) {
      window.gsap.fromTo(panel, { y: dy }, { y: 0, duration: 0.25, ease: 'power3.out' });
    }
  };
  panel.addEventListener('pointerup', end);
  panel.addEventListener('pointercancel', end);
}

function createSheet({ id, label, className = '' }) {
  const backdrop = html('<div class="sheet-backdrop m-only" hidden></div>');
  const panel = html(`
    <section class="sheet m-only ${className}" id="${id}" role="dialog" aria-modal="true" aria-label="${esc(label)}" hidden>
      <div class="sheet__grab" data-sheet-drag aria-hidden="true"><span class="sheet__handle"></span></div>
      <div class="sheet__content" data-sheet-content></div>
    </section>`);
  document.body.append(backdrop, panel);
  let opener = null;

  const api = {
    panel,
    get isOpen() {
      return openSheet === api;
    },
    open(content, trigger) {
      if (openSheet && openSheet !== api) openSheet.close({ instant: true });
      opener = trigger || document.activeElement;
      if (content != null) {
        const slot = $('[data-sheet-content]', panel);
        slot.innerHTML = content;
        bindLinks(slot);
      }
      openSheet = api;
      backdrop.hidden = false;
      panel.hidden = false;
      lock(true);
      tabbar?.sheetChanged();
      if (animate()) {
        const { gsap } = window;
        gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        gsap.fromTo(panel, { yPercent: 100, y: 0 }, { yPercent: 0, duration: 0.4, ease: 'power3.out' });
        const tiles = $$('[data-stagger] > *', panel);
        if (tiles.length) gsap.from(tiles, { y: 16, opacity: 0, duration: 0.35, stagger: 0.03, delay: 0.12, ease: 'power2.out', clearProps: 'all' });
      }
      ($('[data-sheet-close]', panel) || panel).focus({ preventScroll: true });
    },
    close({ instant = false } = {}) {
      if (openSheet !== api) return;
      openSheet = null;
      const done = () => {
        panel.hidden = true;
        backdrop.hidden = true;
        window.gsap?.set(panel, { clearProps: 'transform' });
        lock(false);
      };
      tabbar?.sheetChanged();
      if (animate() && !instant) {
        window.gsap.to(backdrop, { opacity: 0, duration: 0.25 });
        window.gsap.to(panel, { yPercent: 100, duration: 0.28, ease: 'power2.in', onComplete: done });
      } else done();
      if (!instant) opener?.focus?.({ preventScroll: true });
    },
  };

  backdrop.addEventListener('click', () => api.close());
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-sheet-close]')) api.close();
    // Following a link or opening the quote list: leave the sheet.
    else if (e.target.closest('a[href]:not([target="_blank"]), [data-quote-open]')) api.close({ instant: true });
  });
  panel.addEventListener('keydown', (e) => trapFocus(e, panel));
  enableDrag(panel, () => api.close());
  sheets.add(api);
  return api;
}

/** Keep Tab inside an open dialog. */
function trapFocus(e, box) {
  if (e.key !== 'Tab') return;
  const items = $$('a[href], button:not([disabled]), input, textarea', box).filter((el) => el.offsetParent);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

const sheetHead = (title, sub = '') => `
  <header class="sheet__head" data-sheet-drag>
    <div class="sheet__heading"><h2 class="sheet__title">${title}</h2>${sub ? `<p class="sheet__sub">${sub}</p>` : ''}</div>
    <button class="sheet__close" type="button" data-sheet-close aria-label="Close">${ICONS.close}</button>
  </header>`;

/* ---------- Products sheet ---------- */
function productsSheetHTML() {
  const tile = (href, img, title, sub) => `
    <li><a class="sheet-tile" href="${href}"${href.startsWith(`${current}.html#`) ? ` data-cat-link="${href.split('#')[1]}"` : ''}>
      <span class="sheet-tile__img"><img src="${thumb(img)}" alt="" width="56" height="56" loading="lazy" decoding="async"></span>
      <span class="sheet-tile__text"><strong>${esc(title)}</strong><small>${esc(sub)}</small></span>
    </a></li>`;
  const groups = lines
    .map((line) => {
      const tiles =
        line.id === 'agri'
          ? byLine('agri').map((p) => tile(productHref(p), p.image, p.name.replace(/ Garden Pipe$/, ''), sizeRange(p)))
          : categories
              .filter((c) => c.line === line.id)
              .map((c) => {
                const n = products.filter((p) => p.category === c.id).length;
                return tile(`${line.page}#${c.id}`, c.image, c.short, `${n} ${n === 1 ? 'product' : 'products'}`);
              });
      return `
        <section class="sheet-group">
          <div class="sheet-group__head">
            <h3><span class="sheet-group__dot sheet-group__dot--${line.id}" aria-hidden="true"></span>${esc(line.name)}</h3>
            <a href="${line.page}">View all</a>
          </div>
          <ul class="sheet-tiles" data-stagger>${tiles.join('')}</ul>
        </section>`;
    })
    .join('');
  return `
    ${sheetHead('Products', `${products.length} products in 3 lines`)}
    <div class="sheet__body" data-lenis-prevent>
      <a class="sheet-all" href="products.html">
        <span class="sheet-all__icon">${I.grid}</span>
        <span><strong>All products</strong><small>Search and filter the full range</small></span>
        ${ICONS.arrow}
      </a>
      ${groups}
      <a class="btn btn--dark sheet__wide" href="catalogue.html">${I.book}View the catalogue</a>
    </div>`;
}

/* ---------- Quick add (sizes of one product) ---------- */
function quickAddHTML(p) {
  const line = getLine(p.line);
  return `
    <header class="sheet__head sheet__head--product" data-sheet-drag>
      <span class="quick__img">${productImg(p, { sizes: '64px', alt: '', lazy: false })}</span>
      <div class="sheet__heading">
        <h2 class="sheet__title">${esc(p.name)}</h2>
        <p class="sheet__sub">${esc(line.short)} · ${esc(sizeRange(p))} · ${p.rows.length} ${p.rows.length === 1 ? 'size' : 'sizes'}</p>
      </div>
      <button class="sheet__close" type="button" data-sheet-close aria-label="Close">${ICONS.close}</button>
    </header>
    <div class="sheet__body" data-lenis-prevent>
      <p class="quick__hint">Set the quantity, then tap <strong>Add to Quote</strong> for each size.</p>
      ${quoteTableTemplate(p, { caption: false })}
    </div>
    <footer class="sheet__foot">
      <button class="btn btn--dark" type="button" data-quote-open aria-controls="quote-drawer">${I.quote}Quote list</button>
      <a class="btn" href="${singleQuoteLink(p)}" target="_blank" rel="noopener">${ICONS.whatsapp}Ask on WhatsApp</a>
    </footer>`;
}

/* ==========================================================================
   Tab bar
   ========================================================================== */
const TABS = [
  { id: 'home', label: 'Home', icon: I.home, href: 'index.html', pages: ['index'] },
  { id: 'products', label: 'Products', icon: I.grid, sheet: true, pages: ['products', 'upvc', 'cpvc', 'agri', 'garden-pipes'] },
  { id: 'catalogue', label: 'Catalogue', icon: I.book, href: 'catalogue.html', pages: ['catalogue'] },
  { id: 'quote', label: 'Quote', icon: I.quote, quote: true, pages: [] },
  { id: 'whatsapp', label: 'WhatsApp', icon: ICONS.whatsapp, wa: true, pages: [] },
];
let tabbar = null;

function createTabbar(productsSheet) {
  const pageTab = TABS.findIndex((t) => t.pages.includes(current));
  const item = (t) => {
    const inner = `<span class="tabbar__icon">${t.icon}</span><span class="tabbar__label">${t.label}</span>`;
    const active = TABS.indexOf(t) === pageTab;
    if (t.sheet)
      return `<button class="tabbar__item${active ? ' is-active' : ''}" type="button" data-tab="${t.id}" aria-haspopup="dialog" aria-controls="m-products" aria-expanded="false">${inner}</button>`;
    if (t.quote)
      return `<button class="tabbar__item" type="button" data-tab="${t.id}" data-quote-open aria-controls="quote-drawer" aria-expanded="false">${inner}<span class="tabbar__badge" data-quote-count${quote.count ? '' : ' hidden'}>${quote.count}</span></button>`;
    if (t.wa)
      return `<a class="tabbar__item" href="contact.html" data-tab="${t.id}" data-wa>${inner}</a>`;
    return `<a class="tabbar__item${active ? ' is-active' : ''}" href="${t.href}" data-tab="${t.id}"${active ? ' aria-current="page"' : ''}>${inner}</a>`;
  };
  const nav = html(`
    <nav class="tabbar m-only" aria-label="App navigation">
      <span class="tabbar__pill" aria-hidden="true"></span>
      <ul class="tabbar__list">${TABS.map((t) => `<li>${item(t)}</li>`).join('')}</ul>
    </nav>`);
  document.body.append(nav);
  bindLinks(nav);

  const pill = $('.tabbar__pill', nav);
  const buttons = $$('.tabbar__item', nav);
  let shown = -1;

  /** Slide the pill to tab i (or fade it out for -1). */
  const moveTo = (i, instant = false) => {
    if (i === shown) return;
    buttons.forEach((b, n) => b.classList.toggle('is-active', n === i));
    const { gsap } = window;
    if (!gsap || instant || !animate()) {
      pill.style.transform = `translateX(${Math.max(i, 0) * 100}%)`;
      pill.style.opacity = i < 0 ? '0' : '1';
    } else if (i < 0) {
      gsap.to(pill, { opacity: 0, duration: 0.2 });
    } else if (shown < 0) {
      gsap.set(pill, { xPercent: i * 100, x: 0 });
      gsap.fromTo(pill, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
    } else {
      gsap.to(pill, { xPercent: i * 100, opacity: 1, duration: 0.4, ease: 'power3.out' });
    }
    shown = i;
  };

  // Slide in from the tab of the previous page, so moving between pages feels continuous.
  const prev = store.get('capson:tab', -1);
  pill.style.transform = `translateX(${Math.max(prev, 0) * 100}%)`;
  pill.style.opacity = prev < 0 ? '0' : '1';
  shown = prev;
  if (prev < 0 || prev === pageTab || !animate()) moveTo(pageTab, true);
  else setTimeout(() => moveTo(pageTab), 120);
  store.set('capson:tab', pageTab, true);

  const sync = () => {
    const quoteIdx = TABS.findIndex((t) => t.quote);
    const productsIdx = TABS.findIndex((t) => t.sheet);
    // aria-expanded flips at once; the drawer itself only hides after its close animation.
    if ($('[data-tab="quote"]', nav).getAttribute('aria-expanded') === 'true') moveTo(quoteIdx);
    else if (productsSheet.isOpen) moveTo(productsIdx);
    else moveTo(pageTab);
    $('[data-tab="products"]', nav).setAttribute('aria-expanded', String(productsSheet.isOpen));
  };

  let filled = false;
  $('[data-tab="products"]', nav).addEventListener('click', (e) => {
    if (productsSheet.isOpen) return productsSheet.close();
    // Menu markup is built on first open, not during page load.
    productsSheet.open(filled ? null : productsSheetHTML(), e.currentTarget);
    filled = true;
  });
  // quote.js flips aria-expanded on every [data-quote-open] when the drawer opens/closes.
  new MutationObserver(sync).observe($('[data-tab="quote"]', nav), { attributes: true, attributeFilter: ['aria-expanded'] });
  return { el: nav, sheetChanged: sync };
}

/* ==========================================================================
   App bar
   ========================================================================== */
function enhanceAppBar(search) {
  const header = $('[data-header]');
  const bar = $('[data-header-bar]');
  const actions = $('.header__actions', header);
  if (!header || !bar || !actions) return;

  if (!$('[data-search-open]', actions)) {
    const btn = html(`<button class="m-icon-btn m-only" type="button" data-search-open aria-label="Search products" aria-controls="m-search">${ICONS.search}</button>`);
    actions.prepend(btn);
    btn.addEventListener('click', () => search.open(btn));
  }

  // Hide on scroll down, show on scroll up. Not while a sheet or the quote list is open.
  let lastY = scrollY;
  let hidden = false;
  let ticking = false;
  const set = (hide) => {
    if (hide === hidden) return;
    hidden = hide;
    root.classList.toggle('is-appbar-hidden', hide);
    if (animate()) {
      window.gsap.to(bar, { yPercent: hide ? -110 : 0, duration: hide ? 0.25 : 0.35, ease: hide ? 'power2.in' : 'power3.out', overwrite: true });
    } else {
      bar.style.transform = hide ? 'translateY(-110%)' : '';
    }
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (!root.classList.contains('m-app')) return;
      const y = scrollY;
      const dy = y - lastY;
      if (y < 80 || openSheet || quoteOpen()) set(false);
      else if (dy > 8) set(true);
      else if (dy < -8) set(false);
      if (Math.abs(dy) > 8 || y < 80) lastY = y;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  appBar = { reset: () => { set(false); window.gsap?.set(bar, { clearProps: 'transform' }); bar.style.transform = ''; } };
}
let appBar = null;

/* ==========================================================================
   Search overlay
   ========================================================================== */
const POPULAR = ['Elbow', 'Ball valve', 'Tank nipple', 'Brass tee', 'Solvent', 'Garden pipe', 'SDR-11', '3/4'];
const RECENT_KEY = 'capson:recent-search';
/** Search text per product, built on the first search (keeps page load light). */
let searchIndex = null;
const getIndex = () =>
  (searchIndex ||= products.map((p) => ({
    p,
    text: normalise([p.name, p.aka, getLine(p.line).short, ...p.rows.map((r) => rowLabel(p, r))].join(' ')),
  })));

function createSearch() {
  const box = html(`
    <div class="m-search m-only" id="m-search" data-m-search role="dialog" aria-modal="true" aria-label="Search products" hidden>
      <form class="m-search__bar" role="search" action="products.html" method="get">
        <span class="m-search__field">
          ${ICONS.search}
          <label class="sr-only" for="m-search-input">Search products by name or size</label>
          <input id="m-search-input" name="q" type="search" placeholder="Name or size, e.g. elbow 3/4" autocomplete="off" enterkeyhint="search">
        </span>
        <button class="m-search__cancel" type="button" data-search-close>Cancel</button>
      </form>
      <div class="m-search__body" data-lenis-prevent>
        <section class="m-search__group" data-search-recent hidden>
          <div class="m-search__head"><h2>${I.clock}Recent</h2><button type="button" data-search-clear>Clear</button></div>
          <ul class="m-search__chips" data-recent-list></ul>
        </section>
        <section class="m-search__group" data-search-popular>
          <div class="m-search__head"><h2>${I.trend}Popular</h2></div>
          <ul class="m-search__chips">${POPULAR.map((q) => `<li><button class="m-search__chip" type="button" data-q="${esc(q)}">${esc(q)}</button></li>`).join('')}</ul>
        </section>
        <section class="m-search__group" data-search-results hidden>
          <div class="m-search__head"><h2 data-results-title aria-live="polite"></h2></div>
          <ul class="m-search__results" data-results-list></ul>
          <a class="btn btn--dark m-search__all" data-results-all href="products.html">See all in catalogue</a>
        </section>
      </div>
    </div>`);
  document.body.append(box);
  const input = $('input', box);
  const form = $('form', box);
  let opener = null;

  const recent = () => store.get(RECENT_KEY, []);
  const remember = (q) => {
    const term = q.trim();
    if (term.length < 2) return;
    store.set(RECENT_KEY, [term, ...recent().filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, 6));
  };
  const renderRecent = () => {
    const items = recent();
    $('[data-search-recent]', box).hidden = !items.length;
    $('[data-recent-list]', box).innerHTML = items
      .map((q) => `<li><button class="m-search__chip m-search__chip--recent" type="button" data-q="${esc(q)}">${esc(q)}</button></li>`)
      .join('');
  };

  const run = () => {
    const terms = normalise(input.value).split(' ').filter(Boolean);
    const results = $('[data-search-results]', box);
    const idle = !terms.length;
    results.hidden = idle;
    $('[data-search-popular]', box).hidden = !idle;
    if (idle) {
      renderRecent();
      return;
    }
    $('[data-search-recent]', box).hidden = true;
    const hits = getIndex().filter(({ text }) => terms.every((t) => text.includes(t))).map(({ p }) => p);
    $('[data-results-title]', box).textContent = hits.length
      ? `${hits.length} ${hits.length === 1 ? 'product' : 'products'}`
      : `No products match “${input.value.trim()}”`;
    $('[data-results-list]', box).innerHTML = hits
      .slice(0, 24)
      .map((p) => {
        const line = getLine(p.line);
        return `<li><a class="m-result" href="${productHref(p)}">
          <span class="m-result__img"><img src="${thumb(p.image)}" alt="" width="48" height="48" loading="lazy" decoding="async"></span>
          <span class="m-result__text"><strong>${esc(p.name)}</strong><small>${esc(line.short)} · ${esc(sizeRange(p))}</small></span>
          ${ICONS.arrow}
        </a></li>`;
      })
      .join('');
    const all = $('[data-results-all]', box);
    all.href = `products.html?q=${encodeURIComponent(input.value.trim())}`;
    all.hidden = !hits.length;
  };

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(run, 80);
  });
  form.addEventListener('submit', () => remember(input.value)); // native GET to products.html?q=
  box.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-q]');
    if (chip) {
      input.value = chip.dataset.q;
      run();
      input.focus();
      return;
    }
    if (e.target.closest('[data-search-clear]')) {
      store.set(RECENT_KEY, []);
      renderRecent();
      return;
    }
    if (e.target.closest('.m-result, [data-results-all]')) {
      remember(input.value);
      api.close({ instant: true });
      return;
    }
    if (e.target.closest('[data-search-close]')) api.close();
  });
  box.addEventListener('keydown', (e) => trapFocus(e, box));

  const api = {
    get isOpen() {
      return !box.hidden;
    },
    open(trigger) {
      if (openSheet) openSheet.close({ instant: true });
      opener = trigger;
      box.hidden = false;
      lock(true);
      renderRecent();
      run();
      // Focus synchronously inside the tap so mobile keyboards open.
      input.focus();
      if (animate()) {
        window.gsap.fromTo(box, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out', clearProps: 'transform' });
      }
    },
    close({ instant = false } = {}) {
      if (box.hidden) return;
      const done = () => {
        box.hidden = true;
        lock(false);
      };
      if (animate() && !instant) window.gsap.to(box, { opacity: 0, duration: 0.18, onComplete: done });
      else done();
      if (!instant) opener?.focus?.({ preventScroll: true });
    },
  };
  return api;
}

/* ==========================================================================
   Home: category chips + product rails
   ========================================================================== */
function railCard(p) {
  const line = getLine(p.line);
  const href = productHref(p);
  return `
    <article class="product-card m-rail__card">
      <a class="product-card__media" href="${href}" tabindex="-1" aria-hidden="true">${productImg(p, { sizes: '45vw', alt: '' })}</a>
      <div class="product-card__body">
        <span class="product-card__tag product-card__tag--${line.id}">${esc(line.short)} · ${esc(sizeRange(p))}</span>
        <h3 class="product-card__title"><a href="${href}">${esc(p.name)}</a></h3>
        <div class="product-card__actions">
          <a class="btn btn--sm" href="${singleQuoteLink(p)}" target="_blank" rel="noopener">${ICONS.whatsapp}Get Quote</a>
          <button class="product-card__add" type="button" data-quick-add="${p.slug}" aria-label="Add ${esc(p.name)} to quote">${PLUS_ICON}</button>
        </div>
      </div>
    </article>`;
}

/** One product of each category first, then the rest: a varied rail. */
function sampleLine(id, max = 10) {
  const list = byLine(id);
  const firsts = [...new Map(list.map((p) => [p.category, p])).values()];
  return [...firsts, ...list.filter((p) => !firsts.includes(p))].slice(0, max);
}

function buildHome() {
  const hero = $('.hero--home');
  if (!hero || $('.m-home')) return;
  const featured = $$('.grid--featured .product-card__title a')
    .map((a) => getProduct(a.getAttribute('href').split('#')[1]))
    .filter(Boolean);

  const chips = [
    { label: 'All products', href: 'products.html', icon: I.grid },
    ...lines.map((l) => ({ label: l.id === 'agri' ? 'Garden pipes' : l.short, href: l.page, img: thumb(l.image) })),
    ...FILTERS.filter((f) => f.id !== 'all' && f.id !== 'pipes').map((f) => ({ label: f.label, href: `products.html?type=${f.id}` })),
  ];
  const rails = [
    { id: 'popular', title: 'Popular products', href: 'products.html', items: featured },
    { id: 'upvc', title: 'UPVC', href: 'upvc.html', items: sampleLine('upvc') },
    { id: 'cpvc', title: 'CPVC', href: 'cpvc.html', items: sampleLine('cpvc') },
    { id: 'agri', title: 'Garden pipes', href: 'agri.html', items: sampleLine('agri') },
  ].filter((r) => r.items.length);

  const block = html(`
    <div class="m-home m-only">
      <nav class="m-chips" aria-label="Browse by line and type">
        <ul class="m-chips__list">${chips
          .map(
            (c) => `<li><a class="m-chip" href="${c.href}">${
              c.img ? `<img src="${c.img}" alt="" width="24" height="24" loading="lazy" decoding="async">` : c.icon || ''
            }${esc(c.label)}</a></li>`
          )
          .join('')}</ul>
      </nav>
      ${rails.slice(0, 1).map(railHTML).join('')}
    </div>`);
  hero.after(block);
  bindLinks(block);
  railEntrance(block);
  // The other rails are below the fold: build them once the page is idle.
  const rest = () => {
    block.insertAdjacentHTML('beforeend', rails.slice(1).map(railHTML).join(''));
    bindLinks(block);
    railEntrance(block);
  };
  if ('requestIdleCallback' in window) requestIdleCallback(rest, { timeout: 2000 });
  else setTimeout(rest, 600);
  // Replaced on phones by the chips + rails above: taken out of the DOM so no reveal
  // triggers or layout work run for them; put back if the window grows to desktop.
  [$('.range-cards'), $('.grid--featured')].forEach((inner) => {
    const section = inner?.closest('section');
    if (!section) return;
    const mark = document.createComment(' moved out on phones by js/mobile.js ');
    section.replaceWith(mark);
    detached.push({ section, mark });
  });
}
const detached = [];

const railHTML = (r) => `
      <section class="m-rail" aria-labelledby="m-rail-${r.id}">
        <div class="m-rail__head">
          <h2 class="m-rail__title" id="m-rail-${r.id}">${esc(r.title)}</h2>
          <a class="m-rail__more" href="${r.href}">See all</a>
        </div>
        <div class="m-rail__track" data-rail>${r.items.map(railCard).join('')}</div>
      </section>`;

/** Staggered card entrance when a rail scrolls into view (each track observed once). */
let railObserver = null;
function railEntrance(scope) {
  const tracks = $$('[data-rail]:not([data-rail-seen])', scope);
  if (!tracks.length || !animate() || !('IntersectionObserver' in window)) return;
  const fold = innerHeight;
  const io = (railObserver ||= new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        // Already on screen at load: show as is, keep the load path free of animation work.
        if (en.boundingClientRect.top < fold && performance.now() < 4000) return;
        window.gsap.from(en.target.children, { y: 16, opacity: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out', clearProps: 'transform,opacity' });
      }),
    { rootMargin: '0px 0px -10% 0px' }
  ));
  tracks.forEach((t) => {
    t.dataset.railSeen = '';
    io.observe(t);
  });
}

/** Static "Get Quote" cards (home page HTML) get the same + quick-add button. */
function addQuickButtons() {
  $$('.product-card').forEach((card) => {
    const actions = $('.product-card__actions', card);
    if (!actions || $('[data-quick-add]', actions)) return;
    const link = $('.product-card__title a', card);
    const slug = link?.getAttribute('href')?.split('#')[1];
    const p = slug && getProduct(slug);
    if (!p) return;
    actions.insertAdjacentHTML(
      'beforeend',
      `<button class="product-card__add m-only" type="button" data-quick-add="${p.slug}" aria-label="Add ${esc(p.name)} to quote">${PLUS_ICON}</button>`
    );
  });
}

/* ==========================================================================
   Spec rows: tap a size to expand packing + quantity
   ========================================================================== */
function initSpecRows() {
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.spec-row__toggle');
    if (!toggle) return;
    const row = toggle.closest('tr');
    const open = !row.classList.contains('is-open');
    row.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open && animate()) {
      window.gsap.from($$(':scope > td:not(:nth-child(2))', row), { opacity: 0, y: -6, duration: 0.25, stagger: 0.03, ease: 'power2.out', clearProps: 'all' });
    }
  });
}

/* ==========================================================================
   Footer: accordions + Call / WhatsApp / Directions
   ========================================================================== */
const restoreFooter = [];

function enhanceFooter() {
  const footer = $('.site-footer');
  if (!footer) return;
  $$('.footer__grid > div:not(.footer__brand)', footer).forEach((col, i) => {
    if (col.dataset.mAcc) return;
    const h = $('h2', col);
    if (!h) return;
    const label = h.textContent;
    const panel = document.createElement('div');
    panel.className = 'm-acc__panel';
    panel.id = `m-foot-${i}`;
    panel.hidden = true;
    [...col.children].filter((c) => c !== h).forEach((c) => panel.append(c));
    col.append(panel);
    h.innerHTML = `<button class="m-acc__btn" type="button" aria-expanded="false" aria-controls="${panel.id}">${esc(label)}${I.chevron}</button>`;
    col.dataset.mAcc = '1';
    col.classList.add('m-acc');
    restoreFooter.push(() => {
      h.textContent = label;
      [...panel.children].forEach((c) => col.append(c));
      panel.remove();
      delete col.dataset.mAcc;
      col.classList.remove('m-acc');
    });
  });

  const brand = $('.footer__brand', footer);
  if (brand && !$('.m-contact', brand)) {
    const number = String(CONFIG.WHATSAPP_NUMBER).replace(/\D/g, '');
    const row = html(`
      <ul class="m-contact m-only" aria-label="Contact ${esc(BRAND.name)}">
        <li><a class="m-contact__btn" href="tel:+${number}">${I.phone}<span>Call</span></a></li>
        <li><a class="m-contact__btn" href="contact.html" data-wa>${ICONS.whatsapp}<span>WhatsApp</span></a></li>
        <li><a class="m-contact__btn" href="${CONFIG.MAP_URL}" target="_blank" rel="noopener">${I.pin}<span>Directions</span></a></li>
      </ul>`);
    brand.append(row);
    bindLinks(row);
  }

  if (!footer.dataset.mAccBound) {
    footer.dataset.mAccBound = '1';
    footer.addEventListener('click', (e) => {
      const btn = e.target.closest('.m-acc__btn');
      if (!btn) return;
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      if (open) {
        panel.hidden = false;
        if (animate()) window.gsap.fromTo(panel, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out', clearProps: 'height,opacity' });
      } else if (animate()) {
        window.gsap.to(panel, { height: 0, opacity: 0, duration: 0.22, ease: 'power2.in', onComplete: () => {
          panel.hidden = true;
          window.gsap.set(panel, { clearProps: 'height,opacity' });
        } });
      } else panel.hidden = true;
    });
  }
}

/* ==========================================================================
   Quote drawer as a sheet: handle + swipe to close
   ========================================================================== */
function enhanceQuoteDrawer() {
  const drawer = $('[data-quote-drawer]');
  if (!drawer || drawer.dataset.mSheet) return;
  drawer.dataset.mSheet = '1';
  const head = $('.quote-drawer__head', drawer);
  head.setAttribute('data-sheet-drag', '');
  head.insertAdjacentHTML('afterbegin', '<span class="sheet__handle sheet__handle--light m-only" aria-hidden="true"></span>');
  $('.quote-drawer__body', drawer)?.setAttribute('data-lenis-prevent', '');
  drawer.setAttribute('data-lenis-prevent', '');
  enableDrag(drawer, () => $('[data-quote-close]', drawer).click());
}

/* ==========================================================================
   Image skeletons: images fade in over a shimmer once loaded
   ========================================================================== */
function initImageSkeletons() {
  // The frame gets the class too, so CSS can stop its shimmer without a costly :has().
  const frames = '.product-card__media, .product-panel__media, .sheet-tile__img, .m-result__img, .quick__img';
  const mark = (img) => {
    img.classList.add('is-loaded');
    if (img.parentElement?.matches(frames)) img.parentElement.classList.add('is-loaded');
  };
  document.addEventListener(
    'load',
    (e) => e.target.tagName === 'IMG' && mark(e.target),
    true
  );
  document.addEventListener(
    'error',
    (e) => e.target.tagName === 'IMG' && mark(e.target),
    true
  );
  // Images that finished before this ran; anything inserted later fires its own load event.
  $$('img').forEach((img) => img.complete && mark(img));
  // Fade-in only for images that load after the page has (lazy ones scrolled into view):
  // first-screen images paint at once, so the skeleton never delays LCP.
  const ready = () => setTimeout(() => root.classList.add('m-fade-ready'), 300);
  if (document.readyState === 'complete') ready();
  else window.addEventListener('load', ready, { once: true });
}

/* ==========================================================================
   Boot / teardown
   ========================================================================== */
let built = false;
let productsSheet = null;
let quickSheet = null;
let search = null;

function build() {
  root.classList.add('m-app');
  if (built) {
    enhanceFooter();
    detached.forEach(({ section, mark }) => section.isConnected && section.replaceWith(mark));
    return;
  }
  built = true;

  productsSheet = createSheet({ id: 'm-products', label: 'Products', className: 'sheet--products' });
  quickSheet = createSheet({ id: 'm-quick', label: 'Add to quote', className: 'sheet--quick' });
  search = createSearch();
  tabbar = createTabbar(productsSheet);

  enhanceAppBar(search);
  enhanceQuoteDrawer();
  enhanceFooter();
  buildHome();
  addQuickButtons();
  initSpecRows();
  initImageSkeletons();

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-quick-add]');
    if (!add) return;
    const p = getProduct(add.dataset.quickAdd);
    if (p) quickSheet.open(quickAddHTML(p), add);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (search.isOpen) search.close();
    else openSheet?.close();
  });
}

function teardown() {
  root.classList.remove('m-app', 'is-appbar-hidden');
  detached.forEach(({ section, mark }) => mark.isConnected && mark.replaceWith(section));
  openSheet?.close({ instant: true });
  search?.close({ instant: true });
  appBar?.reset();
  restoreFooter.splice(0).forEach((fn) => fn());
}

/** Called by main.js when the phone media query matches. */
export function initMobile(query) {
  build();
  if (initMobile.bound) return;
  initMobile.bound = true;
  query.addEventListener('change', (e) => (e.matches ? build() : teardown()));
}
