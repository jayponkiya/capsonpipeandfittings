/**
 * Catalogue pages.
 *
 *   <div data-catalogue data-line="all|upvc|cpvc|agri" data-view="grid|blocks"></div>
 *
 * grid   (products.html): all product cards, line + type chips, search.
 * blocks (line pages):    one block per category (heading, image, description) with a
 *                         panel per product and its quote-ready spec table.
 *
 * Filtering never re-renders: items are shown/hidden and GSAP Flip animates the change.
 * URL support: ?q=elbow  ?type=valves  ?line=cpvc   #product-slug opens the detail modal,
 * #category-id jumps to that block (blocks) or filters to it (grid).
 */
import { products, lines, categories, FILTERS, TYPES, getLine, getProduct, rowLabel, sizeRange } from '../data/products.js';
import { $, $$, esc, notifyLayout, notifyModal, ICONS } from './utils.js';
import { buildLink } from './whatsapp.js';
import {
  cardTemplate,
  panelTemplate,
  quoteTableTemplate,
  agriFactsTemplate,
  swatchesTemplate,
  singleQuoteLink,
  normalise,
} from './product-ui.js';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Searchable text for a product: name, alias, line, type and every size label. */
const haystack = (p) =>
  normalise([p.name, p.aka, getLine(p.line).short, TYPES[p.type].label, ...p.rows.map((r) => rowLabel(p, r))].join(' '));

/* ---------- Detail modal ---------- */
function relatedProducts(p, max = 4) {
  const same = products.filter((x) => x.category === p.category && x.slug !== p.slug);
  const line = products.filter((x) => x.line === p.line && x.category !== p.category);
  return [...same, ...line].slice(0, max);
}

function detailTemplate(p) {
  const line = getLine(p.line);
  const related = relatedProducts(p);
  return `
    <div class="detail">
      <div class="detail__media">
        <img src="${p.image}" srcset="${p.image.replace(/\.webp$/, '-400.webp')} 400w, ${p.image} 800w" sizes="(min-width: 900px) 360px, 100vw" alt="${esc(p.name)}" width="800" height="800">
      </div>
      <div class="detail__body">
        <a class="badge badge--${line.id}" href="${line.page}">${esc(line.name)}</a>
        <h2 class="detail__title" id="detail-title">${esc(p.name)}</h2>
        ${p.aka ? `<p class="product-card__aka">${esc(p.aka)}</p>` : ''}
        <p class="product-card__sizes">${esc(sizeRange(p))} · ${p.rows.length} ${p.rows.length === 1 ? 'option' : 'options'} · Catalogue page ${p.page}</p>
        ${agriFactsTemplate(p)}
        ${swatchesTemplate(p)}
        <h3 class="detail__sub">Sizes &amp; packing</h3>
        <p class="detail__hint">Set a quantity and use <strong>Add to Quote</strong> to build one WhatsApp request for several items.</p>
        ${quoteTableTemplate(p)}
        <div class="detail__actions">
          <a class="btn" href="${singleQuoteLink(p)}" target="_blank" rel="noopener">${ICONS.whatsapp}Get Quote on WhatsApp</a>
          <button class="btn btn--ghost" type="button" data-quote-open aria-controls="quote-drawer">View quote list</button>
        </div>
        ${
          related.length
            ? `<h3 class="detail__sub">Related products</h3>
               <div class="detail__related">${related.map((r) => cardTemplate(r, { compact: true })).join('')}</div>`
            : ''
        }
      </div>
    </div>`;
}

function createDetail() {
  const dialog = document.createElement('dialog');
  dialog.className = 'spec-dialog detail-dialog';
  dialog.setAttribute('aria-labelledby', 'detail-title');
  dialog.innerHTML = `
    <button class="spec__close" type="button" data-close aria-label="Close">${ICONS.close}</button>
    <div class="detail-dialog__scroll" data-detail-content></div>`;
  document.body.append(dialog);
  let opener = null;

  const open = (slug, trigger) => {
    const p = getProduct(slug);
    if (!p) return;
    if (!dialog.open) opener = trigger || document.activeElement;
    const content = $('[data-detail-content]', dialog);
    content.innerHTML = detailTemplate(p);
    content.scrollTop = 0;
    if (!dialog.open) {
      dialog.showModal();
      notifyModal(true);
    }
    history.replaceState(null, '', `${location.pathname}${location.search}#${slug}`);
  };

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close]')) return dialog.close();
    const rel = e.target.closest('[data-open]');
    if (rel) open(rel.dataset.open);
    // The quote drawer sits outside the dialog: close the dialog first.
    if (e.target.closest('[data-quote-open]')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    notifyModal(false);
    history.replaceState(null, '', location.pathname + location.search);
    opener?.focus?.();
  });
  return { open };
}

/**
 * Sidebar filters for the all-products grid. On desktop a sticky left column; on small
 * screens the same markup collapses into a sticky bar with horizontally scrolling options.
 */
function sidebarTemplate(filtersHere, q) {
  const count = (fn) => products.filter(fn).length;
  const option = (group, value, label, n) =>
    `<button class="filter-option" type="button" data-filter="${group}" data-value="${value}" aria-pressed="false"><span>${esc(label)}</span><span class="filter-option__count">${n}</span></button>`;
  const lineOptions = [
    option('line', 'all', 'All lines', products.length),
    ...lines.map((l) => option('line', l.id, l.short === 'Agri' ? 'Agri / Garden' : l.short, count((p) => p.line === l.id))),
  ];
  const typeOptions = filtersHere.map((f) =>
    option('type', f.id, f.id === 'all' ? 'All types' : f.label, f.id === 'all' ? products.length : count((p) => f.types.includes(p.type)))
  );
  return `
    <aside class="cat-sidebar" aria-label="Filter products">
      <div class="search">
        ${ICONS.search}
        <label class="sr-only" for="catalogue-search">Search by product name or size</label>
        <input id="catalogue-search" type="search" placeholder="Search name or size, e.g. elbow 3/4" autocomplete="off" value="${esc(q)}">
      </div>
      <div class="filter-group">
        <h2 class="filter-group__title" id="filter-line">Product line</h2>
        <div class="filter-group__options" role="group" aria-labelledby="filter-line">${lineOptions.join('')}</div>
      </div>
      <div class="filter-group">
        <h2 class="filter-group__title" id="filter-type">Type</h2>
        <div class="filter-group__options" role="group" aria-labelledby="filter-type">${typeOptions.join('')}</div>
      </div>
      <button class="filter-reset" type="button" data-reset>Reset filters</button>
      <div class="cat-sidebar__help">
        <strong>Need help choosing?</strong>
        <p>Send us your requirement and we will suggest the right sizes.</p>
        <a class="btn btn--sm" href="contact.html" data-wa>${ICONS.whatsapp}WhatsApp us</a>
      </div>
    </aside>`;
}

/** Sidebar for line pages: search, category jump list (scroll-spied), type filters. */
function blocksSidebarTemplate(scope, filtersHere, q) {
  const cats = categories.filter((c) => c.line === scope);
  const jumpItems =
    cats.length > 1
      ? cats.map((c) => ({ id: c.id, label: c.short, n: products.filter((p) => p.category === c.id).length }))
      : products.filter((p) => p.line === scope).map((p) => ({ id: p.slug, label: p.name.replace(/ Garden Pipe$/, ''), n: p.rows.length }));
  const jump = jumpItems
    .map(
      (j) =>
        `<a class="filter-option" href="#${j.id}" data-cat-link="${j.id}"><span>${esc(j.label)}</span><span class="filter-option__count">${j.n}</span></a>`
    )
    .join('');
  const base = products.filter((p) => p.line === scope);
  const typeOptions =
    filtersHere.length > 2
      ? filtersHere
          .map(
            (f) =>
              `<button class="filter-option" type="button" data-filter="type" data-value="${f.id}" aria-pressed="false"><span>${esc(
                f.id === 'all' ? 'All types' : f.label
              )}</span><span class="filter-option__count">${f.id === 'all' ? base.length : base.filter((p) => f.types.includes(p.type)).length}</span></button>`
          )
          .join('')
      : '';
  return `
    <aside class="cat-sidebar" aria-label="Browse ${esc(getLine(scope).name)}">
      <div class="search">
        ${ICONS.search}
        <label class="sr-only" for="catalogue-search">Search by product name or size</label>
        <input id="catalogue-search" type="search" placeholder="Search name or size, e.g. elbow 3/4" autocomplete="off" value="${esc(q)}">
      </div>
      <nav class="filter-group" aria-labelledby="filter-jump">
        <h2 class="filter-group__title" id="filter-jump">${cats.length > 1 ? 'Categories' : 'Pipe types'}</h2>
        <div class="filter-group__options filter-group__options--jump">${jump}</div>
      </nav>
      ${
        typeOptions
          ? `<div class="filter-group filter-group--types">
        <h2 class="filter-group__title" id="filter-type">Filter by type</h2>
        <div class="filter-group__options" role="group" aria-labelledby="filter-type">${typeOptions}</div>
      </div>`
          : ''
      }
      <button class="filter-reset" type="button" data-reset>Reset filters</button>
      <div class="cat-sidebar__help">
        <strong>Need help choosing?</strong>
        <p>Send us your requirement and we will suggest the right sizes.</p>
        <a class="btn btn--sm" href="contact.html" data-wa>${ICONS.whatsapp}WhatsApp us</a>
      </div>
    </aside>`;
}

function blockTemplate(c) {
  const items = products.filter((p) => p.category === c.id);
  return `
      <section class="cat-block" id="${c.id}" data-block aria-labelledby="${c.id}-title">
        <header class="cat-block__head">
          <img class="cat-block__img" data-mask src="${c.image.replace(/\.webp$/, '-400.webp')}" alt="" width="160" height="160" loading="lazy" decoding="async">
          <div>
            <h2 class="cat-block__title" id="${c.id}-title">${esc(c.name)}</h2>
            <p class="cat-block__desc">${esc(c.description)}</p>
            <p class="cat-block__count"><span data-block-count>${items.length}</span> ${items.length === 1 ? 'product' : 'products'}</p>
          </div>
        </header>
        <div class="cat-block__items">${items.map(panelTemplate).join('')}</div>
      </section>`;
}

/** Let the browser breathe between chunks (keeps each task short). */
const nextTask = () => (window.scheduler?.yield ? window.scheduler.yield() : new Promise((r) => setTimeout(r, 0)));

/** Insert category blocks one at a time instead of one huge innerHTML. */
async function renderBlocks(container, scope) {
  for (const c of categories.filter((x) => x.line === scope)) {
    container.insertAdjacentHTML('beforeend', blockTemplate(c));
    await nextTask();
  }
}

/* ---------- Catalogue ---------- */
export async function initCatalogue(root) {
  const scope = root.dataset.line || 'all';
  const view = root.dataset.view || (scope === 'all' ? 'grid' : 'blocks');
  const base = scope === 'all' ? products : products.filter((p) => p.line === scope);
  const filtersHere = FILTERS.filter((f) => f.id === 'all' || base.some((p) => f.types.includes(p.type)));

  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get('q') || '',
    type: filtersHere.some((f) => f.id === params.get('type')) ? params.get('type') : 'all',
    line: scope === 'all' ? params.get('line') || 'all' : scope,
  };

  root.innerHTML =
    view === 'grid'
      ? `
    <div class="catalogue-layout">
      ${sidebarTemplate(filtersHere, state.q)}
      <div class="catalogue-main">
        <p class="catalogue__count" aria-live="polite" data-count-out></p>
        <div class="grid grid--catalogue" data-grid>${base.map((p) => cardTemplate(p)).join('')}</div>
        <p class="empty" data-empty hidden></p>
      </div>
    </div>`
      : `
    <div class="catalogue-layout catalogue-layout--blocks">
      ${blocksSidebarTemplate(scope, filtersHere, state.q)}
      <div class="catalogue-main">
        <p class="catalogue__count" aria-live="polite" data-count-out></p>
        <div class="cat-blocks" data-blocks></div>
        <p class="empty" data-empty hidden></p>
      </div>
    </div>`;
  if (view === 'blocks') await renderBlocks($('[data-blocks]', root), scope);

  const index = new Map(base.map((p) => [p.slug, haystack(p)]));
  const items = $$('[data-item]', root);
  const blocks = $$('[data-block]', root);
  const countOut = $('[data-count-out]', root);
  const empty = $('[data-empty]', root);
  const detail = createDetail();
  const { gsap, Flip } = window;
  if (gsap && Flip) gsap.registerPlugin(Flip);

  const matches = (el, terms) => {
    const p = getProduct(el.dataset.slug);
    const filter = FILTERS.find((f) => f.id === state.type);
    return (
      (state.line === 'all' || p.line === state.line) &&
      (state.type === 'all' || filter.types.includes(p.type)) &&
      terms.every((t) => index.get(p.slug).includes(t))
    );
  };

  const apply = (animate = true) => {
    const terms = normalise(state.q).split(' ').filter(Boolean);
    const sizeTerms = terms.filter((t) => /\d/.test(t));
    const targets = [...items, ...blocks];
    const flipState = animate && Flip && !reduceMotion() ? Flip.getState(targets) : null;

    let shown = 0;
    items.forEach((el) => {
      const ok = matches(el, terms);
      el.classList.toggle('is-hidden', !ok);
      if (ok) shown += 1;
      // Highlight size rows that match a size-like search term (e.g. 3/4).
      $$('tbody tr', el).forEach((tr) =>
        tr.classList.toggle('is-match', ok && sizeTerms.length > 0 && sizeTerms.every((t) => tr.dataset.size.includes(t)))
      );
    });
    blocks.forEach((b) => {
      const visible = $$('[data-item]:not(.is-hidden)', b).length;
      b.classList.toggle('is-hidden', visible === 0);
      $('[data-block-count]', b).textContent = visible;
    });

    countOut.textContent = `Showing ${shown} of ${base.length} products`;
    empty.hidden = shown > 0;
    if (!shown) {
      empty.innerHTML = `No products match “${esc(state.q)}”${state.type !== 'all' ? ' in this filter' : ''}. Try another name or size, or <a href="${buildLink()}" target="_blank" rel="noopener">ask us on WhatsApp</a>.`;
    }
    $$('[data-filter]', root).forEach((b) =>
      b.setAttribute('aria-pressed', String(state[b.dataset.filter] === b.dataset.value))
    );

    if (flipState) {
      Flip.from(flipState, {
        duration: 0.5,
        ease: 'power2.inOut',
        absolute: true,
        nested: true,
        prune: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.4 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.96, duration: 0.25 }),
        onComplete: notifyLayout,
      });
    } else if (animate) {
      // Initial render happens before ScrollTrigger exists: no refresh needed then.
      notifyLayout();
    }
  };

  // Keep the URL in sync with the filters so a filtered view can be shared or bookmarked.
  const syncUrl = () => {
    if (view !== 'grid') return;
    const p = new URLSearchParams();
    if (state.line !== 'all') p.set('line', state.line);
    if (state.type !== 'all') p.set('type', state.type);
    if (state.q) p.set('q', state.q);
    const qs = p.toString();
    history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
  };

  root.addEventListener('click', (e) => {
    const filter = e.target.closest('[data-filter]');
    if (filter) {
      state[filter.dataset.filter] = filter.dataset.value;
      apply();
      syncUrl();
      return;
    }
    if (e.target.closest('[data-reset]')) {
      Object.assign(state, { q: '', type: 'all', line: scope === 'all' ? 'all' : scope });
      $('#catalogue-search', root).value = '';
      apply();
      syncUrl();
      return;
    }
    const opener = e.target.closest('[data-open]');
    if (opener) detail.open(opener.dataset.open, opener);
  });

  // Category jump links (sidebar + banner tiles): scroll so the target clears the fixed
  // header and the sticky filter bar, keep the hash for sharing, no page transition.
  const scrollToTarget = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.classList.contains('is-hidden') || el.closest('.is-hidden')) {
      Object.assign(state, { q: '', type: 'all' });
      $('#catalogue-search', root).value = '';
      apply(false);
    }
    const targetY = () => {
      const header = $('[data-header-bar]')?.offsetHeight || 0;
      const sidebar = $('.cat-sidebar', root);
      // When the sidebar is a full-width sticky bar (not a column), it also covers content.
      const stickyBar = sidebar && sidebar.offsetWidth > root.offsetWidth * 0.6 ? sidebar.offsetHeight : 0;
      return Math.max(0, el.getBoundingClientRect().top + scrollY - header - stickyBar - 16);
    };
    // Panels skip rendering until near the viewport (content-visibility), so heights above
    // the target are estimates until they render. Jump, let them render, re-measure, correct.
    const jump = (y) => (window.capsonLenis ? window.capsonLenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y));
    // A newer jump cancels any correction loop still running for an older one.
    const token = (scrollToTarget.token = (scrollToTarget.token || 0) + 1);
    // Stop once the position has held for 3 frames in a row (or after 40 frames).
    let stable = 0;
    const settle = (tries) => {
      if (token !== scrollToTarget.token || tries === 0) return;
      const y = targetY();
      if (Math.abs(y - scrollY) < 2) {
        stable += 1;
        if (stable >= 3) return;
      } else {
        stable = 0;
        jump(y);
      }
      requestAnimationFrame(() => settle(tries - 1));
    };
    settle(40);
    history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
  };
  document.addEventListener(
    'click',
    (e) => {
      const link = e.target.closest('[data-cat-link]');
      if (!link || view !== 'blocks') return;
      e.preventDefault();
      e.stopPropagation(); // keep Lenis' anchor handler from scrolling to the raw position
      scrollToTarget(link.dataset.catLink);
    },
    true
  );

  // Scroll-spy: highlight the category currently in view.
  const jumpLinks = $$('.filter-group__options--jump [data-cat-link]', root);
  if (jumpLinks.length && 'IntersectionObserver' in window) {
    const targets = jumpLinks.map((a) => document.getElementById(a.dataset.catLink)).filter(Boolean);
    const visible = new Map();
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => visible.set(en.target.id, en.isIntersecting));
        const current = targets.find((t) => visible.get(t.id));
        jumpLinks.forEach((a) => {
          const on = current && a.dataset.catLink === current.id;
          if (on) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
        // Keep the active chip visible in the horizontal mobile bar.
        const active = jumpLinks.find((a) => a.hasAttribute('aria-current'));
        const bar = active?.parentElement;
        if (active && bar && bar.scrollWidth > bar.clientWidth) {
          bar.scrollTo({ left: active.offsetLeft - 16, behavior: 'smooth' });
        }
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );
    targets.forEach((t) => spy.observe(t));
  }

  // Line tiles in the products banner filter in place instead of reloading the page.
  document.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-line-filter]');
    if (!tile || view !== 'grid') return;
    e.preventDefault();
    state.line = tile.dataset.lineFilter;
    apply();
    syncUrl();
    root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  let timer;
  $('#catalogue-search', root).addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.q = e.target.value;
      apply();
      syncUrl();
    }, 150);
  });

  apply(false);

  // Deep links
  const fromHash = () => {
    const key = decodeURIComponent(location.hash.slice(1));
    if (!key) return;
    if (index.has(key)) {
      detail.open(key);
      return;
    }
    const cat = categories.find((c) => c.id === key && (scope === 'all' || c.line === scope));
    if (!cat) return;
    if (view === 'grid') {
      state.line = cat.line;
      const f = FILTERS.find((x) => x.types?.includes(cat.type));
      state.type = cat.line === 'agri' || !f ? 'all' : f.id;
      apply();
      root.scrollIntoView({ block: 'start' });
    } else {
      scrollToTarget(cat.id);
    }
  };
  fromHash();
  window.addEventListener('hashchange', fromHash);
}

// Re-exported for the styleguide.
export { cardTemplate, quoteTableTemplate as tableTemplate };
