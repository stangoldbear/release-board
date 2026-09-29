import { describe, expect, it } from 'vitest';
import { TASK_COLOR_IDS } from '../domain/colors';
import { COLOR_TOKENS, THEMES, resolveTheme } from './index';
import type { ColorToken } from './index';
import tokensCss from './tokens.css?raw';

/** Relative luminance as defined by WCAG 2. */
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light = 0, dark = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Text pairs need 4.5:1 (WCAG AA); borders of controls and the focus ring need 3:1. */
const REQUIRED_CONTRASTS: [ColorToken, ColorToken[], number][] = [
  [
    'fg',
    [
      'canvas',
      'surface',
      'surface-muted',
      'surface-strong',
      'accent-soft',
      'danger-soft',
      'warning-soft',
      'holiday',
    ],
    4.5,
  ],
  ['fg-muted', ['canvas', 'surface', 'surface-muted', 'surface-strong', 'holiday'], 4.5],
  ['on-accent', ['accent'], 4.5],
  ['on-danger', ['danger'], 4.5],
  ['link', ['surface', 'surface-muted', 'accent-soft'], 4.5],
  ['danger', ['surface', 'danger-soft'], 4.5],
  ['warning', ['surface', 'warning-soft'], 4.5],
  ['success', ['surface'], 4.5],
  ['holiday-fg', ['surface', 'holiday'], 4.5],
  ['line-strong', ['surface', 'surface-muted'], 3],
  ['focus', ['canvas', 'surface', 'surface-muted'], 3],
];

describe.each(Object.entries(THEMES))('theme %s', (_id, theme) => {
  it('defines every color as #rrggbb', () => {
    expect(Object.keys(theme.colors).sort()).toEqual([...COLOR_TOKENS].sort());
    expect(Object.keys(theme.tasks).sort()).toEqual([...TASK_COLOR_IDS].sort());
    const values = [
      ...Object.values(theme.colors),
      ...Object.values(theme.tasks).flatMap((tint) => [tint.bg, tint.border, tint.fg]),
    ];
    for (const value of values) expect(value).toMatch(/^#[0-9A-F]{6}$/);
  });

  it.each(REQUIRED_CONTRASTS)('keeps %s readable', (foreground, backgrounds, minimum) => {
    for (const background of backgrounds) {
      const ratio = contrast(theme.colors[foreground], theme.colors[background]);
      expect(ratio, `${foreground} on ${background}`).toBeGreaterThanOrEqual(minimum);
    }
  });

  it('keeps the text of every task color readable', () => {
    for (const [id, tint] of Object.entries(theme.tasks)) {
      expect(contrast(tint.fg, tint.bg), id).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('themes', () => {
  it('turns every color token into a Tailwind color', () => {
    for (const token of COLOR_TOKENS) {
      expect(tokensCss).toContain(`--color-${token}: var(--rb-${token});`);
    }
  });

  it('follows the system with a light and a dark theme', () => {
    expect(resolveTheme('system', false).dark).toBe(false);
    expect(resolveTheme('system', true).dark).toBe(true);
    expect(resolveTheme('light-modern', true)).toBe(THEMES['light-modern']);
  });
});
