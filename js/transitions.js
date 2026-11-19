/**
 * Page transitions: a red swoosh wipe covers the screen before an internal navigation
 * and uncovers the next page.
 *
 * Flow
 *   click internal link -> wipe IN (cover) -> sessionStorage flag -> navigate
 *   next page: an inline <head> script sees the flag and adds html.is-wiping, which covers
 *   the page from first paint (CSS) -> this module wipes OUT.
 *   Back/forward (bfcache): pageshow(persisted) resets the cover so the page is usable.
 *
 * Skipped for: reduced motion, low-end devices, new tabs, modifier clicks, downloads,
 * same-page hash links, mailto/tel/WhatsApp/PDF links and [data-no-transition].
 */
import { isLiteMotion } from './motion-prefs.js';

const KEY = 'capson:wipe';
const root = document.documentElement;

const clean = (path) => path.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');

function overlayHTML() {
  return `
  <div class="page-wipe" data-page-wipe aria-hidden="true">
    <div class="page-wipe__band page-wipe__band--dark"></div>
    <div class="page-wipe__band page-wipe__band--red">
      <img class="page-wipe__logo" src="assets/img/brand/logo-240.webp" alt="" width="240" height="158">
    </div>
  </div>`;
}

function shouldIntercept(e, link) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if (!link.href || link.target === '_blank' || link.hasAttribute('download') || link.dataset.noTransition !== undefined) return false;
  if (link.hasAttribute('data-wa') || link.hasAttribute('data-open') || link.hasAttribute('data-quote-open') || link.hasAttribute('data-line-filter')) return false;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return false;
  if (/\.(pdf|webp|png|jpe?g|zip)$/i.test(url.pathname)) return false;
  // Same page (with or without a hash): let the browser / Lenis scroll instead.
  if (clean(url.pathname) === clean(location.pathname) && url.search === location.search) return false;
  return true;
}

export function initTransitions() {
  const { gsap } = window;
  const entering = root.classList.contains('is-wiping');
  const lite = isLiteMotion();

  if (!gsap || lite) {
    root.classList.remove('is-wiping');
    sessionStorage.removeItem(KEY);
    return;
  }

  document.body.insertAdjacentHTML('beforeend', overlayHTML());
  const wipe = document.querySelector('[data-page-wipe]');
  const bands = wipe.querySelectorAll('.page-wipe__band');
  const logo = wipe.querySelector('.page-wipe__logo');

  const hide = () => {
    gsap.set(bands, { yPercent: 100 });
    gsap.set(logo, { opacity: 0 });
    wipe.classList.remove('is-active');
  };

  // Wipe OUT on arrival (the CSS cover from <head> hands over to the real overlay).
  sessionStorage.removeItem(KEY);
  if (entering) {
    wipe.classList.add('is-active');
    gsap.set(bands, { yPercent: 0 });
    gsap.set(logo, { opacity: 0 });
    root.classList.remove('is-wiping');
    gsap
      .timeline({ onComplete: hide, delay: 0.05 })
      .to(bands, { yPercent: -100, duration: 0.7, ease: 'power3.inOut', stagger: { each: 0.08, from: 'end' } });
  } else {
    hide();
  }

  // Wipe IN before leaving.
  let leaving = false;
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || leaving || !shouldIntercept(e, link)) return;
    e.preventDefault();
    leaving = true;
    const go = () => {
      sessionStorage.setItem(KEY, '1');
      location.href = link.href;
    };
    wipe.classList.add('is-active');
    gsap
      .timeline({ onComplete: go })
      .fromTo(bands, { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: 'power3.inOut', stagger: 0.08 })
      .to(logo, { opacity: 1, duration: 0.2 }, '-=0.15');
    // Safety: navigate even if the tween is interrupted.
    setTimeout(() => leaving && go(), 1200);
  });

  // Back/forward cache restores the page as we left it (covered): reset.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    sessionStorage.removeItem(KEY);
    root.classList.remove('is-wiping');
    gsap.killTweensOf([bands, logo]);
    hide();
  });
}
