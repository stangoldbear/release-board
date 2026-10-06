/** True when the system asks for less motion: scrolls and moves then happen at once. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
