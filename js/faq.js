/**
 * FAQ accordion (why-capson.html). Each question is a <button aria-expanded> controlling
 * a region; GSAP animates height. Reduced motion: instant toggle.
 *
 * Markup: [data-faq] > .faq__item > h3 > button[data-faq-toggle][aria-controls] + [role=region]
 */
import { $, $$, notifyLayout } from './utils.js';
import { isLiteMotion } from './motion-prefs.js';

const motionOK = () => window.gsap && !isLiteMotion();

export function initFaq() {
  $$('[data-faq]').forEach((faq) => {
    faq.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-faq-toggle]');
      if (!btn) return;
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      if (!motionOK()) {
        panel.hidden = !open;
        notifyLayout();
        return;
      }
      const { gsap } = window;
      gsap.killTweensOf(panel);
      if (open) {
        panel.hidden = false;
        gsap.fromTo(panel, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.4, ease: 'power2.out', onComplete: notifyLayout });
      } else {
        gsap.to(panel, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => {
            panel.hidden = true;
            gsap.set(panel, { clearProps: 'height,opacity' });
            notifyLayout();
          },
        });
      }
    });
    // Open the first question by default so the pattern is obvious.
    const first = $('[data-faq-toggle]', faq);
    if (first) {
      first.setAttribute('aria-expanded', 'true');
      document.getElementById(first.getAttribute('aria-controls')).hidden = false;
    }
  });
}
