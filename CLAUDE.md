# Project: CAPSON Pipe & Fittings, static website

## Business facts (only use these, never invent claims or certifications)
- Brand: CAPSON, tagline "Easy to Flow Forever" (® registered)
- Manufacturer: Shreenath Polytech, Rajkot, Gujarat, India
- Proprietor: Dhaval Patel
- Address: Plot No 15, SR No. 452/3, Nr Jay Sardar Starch, Shapar, Kotda Sangani, Rajkot - 360024, Gujarat
- Established 2017 (Sole Proprietorship), GST No. 24CICPP9418B1ZF, team up to 10 people
- Email: dpsmart94@gmail.com
- WhatsApp number: PLACEHOLDER 91XXXXXXXXXX (single constant in js/config.js; owner will give real number)
- Brochure promise: "100% Satisfaction Guaranteed", "UPVC & CPVC pipe and fitting for hot & cold water plumbing solution"
- Terms from brochure: GST extra, Rajkot jurisdiction, advance/immediate payment only, goods sent by transport at buyer's risk, packing & forwarding extra, E&OE.
- Map: https://maps.google.com?q=22.16376,70.78683

## Product lines (from catalogue PDF in assets/pdf)
1. UPVC Pipes & Fittings (SCH-40, SCH-80 pipes + plain/brass fittings, valves, nipples, clamps, solvent)
2. CPVC Pipes & Fittings (SDR-11, SDR-13.5 pipes + fittings, brass fittings, valves, solvent)
3. Agri / Garden Pipes (Transparent/Zibra/Petrol, Halwa/Dual, Blue Metallic, Colour Virgin, Contractor, Level pipe)

## Tech
- Pure static: HTML + CSS + vanilla JS (ES modules). No framework, no build step needed. Must open with `npx serve`.
- GSAP 3 + ScrollTrigger (+ SplitText, now free) + Lenis smooth scroll, loaded from jsDelivr CDN.
- All product data lives in data/products.js (single source of truth). Pages render from it.
- Multi-page site (real .html files per page, each with its own <title>, meta description, OG tags).

## Design tokens (from the logo + brochure)
--red: #ED1C24; --red-dark: #A50E14; --black: #0A0A0A; --ink: #141414;
--white: #FFFFFF; --bg-soft: #F3F4F6; --cpvc-cream: #D8C6A0; --water-blue: #1FA2D8;
Fonts (Google Fonts, display=swap; defined ONLY as variables in css/tokens.css):
- --font-display: 'Unbounded' 500/700: all headings (wide, techy, close to the CAPSON wordmark).
- --font-body: 'Outfit' 300/400/500/600: body, UI, buttons, tables. Numbers in spec tables and
  counters use font-variant-numeric: tabular-nums.
- --font-accent: 'Merienda' 400: the "Easy to Flow Forever" tagline and small accent quotes
  (slanted by design; never apply faux italic).
- Never use Poppins, Roboto, Inter, Arial, Open Sans or similar generic sans-serifs, and never
  hard-code a font name outside css/tokens.css.
  Only exception: the 'Unbounded Fallback' / 'Outfit Fallback' @font-face rules in tokens.css use
  local('Arial') scaled with size-adjust, purely as an invisible load-time stand-in so text does
  not reflow when the web fonts swap in (keeps CLS at 0). Re-measure the ratios if fonts change.
- Use em (not ch) for text max-widths: ch depends on the font and reflows on font swap.
Type: headings line-height 1.15, letter-spacing -0.01em; body line-height 1.6.
Look: black hero, red swooshes (like brochure cover), white/soft-grey sections, red CTAs, pipe/water "flow" line motif.
Accessibility addition: --red-ui: #D4171E is used for buttons and small red text on light backgrounds (brand red on white is 4.38:1, below WCAG AA).

## Rules
- Mobile first. Must score 90+ Lighthouse performance; lazy-load images, webp.
- Respect prefers-reduced-motion (disable pinned/scrub animations, keep fades).
- Use gsap.matchMedia() so heavy animations only run on desktop.
- All "Get Quote" actions open WhatsApp (wa.me) with a prefilled message. No backend.
- Prices: config flag SHOW_PRICES in js/config.js (default false). Catalogue "RATE" is the dealer rate, GST extra.
- Fix obvious typos from the catalogue in display text (e.g. "PACKINGIN BOX" -> "Packing in Box", "THRED" -> "Thread", "Transaction Bush" -> "Transition Bush", "LEVAL PIPE" -> "Level Pipe", "FOR TEE" -> "Four Way Tee / Cross Tee"), but keep numbers exactly as in PDF.
- Keep code clean, commented, no inline styles, semantic HTML, accessible (alt, aria, focus states).

## Data QA
- data/QA.md lists every catalogue table with row counts and spot checks against the PDF.
