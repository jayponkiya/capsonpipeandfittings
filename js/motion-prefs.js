/**
 * Motion preferences shared by every animation module.
 *
 * "Lite" motion = prefers-reduced-motion OR a low-end device. Lite mode keeps simple
 * fades but drops smooth scroll, pinning, scrubbing, parallax, magnetic buttons, image
 * masks and page transitions.
 *
 * Low-end heuristic (any of):
 *   - Save-Data enabled
 *   - <= 2 CPU cores, or <= 2 GB device memory
 *   - <= 4 cores AND <= 4 GB memory on a touch-first device
 * Override for testing: add ?motion=full or ?motion=lite to any URL (remembered per tab).
 */
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');

function override() {
  try {
    const q = new URLSearchParams(location.search).get('motion');
    if (q === 'full' || q === 'lite') sessionStorage.setItem('capson:motion', q);
    return sessionStorage.getItem('capson:motion');
  } catch {
    return null;
  }
}

export function isLowEnd() {
  const forced = override();
  if (forced) return forced === 'lite';
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8;
  const saveData = navigator.connection?.saveData === true;
  const touchFirst = matchMedia('(pointer: coarse)').matches;
  return saveData || cores <= 2 || memory <= 2 || (touchFirst && cores <= 4 && memory <= 4);
}

export const prefersReducedMotion = () => reduceQuery.matches;
export const isLiteMotion = () => prefersReducedMotion() || isLowEnd();

/** Pointer that can hover precisely (mouse/trackpad): needed for magnetic effects. */
export const hasFinePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

// Expose as a class for CSS (e.g. disable hover lifts, pulse) without waiting for GSAP.
if (isLiteMotion()) document.documentElement.classList.add('is-lite');
