/**
 * Motion layer: GSAP + ScrollTrigger + SplitText + Lenis (all from CDN, global).
 *
 * Tiers (decided by gsap.matchMedia + js/motion-prefs.js):
 *   full  = desktop (>=1024px), motion allowed, not a low-end device:
 *           Lenis smooth scroll, hero intro, pinned range, scrubbed flow line, swoosh +
 *           image parallax, image reveal masks, magnetic buttons, counters, reveals.
 *   basic = mobile/tablet with motion allowed: reveals + counters (hero paints at once).
 *   lite  = prefers-reduced-motion or low-end device: opacity fades only.
 * Everything is created inside gsap.matchMedia(), so crossing a breakpoint reverts it
 * (tweens, ScrollTriggers, inline styles) and rebuilds cleanly: no leaked triggers.
 * If the CDN fails, the site stays fully visible and static.
 */
import { $, $$ } from './utils.js';
import { isLowEnd, hasFinePointer } from './motion-prefs.js';

const root = document.documentElement;

export async function initAnimations() {
  const { gsap, ScrollTrigger, SplitText, Lenis } = window;
  if (!gsap || !ScrollTrigger) {
    root.classList.add('anim-ready');
    return;
  }
  // SplitText must measure lines with the final web font.
  await webFontsReady();
  gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);

  // Mobile address-bar show/hide fires resize: don't re-measure everything for it.
  ScrollTrigger.config({ ignoreMobileResize: true });

  const lowEnd = isLowEnd();
  const lenis = setupLenis(gsap, ScrollTrigger, Lenis, lowEnd);

  const mm = gsap.matchMedia();
  mm.add(
    {
      desktop: '(min-width: 1024px)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      const { desktop, reduce } = ctx.conditions;
      const lite = reduce || lowEnd;
      const full = desktop && !lite;

      heroIntro(gsap, SplitText, full);
      reveals(gsap, ScrollTrigger, lite);
      const cleanups = [];
      if (!lite) cleanups.push(countUps(gsap));
      if (full) {
        cleanups.push(
          pinnedRange(gsap),
          flowLine(gsap),
          swooshParallax(gsap),
          imageParallax(gsap),
          imageMasks(gsap, ScrollTrigger),
          hasFinePointer() ? magnetic(gsap) : null,
          hasFinePointer() ? heroDepth(gsap) : null
        );
      }
      return () => cleanups.forEach((fn) => fn && fn());
    }
  );

  root.classList.add('anim-ready');

  // Re-measure after dynamic content (filters) changes page height.
  // Debounced: filtering can fire several of these in a row and refresh measures the whole page.
  let refreshTimer;
  const queueRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
  };
  window.addEventListener('capson:layout', queueRefresh);
  // Sections with content-visibility:auto change height when they first render
  // (placeholder -> real size), which moves every trigger below them.
  document.addEventListener('contentvisibilityautostatechange', queueRefresh, true);
  window.addEventListener('capson:modal', (e) => (e.detail.open ? lenis?.stop() : lenis?.start()));
}

/**
 * Resolve when the display font is usable (max 1.5s). The Google Fonts stylesheet loads
 * async (media="print" -> "all"), so document.fonts.ready alone can resolve before the
 * @font-face rules even exist: wait for the stylesheet, then for Unbounded itself.
 */
async function webFontsReady(timeout = 1500) {
  if (!document.fonts) return;
  const wait = async () => {
    const sheet = document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
    // The link's onload flips media to "all"; until then the @font-face rules don't exist.
    if (sheet && sheet.media !== 'all') {
      await new Promise((resolve) => sheet.addEventListener('load', resolve, { once: true }));
    }
    const display = getComputedStyle(document.documentElement).getPropertyValue('--font-display').split(',')[0].trim();
    await Promise.all([document.fonts.load(`700 1em ${display}`), document.fonts.load(`500 1em ${display}`)]);
    await document.fonts.ready;
  };
  await Promise.race([wait(), new Promise((resolve) => setTimeout(resolve, timeout))]);
}

/* ---------- Smooth scroll (Lenis synced with ScrollTrigger via the GSAP ticker) ---------- */
function setupLenis(gsap, ScrollTrigger, Lenis, lowEnd) {
  if (!Lenis || lowEnd || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const lenis = new Lenis({ lerp: 0.1, anchors: { offset: -90 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  // Other modules (e.g. category jump links) scroll through Lenis when it is active.
  window.capsonLenis = lenis;
  return lenis;
}

/* ---------- Hero intro (full tier only) ---------- */
function heroIntro(gsap, SplitText, full) {
  const items = $$('[data-hero-item]');
  const layers = $$('[data-hero-group] .hero-group__layer img');
  if (!items.length) return;
  if (!full) {
    gsap.set([...items, ...layers], { opacity: 1, clearProps: 'transform' });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  const title = $('[data-split]');

  if (title && SplitText) {
    gsap.set(title, { opacity: 1 });
    // autoSplit re-splits if the font swaps or the width changes after the intro starts.
    SplitText.create(title, {
      type: 'lines,words',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      // Returning the tween lets SplitText keep its progress across re-splits.
      onSplit: (self) => gsap.from(self.words, { yPercent: 110, duration: 1, stagger: 0.06, ease: 'power3.out' }),
    });
  }

  const rest = items.filter((el) => el !== title || !SplitText);
  tl.fromTo(rest, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.25);

  const swooshes = $$('.hero__swoosh path:not(.swoosh-base)');
  if (swooshes.length) {
    tl.from(swooshes, { scaleX: 0, transformOrigin: '0% 50%', duration: 1.2, stagger: 0.12, ease: 'expo.out' }, 0);
  }
  // Product group rises into place, back layer first.
  if (layers.length) {
    tl.fromTo(layers, { opacity: 0, y: 90 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.16, ease: 'power3.out' }, 0.2);
  }

  const seal = $('.hero .seal');
  if (seal) tl.from(seal, { scale: 0, rotate: -90, duration: 0.9, ease: 'back.out(1.7)' }, 0.6);
}

/* ---------- Scroll reveals (all tiers; fade-only in lite) ---------- */
function reveals(gsap, ScrollTrigger, lite) {
  const els = $$('[data-reveal]');
  if (!els.length) return;
  const y = lite ? 0 : 28;
  gsap.set(els, { opacity: 0, y });
  ScrollTrigger.batch(els, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration: lite ? 0.4 : 0.8, stagger: 0.07, ease: 'power2.out', overwrite: true }),
  });
  // Safety net: at the very bottom of the page, show anything still hidden (a trigger
  // can end up past the last scroll position after late layout changes).
  ScrollTrigger.create({
    trigger: document.documentElement,
    start: 'bottom bottom+=2',
    onEnter: () => {
      const left = els.filter((el) => Number(getComputedStyle(el).opacity) < 0.99);
      if (left.length) gsap.to(left, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, overwrite: true });
    },
  });
}

/* ---------- Pinned horizontal product range (full) ---------- */
function pinnedRange(gsap) {
  const section = $('[data-range]');
  const track = $('[data-range-track]');
  if (!section || !track) return null;

  section.classList.add('is-pinned');
  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      // Pin just below the sticky header so the heading stays visible.
      start: () => `top top+=${$('[data-header-bar]')?.offsetHeight || 0}`,
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  });

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    gsap.set(track, { clearProps: 'transform' });
    section.classList.remove('is-pinned');
  };
}

/* ---------- Water filling the pipe between ordering steps (full) ---------- */
function flowLine(gsap) {
  const flow = $('[data-flow]');
  const water = $('.flow__line--h [data-flow-water]');
  if (!flow || !water) return null;
  const tween = gsap.fromTo(
    water,
    { strokeDashoffset: 1 },
    {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: { trigger: flow, start: 'top 80%', end: 'bottom 55%', scrub: true },
    }
  );
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    gsap.set(water, { clearProps: 'strokeDashoffset' });
  };
}

/* ---------- Hero swoosh parallax (full) ---------- */
function swooshParallax(gsap) {
  const hero = $('.hero, .page-hero');
  const paths = hero ? $$('.hero__swoosh path:not(.swoosh-base)', hero) : [];
  if (!paths.length) return null;
  const tween = gsap.to(paths, {
    yPercent: (i) => (i + 1) * 6,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  });
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
}

/**
 * Image parallax (full). [data-parallax="N"] moves N% of its height across the viewport.
 * Product/brand images inside clipped frames drift inside their frame.
 */
function imageParallax(gsap) {
  const targets = $$('[data-parallax]');
  const tweens = targets.map((el) => {
    const amount = Number(el.dataset.parallax) || 10;
    return gsap.fromTo(
      el,
      { yPercent: -amount / 2 },
      {
        yPercent: amount / 2,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      }
    );
  });
  return () =>
    tweens.forEach((t) => {
      t.scrollTrigger?.kill();
      t.kill();
      gsap.set(t.targets(), { clearProps: 'transform' });
    });
}

/** Mouse parallax on the hero product group (full + fine pointer): layers move by depth. */
function heroDepth(gsap) {
  const group = $('[data-hero-group]');
  const hero = group?.closest('.hero, .page-hero');
  if (!group || !hero) return null;
  const layers = $$('.hero-group__layer', group).map((el) => ({
    el,
    depth: Number(el.dataset.depth) || 1,
    toX: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3.out' }),
    toY: gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3.out' }),
  }));
  const move = (e) => {
    const r = hero.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5; // -0.5 .. 0.5
    const ny = (e.clientY - r.top) / r.height - 0.5;
    layers.forEach((layer) => {
      layer.toX(nx * 28 * layer.depth);
      layer.toY(ny * 18 * layer.depth);
    });
  };
  const reset = () =>
    layers.forEach((layer) => {
      layer.toX(0);
      layer.toY(0);
    });
  hero.addEventListener('pointermove', move);
  hero.addEventListener('pointerleave', reset);
  return () => {
    hero.removeEventListener('pointermove', move);
    hero.removeEventListener('pointerleave', reset);
    gsap.set(layers.map((layer) => layer.el), { clearProps: 'transform' });
  };
}

/** Image reveal masks (full): frames wipe open from the bottom while the image settles. */
function imageMasks(gsap, ScrollTrigger) {
  const frames = $$('[data-mask]');
  if (!frames.length) return null;
  gsap.set(frames, { clipPath: 'inset(100% 0% 0% 0%)' });
  const triggers = ScrollTrigger.batch(frames, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power3.out', stagger: 0.1 });
      gsap.from(
        batch.map((f) => f.querySelector('img')).filter(Boolean),
        { scale: 1.18, duration: 1.4, ease: 'power3.out', stagger: 0.1 }
      );
    },
  });
  // Frames shown later by filters (or never scrolled to) must not stay clipped.
  const done = ScrollTrigger.create({
    trigger: document.documentElement,
    start: 'bottom bottom+=2',
    onEnter: () => gsap.to(frames, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4 }),
  });
  return () => {
    triggers.forEach((t) => t.kill());
    done.kill();
    gsap.set(frames, { clearProps: 'clipPath' });
  };
}

/** Magnetic buttons (full + fine pointer): buttons lean toward the cursor, spring back. */
function magnetic(gsap) {
  const els = $$('[data-magnetic], .btn:not(.btn--sm), .quote-btn, .wa-float, .flipbook__btn');
  const offs = els.map((el) => {
    const strength = Number(el.dataset.magnetic) || 0.3;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      // Cap the pull so big buttons don't wander.
      xTo(Math.max(-14, Math.min(14, dx * strength)));
      yTo(Math.max(-10, Math.min(10, dy * strength)));
    };
    const leave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
    };
    el.classList.add('is-magnetic');
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.classList.remove('is-magnetic');
      gsap.set(el, { clearProps: 'transform' });
    };
  });
  return () => offs.forEach((off) => off());
}

/* ---------- Count-up numbers (full + basic) ---------- */
function countUps(gsap) {
  const els = $$('[data-countup]');
  const tweens = els.map((el) => {
    const end = parseFloat(el.textContent);
    if (Number.isNaN(end)) return null;
    const obj = { v: el.dataset.countup === 'year' ? end - 40 : 0 };
    return gsap.to(obj, {
      v: end,
      duration: 1.6,
      ease: 'power2.out',
      onUpdate: () => (el.textContent = Math.round(obj.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  return () =>
    tweens.forEach((t) => {
      if (!t) return;
      t.progress(1);
      t.scrollTrigger?.kill();
      t.kill();
    });
}
