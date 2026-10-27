import { describe, expect, it } from 'vitest';
import { masonrySpan, packMasonry } from './masonry';

describe('masonrySpan', () => {
  it('spans the rows of the height and the gap, rounded up', () => {
    expect(masonrySpan(100, 12)).toBe(28);
    expect(masonrySpan(101, 12)).toBe(29);
  });

  it('spans one row at least', () => {
    expect(masonrySpan(0, 0)).toBe(1);
  });
});

describe('packMasonry', () => {
  it('fills the first row from left to right, then the column that ends highest', () => {
    // Rows of 4 pixels, no gap: heights 40, 8, 20 in three columns, then two more notes.
    expect(packMasonry([40, 8, 20, 12, 12], 3, 0)).toEqual([
      { column: 0, row: 0, span: 10 },
      { column: 1, row: 0, span: 2 },
      { column: 2, row: 0, span: 5 },
      // Under the short note, not after the tall one.
      { column: 1, row: 2, span: 3 },
      { column: 1, row: 5, span: 3 },
    ]);
  });

  it('takes the leftmost column when several end as high', () => {
    expect(packMasonry([8, 8, 8], 2, 0).map((place) => place.column)).toEqual([0, 1, 0]);
  });

  it('stacks everything in one column when there is room for one', () => {
    expect(packMasonry([8, 12], 1, 4)).toEqual([
      { column: 0, row: 0, span: 3 },
      { column: 0, row: 3, span: 4 },
    ]);
    expect(packMasonry([8], 0, 0)).toEqual([{ column: 0, row: 0, span: 2 }]);
  });
});
