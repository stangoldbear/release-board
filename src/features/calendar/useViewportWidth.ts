import { useEffectEvent, useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import { LABEL_CELL_SELECTOR } from './timelineLayout';

/** The layout follows the window once it has stopped changing for this long. */
const SETTLE_MS = 150;

/**
 * Measures how wide the days of a timeline are, beside the column of the names: once before the
 * first paint, so that the fitted level opens right, then whenever the timeline or the column
 * changes width, once the window has settled. Reports only a changed width.
 */
export function useViewportWidth(
  ref: RefObject<HTMLElement | null>,
  onResized: (width: number) => void,
): void {
  const report = useEffectEvent(onResized);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const label = element.querySelector<HTMLElement>(LABEL_CELL_SELECTOR);
    let reported: number | null = null;
    const measure = () => {
      const width = Math.max(0, element.clientWidth - (label?.offsetWidth ?? 0));
      if (width === reported) return;
      reported = width;
      report(width);
    };
    measure();

    let timer: number | undefined;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(measure, SETTLE_MS);
    });
    observer.observe(element);
    if (label) observer.observe(label);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [ref]);
}
