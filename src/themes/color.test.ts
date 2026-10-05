import { describe, expect, it } from 'vitest';
import { contrast, ensureContrast, luminance, mix } from './color';
import { deriveTheme } from './derive';
import { VSCODE_THEME_SEEDS } from './vscodeThemes';

describe('colors', () => {
  it('measures luminance and contrast as WCAG does', () => {
    expect(luminance('#FFFFFF')).toBeCloseTo(1);
    expect(luminance('#000000')).toBe(0);
    expect(contrast('#FFFFFF', '#000000')).toBeCloseTo(21);
    expect(contrast('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });

  it('mixes two colors', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mix('#FF0000', '#0000FF', 0.5)).toBe('#800080');
  });

  it('moves a color only as far as the contrast requires', () => {
    expect(ensureContrast('#1F1F1F', ['#FFFFFF'], 4.5, '#000000')).toBe('#1F1F1F');
    const darkened = ensureContrast('#90A4AE', ['#FAFAFA'], 4.5, '#000000');
    expect(contrast(darkened, '#FAFAFA')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(darkened, '#FAFAFA')).toBeLessThan(5);
  });
});

describe('deriveTheme', () => {
  const seed = (id: string) => VSCODE_THEME_SEEDS.find((item) => item.id === id)!;

  it('keeps the backgrounds and the accent of the original', () => {
    const dracula = deriveTheme(seed('dracula'));
    expect(dracula.colors.surface).toBe('#282A36');
    expect(dracula.colors.accent).toBe(seed('dracula').accent);
    expect(dracula.dark).toBe(true);
  });

  it('makes the faint text of a theme readable, darker on light themes', () => {
    const material = deriveTheme(seed('material-lighter'));
    expect(seed('material-lighter').fg).toBe('#90A4AE');
    expect(contrast(material.colors.fg, material.colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(luminance(material.colors.fg)).toBeLessThan(luminance('#90A4AE'));
  });

  it('gives a light accent dark text, and a dark accent white text', () => {
    expect(deriveTheme(seed('dracula')).colors['on-accent']).toBe('#282A36');
    expect(deriveTheme(seed('github-light')).colors['on-accent']).toBe('#FFFFFF');
  });
});
