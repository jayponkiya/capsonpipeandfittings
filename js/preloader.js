/**
 * Preloader exit. The preloader is shown from first paint only on the first page of a
 * visit (head script adds html.is-preloading). Here we wait until the page is ready,
 * finish the "water" fill, then lift it away with a red swoosh wipe.
 *
 * - Minimum visible time keeps the animation from flashing; maximum keeps it from
 *   blocking a slow page (CSS also removes it after 4s if scripts never run).
 * - Without GSAP: simple fade.
 */
const root = document.documentElement;
const MIN_MS = 800;
const MAX_MS = 2000;

/** Ready = fonts loaded + the first banner image decoded (not every image on the page). */
const pageReady = async () => {
  const hero = document.querySelector('.hero img, .page-hero img:not(.preloader__logo)');
  await Promise.all([
    document.fonts?.ready,
    hero && !hero.complete ? hero.decode().catch(() => {}) : null,
  ]);
};

export async function finishPreloader() {
  const el = document.querySelector('[data-preloader]');
  if (!el || !root.classList.contains('is-preloading')) {
    el?.remove();
    return;
  }
  const started = performance.now();
  await Promise.race([pageReady(), new Promise((r) => setTimeout(r, MAX_MS))]);
  const wait = MIN_MS - (performance.now() - started);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  const done = () => {
    root.classList.remove('is-preloading');
    el.remove();
  };
  const { gsap } = window;
  if (!gsap) {
    el.style.transition = 'opacity 0.4s';
    el.style.opacity = '0';
    setTimeout(done, 450);
    return;
  }

  const water = el.querySelector('[data-preloader-water]');
  const inner = el.querySelector('.preloader__inner');
  const swooshes = el.querySelectorAll('.preloader__swoosh');
  // Freeze the CSS fill where it is and let GSAP take over from there.
  const current = getComputedStyle(water).transform;
  water.style.animation = 'none';
  water.style.transform = current === 'none' ? 'scaleX(0)' : current;

  gsap
    .timeline({ onComplete: done })
    .to(water, { scaleX: 1, duration: 0.25, ease: 'power2.out' })
    .to(inner, { y: -20, opacity: 0, duration: 0.3, ease: 'power2.in' }, '+=0.05')
    .fromTo(swooshes, { yPercent: 100 }, { yPercent: 0, duration: 0.4, ease: 'power3.inOut', stagger: 0.06 }, '<0.05')
    .set(el, { backgroundColor: 'transparent' })
    .to(swooshes, { yPercent: -100, duration: 0.5, ease: 'power3.inOut', stagger: { each: 0.06, from: 'end' } });
}
