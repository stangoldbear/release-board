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
    // Intl separates number and unit with a no-break space.
    expect(formatShortNumber(1234567, 0, 8)).toBe('1,2\u00a0Mln');
    expect(formatShortNumber(125000, 0, 4)).toBe('125K');
  });
});
