import { useLayoutEffect, useRef } from 'react';

/** The height of a row of a masonry grid: each item spans as many as its height needs. */
export const MASONRY_ROW = 4;

/** The rows an item spans: its height and the gap under it, rounded up to whole rows. */
export function masonrySpan(height: number, gap: number, row = MASONRY_ROW): number {
  return Math.max(1, Math.ceil((height + gap) / row));
}

/**
 * A masonry grid in reading order: the items of a CSS grid with rows of `MASONRY_ROW` pixels,
 * placed one after the other from left to right, each spanning the rows of its own height, which
 * is measured and followed as it changes. Columns of CSS would read down each column instead,
 * and the order of the notes would no longer be the order on the screen. Off, the items go back
 * to the grid's own rows.
 */
export function useMasonry<T extends HTMLElement>(enabled: boolean, gap: number) {
  const ref = useRef<T>(null);
  // After every render: the items may have changed.
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const items = [...list.children].filter((item) => item instanceof HTMLElement);
    if (!enabled) {
      for (const item of items) item.style.gridRowEnd = '';
      return;
    }
    const place = (item: HTMLElement) => {
      item.style.gridRowEnd = `span ${masonrySpan(item.getBoundingClientRect().height, gap)}`;
    };
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) place(entry.target as HTMLElement);
    });
    for (const item of items) {
      place(item);
      observer.observe(item);
    }
    return () => observer.disconnect();
  });
  return ref;
}
