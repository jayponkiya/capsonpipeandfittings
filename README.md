# CAPSON Pipe & Fittings: static website

Plain HTML + CSS + vanilla JS (ES modules). No framework, no build step.

## Run locally

```
npx serve .
```

ES modules need a server; opening the files directly with `file://` will not load the JS.

## Where things live

| What | File |
| --- | --- |
| WhatsApp number, show/hide prices, brand facts | `js/config.js` (`CONFIG`, `BRAND`) |
| WhatsApp link helper | `js/whatsapp.js` (`buildLink(message)`) |
| Header, mega menu, mobile drawer, footer, floating WhatsApp | `js/layout.js` (injected into every page) |
| All products, sizes, packing, rates, terms | `data/products.js` |
| Data QA: every table, row counts, spot checks | `data/QA.md` |
| Design tokens (colours, fonts, spacing) | `css/tokens.css` |
| Reset, typography, buttons, layout | `css/base.css` |
| Header, menus, footer, sections, catalogue | `css/components.css` |
| Visual reference for approval | `styleguide.html` (noindex) |
| Catalogue pages: grid (products.html), category blocks (upvc/cpvc/agri), filters + GSAP Flip, detail modal | `js/catalogue.js` |
| Shared product templates: cards, panels, quote tables, swatches, WhatsApp text | `js/product-ui.js` |
| Quote cart: localStorage store, header badge, drawer, send form | `js/quote.js` |
| Animations (GSAP, ScrollTrigger, SplitText, Lenis) | `js/animations.js` |
| Product photos (cut out from the PDF, transparent) | `assets/img/products/<slug>.webp` |
| Hero group shots + satisfaction badge | `assets/img/brand/hero-*.webp`, `badge-satisfaction.webp` |

### Before going live

1. Set the real number in `js/config.js` → `WHATSAPP_NUMBER` (digits only, with country code, e.g. `919876543210`).
2. To show catalogue rates, set `SHOW_PRICES: true` in the same file.
3. The canonical/OG URLs, `sitemap.xml` and `robots.txt` use `https://www.capsonpipeandfittings.com` (the address printed on the catalogue). Change them if the domain is different.

### Adding or editing a product

Add an entry to the right array in `data/products.js` with `p(line, type, slug, name, preset, rows)`
and add its slug to the `PAGES` map (catalogue page number). Put a transparent image at
`assets/img/products/<slug>.webp`. Pages, menus and counts pick it up automatically.

### Deep links

- `upvc.html#upvc-plain-elbow` opens that product's spec table.
- `upvc.html#upvc-valves` jumps to that category block (the mega menu uses these).
- `agri.html` replaced `garden-pipes.html`; the old URL redirects (hash kept).
- `products.html?line=cpvc&type=valves&q=3/4` pre-filters the full catalogue.

### Header and footer

Edit them once in `js/layout.js`. Pages only contain `<div data-site-header>` and `<div data-site-footer>`
slots (plus a `<noscript>` link bar for visitors without JavaScript). The Products mega menu is built
from `data/products.js`, so new categories appear automatically.

## Motion and accessibility

Three tiers, decided in `js/motion-prefs.js` + `gsap.matchMedia()` in `js/animations.js`:

| Tier | When | What runs |
| --- | --- | --- |
| Full | Desktop (>=1024px), motion allowed, capable device | Lenis smooth scroll (synced to ScrollTrigger via `gsap.ticker`), page-transition wipe, hero text reveal, pinned product strip, scrubbed flow line, swoosh + image parallax, image reveal masks, magnetic buttons, counters, fades |
| Basic | Phones/tablets, motion allowed | Page transitions, counters, fades (hero paints immediately for fast LCP) |
| Lite | `prefers-reduced-motion` or a low-end device (Save-Data, <=2 cores or <=2 GB, or a touch device with <=4 cores and <=4 GB) | Opacity fades only: no smooth scroll, pinning, scrubbing, parallax, masks, magnetic, transitions or pulse |

- Test a tier on any page with `?motion=lite` or `?motion=full` (remembered for the tab).
- Everything is created inside `gsap.matchMedia()`, so crossing a breakpoint kills and rebuilds
  ScrollTriggers cleanly; `ScrollTrigger.config({ ignoreMobileResize: true })` avoids re-measuring
  on mobile address-bar resizes.
- Page transitions skip new-tab/modifier clicks, downloads, PDFs, WhatsApp/mailto links and
  same-page hash links; the back button (bfcache) resets the overlay.
- If the CDN is unreachable, the site still works, just without animation.

## Quote cart

- Every spec-table row has a quantity stepper and **Add to Quote**; the list is saved in the
  visitor's browser (localStorage key `capson-quote-v1`) and synced across open tabs.
- The header **Quote** button opens the drawer: change quantities, remove items, clear all.
- **Send Quote on WhatsApp** requires name and city (note optional) and opens:
  `Hello Capson (Shreenath Polytech), I want a quote for:` + numbered `Product - Size x Qty` lines.
- Each product card/panel also has **Get Quote** for a single product, straight to WhatsApp.

## Pages

| Page | What it is |
| --- | --- |
| index.html | Home |
| products.html | All products grid with filters + search |
| upvc.html, cpvc.html, agri.html | Line pages: category blocks with quote-ready spec tables |
| catalogue.html | PDF preview: page-flip viewer, page thumbnails, download + printed-copy request |
| about.html | Story, tagline meaning, timeline, manufacturing focus, business facts |
| why-capson.html | Hot vs cold guide, UPVC vs CPVC table, packing & dispatch, terms (#terms), FAQ |
| contact.html | Enquiry form (to WhatsApp), address card, map, directions |
| 404.html | Not-found page with the pipe animation |
| styleguide.html | Design system reference (noindex) |
| garden-pipes.html | Redirect to agri.html (old URL) |

Catalogue page images live in assets/img/catalogue/page-N.webp (900px) and page-N-sm.webp (360px).
