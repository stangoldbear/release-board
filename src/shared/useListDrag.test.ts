import { describe, expect, it } from 'vitest';
import { indexForSlot, slotAt } from './useListDrag';

const box = { left: 100, top: 50, width: 40, height: 20 };

describe('the slot of a drag', () => {
  it('is before an item on its first half along the list, after it on the second', () => {
    expect(slotAt(2, box, { x: 110, y: 0 }, 'x')).toBe(2);
    expect(slotAt(2, box, { x: 130, y: 0 }, 'x')).toBe(3);
    expect(slotAt(2, box, { x: 0, y: 55 }, 'y')).toBe(2);
    expect(slotAt(2, box, { x: 0, y: 65 }, 'y')).toBe(3);
  });

  it('gives the index of the move, which does not count the dragged item', () => {
    // Items a b c d: "a" dropped after "c", in slot 3, becomes the third.
    expect(indexForSlot(3, 0)).toBe(2);
    // "d" dropped before "b", in slot 1, becomes the second.
    expect(indexForSlot(1, 3)).toBe(1);
    // Dropped right before or right after itself, it stays.
    expect(indexForSlot(2, 2)).toBe(2);
    expect(indexForSlot(3, 2)).toBe(2);
  });
});
