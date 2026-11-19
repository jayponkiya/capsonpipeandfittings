/**
 * 404 "pipe disconnected": the right pipe hangs loose and drips. Hovering or focusing
 * "Back to home" snaps the pipe back into place and stops the leak.
 * Reduced motion: static illustration.
 */
import { $, $$ } from './utils.js';
import { isLiteMotion } from './motion-prefs.js';

export function initNotFound() {
  const svg = $('[data-pipe-404]');
  const { gsap } = window;
  if (!svg || !gsap || isLiteMotion()) return;

  const loose = $('[data-pipe-loose]', svg);
  const drops = $$('[data-drop]', svg);
  const splash = $('[data-splash]', svg);

  // Loose pipe sways around its far end.
  const sway = gsap.to(loose, {
    rotation: 7,
    svgOrigin: '600 150',
    duration: 1.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });

  // Drops fall from the open end, then splash.
  const drip = gsap.timeline({ repeat: -1 });
  drops.forEach((drop, i) => {
    drip.fromTo(
      drop,
      { y: 0, opacity: 0, scale: 0.4, transformOrigin: '50% 50%' },
      { keyframes: [{ opacity: 1, scale: 1, duration: 0.25 }, { y: 120, duration: 0.6, ease: 'power2.in' }, { opacity: 0, duration: 0.05 }] },
      i * 0.45
    );
  });
  drip.fromTo(splash, { scaleX: 0.2, opacity: 0, transformOrigin: '50% 100%' }, { scaleX: 1, opacity: 0.8, duration: 0.2, yoyo: true, repeat: 1 }, 0.85);

  // "Fix it" on hover/focus of the home button.
  const home = $('[data-fix-pipe]');
  if (!home) return;
  let fix;
  const repair = () => {
    sway.pause();
    drip.pause();
    gsap.to(drops, { opacity: 0, duration: 0.2 });
    fix = gsap.to(loose, { rotation: 0, x: 0, y: 0, svgOrigin: '600 150', duration: 0.6, ease: 'back.out(2)' });
    svg.classList.add('is-fixed');
  };
  const breakAgain = () => {
    fix?.kill();
    svg.classList.remove('is-fixed');
    gsap.to(loose, { x: 0, y: 18, rotation: 4, svgOrigin: '600 150', duration: 0.5, ease: 'power2.out', onComplete: () => sway.play() });
    drip.play();
  };
  gsap.set(loose, { y: 18 });
  ['pointerenter', 'focus'].forEach((ev) => home.addEventListener(ev, repair));
  ['pointerleave', 'blur'].forEach((ev) => home.addEventListener(ev, breakAgain));
}
