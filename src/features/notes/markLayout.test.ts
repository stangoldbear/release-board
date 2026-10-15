import { describe, expect, it } from 'vitest';
import { titleRooms } from './markLayout';

describe('titleRooms', () => {
  it('leaves each title the room up to the next mark of its lane', () => {
    const marks = [
      { x: 100, lane: 0 },
      { x: 300, lane: 0 },
      { x: 120, lane: 1 },
      { x: 140, lane: 0 },
    ];
    expect(titleRooms(marks, 16, 3)).toEqual([18, Infinity, Infinity, 138]);
  });

  it('gives no room to marks on the same place', () => {
    expect(
      titleRooms(
        [
          { x: 50, lane: 0 },
          { x: 50, lane: 0 },
        ],
        16,
        3,
      ),
    ).toEqual([-22, Infinity]);
  });
});
