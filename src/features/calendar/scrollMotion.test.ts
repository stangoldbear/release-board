import { describe, expect, it } from 'vitest';
import { cubicBezier, easeInOut, scrollStart } from './scrollMotion';

describe('cubicBezier', () => {
  it('goes from 0 to 1, and a straight curve is linear', () => {
    const linear = cubicBezier(0, 0, 1, 1);
    expect(linear(0)).toBe(0);
    expect(linear(0.3)).toBeCloseTo(0.3, 5);
    expect(linear(1)).toBe(1);
  });

  it('follows the ease-in-out curve: slow start, fast middle, slow end', () => {
    // Reference values sampled from the curve's definition.
    expect(easeInOut(0.1)).toBeCloseTo(0.00644, 4);
    expect(easeInOut(0.25)).toBeCloseTo(0.05289, 4);
    expect(easeInOut(0.5)).toBeCloseTo(0.59597, 4);
    expect(easeInOut(0.75)).toBeCloseTo(0.95628, 4);
    expect(easeInOut(0.9)).toBeCloseTo(0.99447, 4);
  });
});

describe('scrollStart', () => {
  it('starts from where the calendar is when the target is close', () => {
    expect(scrollStart(1000, 2500, 1200)).toBe(1000);
  });

  it('starts one screen before a far target, on the side it comes from', () => {
    expect(scrollStart(0, 9000, 1200)).toBe(7800);
    expect(scrollStart(9000, 500, 1200)).toBe(1700);
  });
});
