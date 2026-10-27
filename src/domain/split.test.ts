import { describe, expect, it } from 'vitest';
import { equalParts, maxSplitParts, moveCut, resizePart, splitDays, splitWork } from './split';

describe('equalParts', () => {
  it('splits days of work in whole days, the first parts taking one more', () => {
    expect(equalParts(6, 3, 0.5)).toEqual([2, 2, 2]);
    expect(equalParts(5, 2, 0.5)).toEqual([3, 2]);
    expect(equalParts(7, 3, 0.5)).toEqual([3, 2, 2]);
  });

  it('gives a half day left to the last part', () => {
    expect(equalParts(5.5, 2, 0.5)).toEqual([3, 2.5]);
  });

  it('uses half days when the whole days are fewer than the parts', () => {
    expect(equalParts(1.5, 3, 0.5)).toEqual([0.5, 0.5, 0.5]);
    expect(equalParts(1, 2, 0.5)).toEqual([0.5, 0.5]);
  });

  it('splits the days of a task in whole days', () => {
    expect(equalParts(7, 2, 1)).toEqual([4, 3]);
  });
});

describe('maxSplitParts', () => {
  it('allows a part per step, up to the limit', () => {
    expect(maxSplitParts(1.5, 0.5)).toBe(3);
    expect(maxSplitParts(3, 1)).toBe(3);
    expect(maxSplitParts(40, 0.5)).toBe(10);
    expect(maxSplitParts(40, 0.5, 6)).toBe(6);
    expect(maxSplitParts(0.5, 0.5)).toBe(1);
  });
});

describe('moving the cuts', () => {
  it('grows a part and shrinks the next, never below a step', () => {
    expect(moveCut([3, 3], 0, 1, 1)).toEqual([4, 2]);
    expect(moveCut([3, 3], 0, 5, 1)).toEqual([5, 1]);
    expect(moveCut([3, 3], 0, -5, 0.5)).toEqual([0.5, 5.5]);
    expect(moveCut([2, 2, 2], 1, -1, 0.5)).toEqual([2, 1.5, 2.5]);
  });

  it('sets a part, and its neighbour takes the difference', () => {
    expect(resizePart([2, 2, 2], 0, 3, 0.5)).toEqual([3, 1, 2]);
    expect(resizePart([2, 2, 2], 2, 3, 0.5)).toEqual([2, 1, 3]);
    expect(resizePart([2, 2], 0, 2.3, 0.5)).toEqual([2.5, 1.5]);
    expect(resizePart([2, 2], 0, 10, 1)).toEqual([3, 1]);
    expect(resizePart([2, 2], 0, Number.NaN, 1)).toEqual([2, 2]);
  });
});

describe('splitWork', () => {
  it('places the parts one after the other on working days, with the pause', () => {
    // Monday 2 November 2026, three days, then two after a pause of one working day.
    const parts = splitWork({ startDate: '2026-11-02', manDays: 5 }, [3, 2], 1, [], [])!;
    expect(parts.map((part) => [part.startDate, part.schedule.end, part.manDays])).toEqual([
      ['2026-11-02', '2026-11-04', 3],
      ['2026-11-06', '2026-11-09', 2],
    ]);
  });

  it('keeps the start of the work and skips weekends, closures and absences', () => {
    const parts = splitWork(
      { startDate: '2026-11-07', manDays: 2 },
      [1, 1],
      0,
      [{ start: '2026-11-10', end: '2026-11-10' }],
      [],
    )!;
    expect(parts.map((part) => [part.startDate, part.schedule.start])).toEqual([
      ['2026-11-07', '2026-11-09'],
      ['2026-11-11', '2026-11-11'],
    ]);
  });
});

describe('splitDays', () => {
  it('places the days of a task one after the other, with the pause', () => {
    expect(splitDays('2026-11-02', [3, 2], 0)).toEqual([
      { start: '2026-11-02', end: '2026-11-04' },
      { start: '2026-11-05', end: '2026-11-06' },
    ]);
    expect(splitDays('2026-11-02', [1, 1], 2)).toEqual([
      { start: '2026-11-02', end: '2026-11-02' },
      { start: '2026-11-05', end: '2026-11-05' },
    ]);
  });
});
