/**
 * Catalogue preview (catalogue.html): a page viewer with a GSAP page-flip, plus a grid
 * of page cards that flip in on scroll. Prev/next buttons, arrow keys, swipe and the
 * thumbnails all drive the viewer. Reduced motion: instant page swaps, no flips.
 *
 * Markup hooks: [data-flipbook] (viewer), [data-page-grid] (thumbnails).
 */
import { $, $$ } from './utils.js';
import { isLiteMotion } from './motion-prefs.js';

const motionOK = () => window.gsap && !isLiteMotion();

export function initFlipbook() {
  const book = $('[data-flipbook]');
  if (!book) return;
  const pages = $$('[data-page-grid] [data-goto]').map((btn) => ({
    src: btn.dataset.src,
    alt: $('img', btn).alt,
    label: btn.dataset.label,
  }));
  const img = $('[data-flip-img]', book);
  const sheet = $('[data-flip-sheet]', book);
  const status = $('[data-flip-status]', book);
  const prev = $('[data-flip-prev]', book);
  const next = $('[data-flip-next]', book);
  let index = 0;
  let busy = false;

  const update = () => {
    status.textContent = `Page ${index + 1} of ${pages.length}: ${pages[index].label}`;
    prev.disabled = index === 0;
    next.disabled = index === pages.length - 1;
    $$('[data-goto]').forEach((b) => b.setAttribute('aria-current', Number(b.dataset.goto) === index ? 'true' : 'false'));
  };

  const swap = (i) => {
    img.src = pages[i].src;
    img.alt = pages[i].alt;
  };

  const go = (i) => {
    if (busy || i === index || i < 0 || i >= pages.length) return;
    const dir = i > index ? 1 : -1;
    index = i;
    // Preload, then flip.
    const pre = new Image();
    pre.src = pages[i].src;
    if (!motionOK()) {
      swap(i);
      update();
      return;
    }
    busy = true;
    const { gsap } = window;
    const done = () => {
      busy = false;
    };
    gsap
      .timeline({ onComplete: done })
      .to(sheet, {
        rotateY: dir > 0 ? -90 : 90,
        transformOrigin: dir > 0 ? '0% 50%' : '100% 50%',
        duration: 0.32,
        ease: 'power2.in',
      })
      .add(() => {
        swap(i);
        update();
      })
      .fromTo(
        sheet,
        { rotateY: dir > 0 ? 90 : -90, transformOrigin: dir > 0 ? '100% 50%' : '0% 50%' },
        { rotateY: 0, duration: 0.42, ease: 'power3.out' }
      );
  };

  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  book.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  });

  // Swipe
  let startX = null;
  sheet.addEventListener('pointerdown', (e) => (startX = e.clientX));
  sheet.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    startX = null;
  });

  // Page list (beside the book) and thumbnails (grid below) both drive the viewer.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-goto]');
    if (!btn) return;
    go(Number(btn.dataset.goto));
    // Thumbnails are far from the book: bring it into view. Through Lenis when active.
    if (btn.closest('[data-page-grid]')) {
      const y = book.getBoundingClientRect().top + scrollY - (innerHeight - book.offsetHeight) / 2;
      if (window.capsonLenis) window.capsonLenis.scrollTo(Math.max(0, y), { duration: 1 });
      else window.scrollTo({ top: Math.max(0, y), behavior: motionOK() ? 'smooth' : 'auto' });
    }
  });

  update();

  // Thumbnails flip in like turning cards as they scroll into view.
  if (motionOK() && window.ScrollTrigger) {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    const cards = $$('[data-page-grid] li');
    gsap.set(cards, { rotateY: -75, opacity: 0, transformOrigin: '0% 50%' });
    ScrollTrigger.batch(cards, {
      start: 'top 90%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { rotateY: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out' }),
    });
  }
}
