import { describe, expect, it } from 'vitest';
import { sumInRange } from './metrics';

const values = [
  { date: '2026-09-01', value: 10 },
  { date: '2026-09-07', value: 2.5 },
  { date: '2026-09-08', value: 100 },
];

describe('sumInRange', () => {
  it('adds the values inside the range, ends included', () => {
    expect(sumInRange(values, { start: '2026-09-01', end: '2026-09-07' })).toBe(12.5);
  });

  it('tells an empty range apart from a zero total', () => {
    expect(sumInRange(values, { start: '2026-10-01', end: '2026-10-31' })).toBeNull();
    expect(
      sumInRange([{ date: '2026-10-02', value: 0 }], { start: '2026-10-01', end: '2026-10-31' }),
    ).toBe(0);
  });
});
