import { describe, expect, it } from 'vitest';
import { TEXT_SCALES, scaledTextStyle } from './textScale';

describe('scaledTextStyle', () => {
  it('scales the text sizes and leaves the line height alone outside compact mode', () => {
    expect(scaledTextStyle(1.5, false)).toEqual({
      '--text-xs': '1.125rem',
      '--text-sm': '1.3125rem',
      '--text-base': '1.5rem',
      letterSpacing: '0.02em',
    });
  });

  it('shrinks the text and draws the letters closer below the normal size', () => {
    expect(scaledTextStyle(0.75, false)).toEqual({
      '--text-xs': '0.5625rem',
      '--text-sm': '0.65625rem',
      '--text-base': '0.75rem',
      letterSpacing: '-0.01em',
    });
  });

  it('tightens the lines in compact mode', () => {
    expect(scaledTextStyle(1, true)).toMatchObject({
      '--text-xs': '0.75rem',
      '--text-xs--line-height': '1.15',
      '--text-sm--line-height': '1.15',
      letterSpacing: '0em',
    });
  });

  it('has the normal size, with smaller and bigger ones around it', () => {
    expect(TEXT_SCALES).toContain(1);
    expect(TEXT_SCALES[0]).toBeLessThan(1);
    expect(TEXT_SCALES.at(-1)).toBeGreaterThan(1);
  });
});
