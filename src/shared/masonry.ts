import { useLayoutEffect, useRef } from 'react';

/** The height of a row of a masonry grid: each item spans as many as its height needs. */
export const MASONRY_ROW = 4;

/** The rows an item spans: its height and the gap under it, rounded up to whole rows. */
export function masonrySpan(height: number, gap: number, row = MASONRY_ROW): number {
  return Math.max(1, Math.ceil((height + gap) / row));
}

/** Where an item of a masonry grid goes: its column and its first row, from 0, and its rows. */
export interface MasonryPlace {
  column: number;
  row: number;
  span: number;
}

/**
 * Places items as a wall of notes (0.21): each in the column that ends highest, the leftmost when
 * several do, so that no short note leaves a hole under it. The first items fill the first row,
 * from left to right, and the others follow close to the order of the list.
 */
export function packMasonry(
  heights: readonly number[],
  columns: number,
  gap: number,
  row = MASONRY_ROW,
): MasonryPlace[] {
  const ends = Array.from({ length: Math.max(1, columns) }, () => 0);
  return heights.map((height) => {
    const lowest = Math.min(...ends);
    const column = ends.indexOf(lowest);
    const span = masonrySpan(height, gap, row);
    ends[column] = lowest + span;
    return { column, row: lowest, span };
  });
}

/**
 * A masonry grid: the items of a CSS grid with rows of `MASONRY_ROW` pixels, each placed by
 * `packMasonry` in the column that ends highest and spanning the rows of its own height, which is
 * measured and followed as it changes, as are the columns of the grid. The order of the items in
 * the page stays the order of the list, for the keyboard and screen readers. Off, the items go
 * back to the grid's own places.
 */
export function useMasonry<T extends HTMLElement>(enabled: boolean, gap: number) {
  const ref = useRef<T>(null);
  // After every render: the items may have changed.
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const items = [...list.children].filter((item) => item instanceof HTMLElement);
    if (!enabled) {
      for (const item of items) {
        item.style.gridColumn = '';
        item.style.gridRow = '';
      }
      return;
    }
    const place = () => {
      const columns = getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length;
      const heights = items.map((item) => item.getBoundingClientRect().height);
      packMasonry(heights, columns, gap).forEach(({ column, row, span }, index) => {
        const item = items[index];
        if (!item) return;
        item.style.gridColumn = String(column + 1);
        item.style.gridRow = `${row + 1} / span ${span}`;
      });
    };
    place();
    // A note that grows, or a window that changes the number of columns, places them all again.
    const observer = new ResizeObserver(place);
    observer.observe(list);
    for (const item of items) observer.observe(item);
    return () => observer.disconnect();
  });
  return ref;
}
