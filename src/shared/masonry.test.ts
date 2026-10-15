import { describe, expect, it } from 'vitest';
import { masonrySpan } from './masonry';

describe('masonrySpan', () => {
  it('spans the rows of the height and the gap, rounded up', () => {
    expect(masonrySpan(100, 12)).toBe(28);
    expect(masonrySpan(101, 12)).toBe(29);
  });

  it('spans one row at least', () => {
    expect(masonrySpan(0, 0)).toBe(1);
  });
});
