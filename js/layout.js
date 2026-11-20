/**
 * Shared layout: header (with Products mega menu), mobile drawer, footer and
 * floating WhatsApp button. Injected into every page so they are edited once.
 *
 * Page markup hooks:  <div data-site-header></div>  …  <div data-site-footer></div>
 * Menu content is generated from data/products.js, so it never drifts from the catalogue.
 */
import { CONFIG, BRAND } from './config.js';
import { isLiteMotion } from './motion-prefs.js';
import { lines, categories, products } from '../data/products.js';
import { $, $$, esc, notifyModal, ICONS } from './utils.js';

const CHEVRON =
  '<svg class="nav__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

const QUOTE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="M9 11h6M9 15h4"/></svg>';

const TOP_ICONS = {
  check: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
};

const NAV = [
  { href: 'index.html', label: 'Home' },
  { mega: true, label: 'Products' },
  { href: 'catalogue.html', label: 'Catalogue' },
  { href: 'about.html', label: 'About' },
  { href: 'why-capson.html', label: 'Why Capson' },
  { href: 'contact.html', label: 'Contact' },
];

/* ---------- Helpers ---------- */

/** "upvc.html", "/upvc", "/upvc.html" -> "upvc"; "/" -> "index" */
const pageKey = (path) => path.split('#')[0].split('/').pop().replace(/\.html$/, '') || 'index';
const currentKey = pageKey(location.pathname);
/** Pages that belong to the Products menu (it is a button, so it gets a class, not aria-current). */
const PRODUCT_PAGES = ['products', 'upvc', 'cpvc', 'agri'];
const isCurrent = (href) => !href.includes('#') && pageKey(href) === currentKey;
const current = (href) => (isCurrent(href) ? ' aria-current="page"' : '');

/** Menu groups per line: categories for UPVC/CPVC, individual products for Agri. */
function menuGroups() {
  return lines.map((line) => {
    const links =
      line.id === 'agri'
        ? products
            .filter((p) => p.line === 'agri')
            .map((p) => ({ href: `${line.page}#${p.slug}`, label: p.name.replace(/ Garden Pipe$/, '') }))
        : categories
            .filter((c) => c.line === line.id)
            .map((c) => ({
              href: `${line.page}#${c.id}`,
              label: c.short,
              count: products.filter((p) => p.category === c.id).length,
            }));
    return { line, links };
  });
}

/* ---------- Templates ---------- */

/** Copyright + designer credit, shared by the footer and the mobile menu. */
function copyrightHTML() {
  const year = new Date().getFullYear();
  return `© ${year} ${esc(BRAND.manufacturer)}. ${BRAND.name}® is a registered trademark. Design and development by <a class="footer__credit" href="https://letvarsolution.com/" target="_blank" rel="noopener">Letvar Solution</a>`;
}

function headerHTML(groups) {
  const navItems = NAV.map((item) =>
    item.mega
      ? `<li><button class="nav__link${PRODUCT_PAGES.includes(currentKey) ? ' is-active' : ''}" type="button" data-mega-trigger aria-expanded="false" aria-controls="mega-menu">${item.label}${CHEVRON}</button></li>`
      : `<li><a class="nav__link" href="${item.href}"${current(item.href)}>${item.label}</a></li>`
  ).join('');

  const megaCols = groups
    .map(
      ({ line, links }) => `
      <div class="mega__col" data-mega-col>
        <span class="mega__line mega__line--${line.id}" aria-hidden="true"></span>
        <h2><a href="${line.page}">${esc(line.name)}</a></h2>
        <ul class="mega__links">
          ${links
            .map(
              (l) =>
                `<li><a href="${l.href}" data-mega-link>${esc(l.label)}${l.count ? `<small>${l.count}</small>` : ''}</a></li>`
            )
            .join('')}
        </ul>
        <a class="mega__all" href="${line.page}" data-mega-link>View all ${esc(line.short)} ${ICONS.arrow}</a>
      </div>`
    )
    .join('');

  const drawerGroups = groups
    .map(
      ({ line, links }) => `
      <div class="drawer__group">
        <h3><a href="${line.page}">${esc(line.name)}</a></h3>
        <ul>${links.map((l) => `<li><a href="${l.href}">${esc(l.label)}</a></li>`).join('')}</ul>
      </div>`
    )
    .join('');

  const drawerItems = NAV.map((item) =>
    item.mega
      ? `<li class="drawer__item" data-drawer-item>
          <button class="drawer__link" type="button" data-accordion aria-expanded="false" aria-controls="drawer-products">${item.label}${CHEVRON}</button>
          <div class="drawer__panel" id="drawer-products" hidden>${drawerGroups}</div>
        </li>`
      : `<li class="drawer__item" data-drawer-item><a class="drawer__link" href="${item.href}"${current(item.href)}>${item.label}</a></li>`
  ).join('');

  return `
  <header class="site-header" data-header>
    <div class="topbar">
      <div class="container topbar__inner">
        <p class="topbar__note">${TOP_ICONS.check}<span>Manufacturer of UPVC &amp; CPVC pipes &amp; fittings · Shapar, Rajkot · Since ${BRAND.established}</span></p>
        <ul class="topbar__links">
          <li class="topbar__gst">${TOP_ICONS.doc}<span>GST No. <strong>${BRAND.gst}</strong></span></li>
          <li><a href="mailto:${BRAND.email}">${TOP_ICONS.mail}${BRAND.email}</a></li>
          <li><a href="contact.html" data-wa>${ICONS.whatsapp}WhatsApp us</a></li>
          <li><a href="${CONFIG.CATALOGUE_PDF}" target="_blank" rel="noopener">${TOP_ICONS.doc}Catalogue PDF</a></li>
        </ul>
      </div>
    </div>
    <div class="header__bar" data-header-bar>
      <div class="container header__inner">
        <a class="brand" href="index.html" aria-label="${BRAND.name} home">
          <img src="${BRAND.logo}" alt="${BRAND.name}: ${BRAND.tagline}" width="240" height="158">
        </a>
        <nav class="nav" aria-label="Main">
          <ul class="nav__list">${navItems}</ul>
        </nav>
        <div class="header__actions">
          <button class="quote-btn" type="button" data-quote-open aria-controls="quote-drawer" aria-expanded="false" aria-label="Quote list, 0 items">
            ${QUOTE_ICON}<span class="quote-btn__label">Quote list</span>
            <span class="quote-btn__count" data-quote-count hidden>0</span>
          </button>
          <a class="btn btn--sm header__cta" href="contact.html" data-wa>${ICONS.whatsapp}Get Quote</a>
          <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="drawer">
            <span class="sr-only">Menu</span><span class="menu-toggle__bar" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>
  </header>

  <div class="mega" id="mega-menu" data-mega hidden>
    <div class="container mega__inner">
      ${megaCols}
      <div class="mega__feature" data-mega-col>
        <img src="assets/img/brand/hero-cpvc-set-700.webp" alt="" width="1400" height="1002" loading="lazy" decoding="async">
        <h2>The full CAPSON catalogue</h2>
        <p>All ${products.length} products with sizes and packing, in one PDF.</p>
        <div class="btn-row">
          <a class="btn btn--sm" href="${CONFIG.CATALOGUE_PDF}" target="_blank" rel="noopener" data-mega-link>Download Catalogue</a>
          <a class="btn btn--sm btn--ghost" href="catalogue.html" data-mega-link>Preview pages</a>
        </div>
      </div>
    </div>
  </div>

  <div class="drawer" id="drawer" data-drawer hidden>
    <ul class="drawer__list">${drawerItems}</ul>
    <div class="drawer__footer" data-drawer-item>
      <a class="btn" href="contact.html" data-wa>${ICONS.whatsapp}Get Quote on WhatsApp</a>
      <p>${esc(BRAND.manufacturer)}, Shapar, Rajkot<br><a href="mailto:${BRAND.email}">${BRAND.email}</a></p>
      <p class="drawer__legal">${copyrightHTML()}</p>
    </div>
  </div>`;
}

function footerHTML() {
  return `
  <footer class="site-footer">
    <div class="container footer__grid">
      <div class="footer__brand">
        <img src="${BRAND.logo}" alt="${BRAND.name}" width="240" height="158" loading="lazy">
        <p class="tagline">${BRAND.tagline}®</p>
        <p>${esc(BRAND.strapline)}. Manufactured by ${esc(BRAND.manufacturer)}, Rajkot, since ${BRAND.established}.</p>
      </div>
      <div>
        <h2>Quick links</h2>
        <ul>
          <li><a href="index.html">Home</a></li>
          <li><a href="products.html">All products</a></li>
          <li><a href="catalogue.html">Catalogue</a></li>
          <li><a href="about.html">About us</a></li>
          <li><a href="why-capson.html">Why Capson</a></li>
          <li><a href="why-capson.html#terms">Terms of sale</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
      <div>
        <h2>Product lines</h2>
        <ul>
          ${lines.map((l) => `<li><a href="${l.page}">${esc(l.name)}</a></li>`).join('')}
          <li><a href="${CONFIG.CATALOGUE_PDF}" target="_blank" rel="noopener">Catalogue (PDF)</a></li>
        </ul>
      </div>
      <div>
        <h2>Contact</h2>
        <address>${esc(BRAND.manufacturer)}<br>${esc(BRAND.address)}</address>
        <ul>
          <li><a href="mailto:${BRAND.email}">${BRAND.email}</a></li>
          <li><a href="contact.html" data-wa>WhatsApp us</a></li>
          <li><a href="${BRAND.mapUrl}" target="_blank" rel="noopener">Open in Google Maps</a></li>
        </ul>
      </div>
    </div>
    <div class="container">
      <p class="footer__terms">${esc(BRAND.terms)}</p>
    </div>
    <div class="container footer__bottom">
      <p>${copyrightHTML()}</p>
      <p>GST No. ${BRAND.gst}</p>
    </div>
  </footer>
  <a class="wa-float" href="contact.html" data-wa aria-label="Chat with ${BRAND.name} on WhatsApp">${ICONS.whatsapp}</a>`;
}

/* ---------- Behaviour ---------- */

const motionOK = () => window.gsap && !isLiteMotion();

/** Header turns solid black with blur after scrolling. */
function initScrollState(header) {
  // Past the top: the top bar slides away and the main bar turns solid.
  const update = () => header.classList.toggle('is-solid', window.scrollY > 24);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

/** Desktop mega menu: hover (mouse) or click (touch/keyboard), Esc to close. */
function initMega(header, mega) {
  const trigger = $('[data-mega-trigger]', header);
  if (!trigger) return;
  const hoverable = matchMedia('(hover: hover) and (min-width: 1024px)');
  let tl = null;
  let open = false;
  let timer;

  const buildTimeline = () => {
    const { gsap } = window;
    return gsap
      .timeline({
        paused: true,
        onReverseComplete: () => {
          mega.hidden = true;
        },
      })
      .fromTo(mega, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.45, ease: 'power3.out' })
      .from($$('[data-mega-col]', mega), { y: 24, opacity: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }, 0.12)
      .from($$('[data-mega-link]', mega), { opacity: 0, duration: 0.25, stagger: 0.012 }, 0.22);
  };

  const setOpen = (next) => {
    if (next === open) return;
    open = next;
    trigger.setAttribute('aria-expanded', String(open));
    header.classList.toggle('is-menu-open', open);
    if (open) {
      // The top bar may be visible or scrolled away: open right under the visible bar.
      mega.style.top = `${Math.max(0, $('[data-header-bar]', header).getBoundingClientRect().bottom)}px`;
      mega.hidden = false;
    }
    if (motionOK()) {
      tl ||= buildTimeline();
      open ? tl.timeScale(1).play() : tl.timeScale(1.6).reverse();
    } else if (!open) {
      mega.hidden = true;
    }
  };

  trigger.addEventListener('click', () => setOpen(!open));

  // Hover intent on devices with a mouse.
  const enter = () => {
    if (!hoverable.matches) return;
    clearTimeout(timer);
    timer = setTimeout(() => setOpen(true), 80);
  };
  const leave = () => {
    if (!hoverable.matches) return;
    clearTimeout(timer);
    timer = setTimeout(() => setOpen(false), 220);
  };
  [trigger.parentElement, mega].forEach((el) => {
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      trigger.focus();
    }
  });
  // Close when focus or a click moves outside header + panel.
  const outside = (target) => !header.contains(target) && !mega.contains(target);
  document.addEventListener('focusin', (e) => open && outside(e.target) && setOpen(false));
  document.addEventListener('click', (e) => open && outside(e.target) && setOpen(false));
  mega.addEventListener('click', (e) => e.target.closest('a') && setOpen(false));
  hoverable.addEventListener('change', () => setOpen(false));
}

/** Mobile drawer with Products accordion. */
function initDrawer(header, drawer) {
  const toggle = $('[data-menu-toggle]', header);
  const accordion = $('[data-accordion]', drawer);
  const panel = $('#drawer-products', drawer);
  let open = false;

  const setOpen = (next) => {
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    header.classList.toggle('is-menu-open', open);
    document.documentElement.classList.toggle('is-locked', open);
    notifyModal(open);
    if (open) {
      drawer.hidden = false;
      if (motionOK()) {
        const { gsap } = window;
        gsap.fromTo(drawer, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.5, ease: 'power3.out' });
        gsap.from($$('[data-drawer-item]', drawer), { y: 24, opacity: 0, duration: 0.45, stagger: 0.05, delay: 0.15, ease: 'power2.out' });
      }
    } else if (motionOK()) {
      window.gsap.to(drawer, {
        clipPath: 'inset(0 0 100% 0)',
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => (drawer.hidden = true),
      });
    } else {
      drawer.hidden = true;
    }
  };

  toggle.addEventListener('click', () => setOpen(!open));
  drawer.addEventListener('click', (e) => e.target.closest('a') && setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      toggle.focus();
    }
  });
  matchMedia('(min-width: 1024px)').addEventListener('change', (e) => e.matches && open && setOpen(false));

  accordion?.addEventListener('click', () => {
    const expand = accordion.getAttribute('aria-expanded') !== 'true';
    accordion.setAttribute('aria-expanded', String(expand));
    if (expand) {
      panel.hidden = false;
      if (motionOK()) {
        window.gsap.fromTo(panel, { height: 0 }, { height: 'auto', duration: 0.4, ease: 'power2.out' });
        window.gsap.from($$('.drawer__group', panel), { y: 12, opacity: 0, stagger: 0.06, duration: 0.35, delay: 0.1 });
      }
    } else if (motionOK()) {
      window.gsap.to(panel, { height: 0, duration: 0.3, ease: 'power2.in', onComplete: () => (panel.hidden = true) });
    } else {
      panel.hidden = true;
    }
  });
}

/** Render header + footer into the page and wire their behaviour. */
export function renderLayout() {
  const headerSlot = $('[data-site-header]');
  const footerSlot = $('[data-site-footer]');
  if (headerSlot) headerSlot.outerHTML = headerHTML(menuGroups());
  if (footerSlot) footerSlot.outerHTML = footerHTML();

  const header = $('[data-header]');
  if (!header) return;
  initScrollState(header);
  initMega(header, $('[data-mega]'));
  initDrawer(header, $('[data-drawer]'));
}
