import { describe, expect, it } from 'vitest';
import { formatLocaleNumber, formatShortNumber, parseLocaleNumber } from './numberFormat';

describe('parseLocaleNumber', () => {
  it.each([
    ['1.234.567', 1234567],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['1,234,567', 1234567],
    ['12.5', 12.5],
    ['0,5', 0.5],
    ['-3,5', -3.5],
    ['€ 1.250', 1250],
    ['1 234', 1234],
    ['42', 42],
  ])('reads %s as %d', (text, expected) => {
    expect(parseLocaleNumber(text)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '12a', '1.2.3,4.5', '--1', ','])('rejects %j', (text) => {
    expect(parseLocaleNumber(text)).toBeNull();
  });
});

describe('formatLocaleNumber', () => {
  it('groups thousands the Italian way', () => {
    expect(formatLocaleNumber(1234567)).toBe('1.234.567');
    expect(formatLocaleNumber(12345.6, 1)).toBe('12.345,6');
  });

  it('round-trips through parseLocaleNumber', () => {
    for (const value of [0, 7, 1234, 98765, 1234567]) {
      expect(parseLocaleNumber(formatLocaleNumber(value))).toBe(value);
    }
  });
});

describe('formatShortNumber', () => {
  it('keeps the full number when it fits', () => {
    expect(formatShortNumber(125000, 0, 8)).toBe('125.000');
    expect(formatShortNumber(12500.5, 2, 9)).toBe('12.500,50');
  });

  it('abbreviates numbers that do not fit', () => {
    // A no-break space keeps number and unit together.
    expect(formatShortNumber(1234567, 0, 8)).toBe('1,2\u00a0Mln');
    expect(formatShortNumber(125000, 0, 4)).toBe('125K');
    expect(formatShortNumber(12500, 0, 4)).toBe('13K');
    expect(formatShortNumber(1500.5, 2, 4)).toBe('1,5K');
    expect(formatShortNumber(-2500000, 0, 8)).toBe('-2,5\u00a0Mln');
    expect(formatShortNumber(3_400_000_000, 0, 8)).toBe('3,4\u00a0Mrd');
  });

  it('shortens further when even the abbreviation does not fit', () => {
    expect(formatShortNumber(1234567, 0, 4)).toBe('1,2M');
    expect(formatShortNumber(1234567, 0, 2)).toBe('1M');
    // Nothing shorter: the cell cuts it.
    expect(formatShortNumber(125000, 0, 3)).toBe('125K');
    expect(formatShortNumber(999, 0, 2)).toBe('999');
    // Italian writes four digits without a separator, as short as "9,5K".
    expect(formatShortNumber(9500, 0, 3)).toBe('9500');
  });

  it('moves to the next unit when the rounding reaches a thousand', () => {
    expect(formatShortNumber(999_499, 0, 4)).toBe('999K');
    expect(formatShortNumber(999_700, 0, 4)).toBe('1M');
    expect(formatShortNumber(999_999, 0, 6)).toBe('1\u00a0Mln');
    expect(formatShortNumber(-999_999, 0, 4)).toBe('-1M');
    expect(formatShortNumber(999_499_999, 0, 6)).toBe('999,5M');
    expect(formatShortNumber(999_960_000, 0, 8)).toBe('1\u00a0Mrd');
  });
});
