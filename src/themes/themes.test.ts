import { describe, expect, it } from 'vitest';
import { TASK_COLOR_IDS } from '../domain/colors';
import { contrast } from './color';
import {
  COLOR_TOKENS,
  CUSTOM_THEME_IDS,
  THEME_IDS,
  getTheme,
  isDarkTheme,
  resolveTheme,
} from './index';
import type { ColorToken } from './index';
import tokensCss from './tokens.css?raw';

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
      'past',
    ],
    4.5,
  ],
  [
    'fg-muted',
    [
      'canvas',
      'surface',
      'surface-muted',
      'surface-strong',
      'holiday',
      'past',
      // Labels on a selected option, on today's column and on the row of notes.
      'accent-soft',
      'warning-soft',
      'danger-soft',
    ],
    4.5,
  ],
  ['on-accent', ['accent'], 4.5],
  ['on-danger', ['danger'], 4.5],
  // The banner of the local mode is warning-soft.
  ['link', ['surface', 'surface-muted', 'accent-soft', 'warning-soft'], 4.5],
  ['danger', ['surface', 'danger-soft'], 4.5],
  ['warning', ['surface', 'warning-soft'], 4.5],
  ['success', ['surface'], 4.5],
  ['holiday-fg', ['surface', 'holiday'], 4.5],
  ['approval-green', ['surface', 'surface-muted', 'approval-green-soft'], 4.5],
  ['approval-orange', ['surface', 'surface-muted', 'approval-orange-soft'], 4.5],
  ['approval-red', ['surface', 'surface-muted', 'approval-red-soft'], 4.5],
  ['line-strong', ['surface', 'surface-muted'], 3],
  // Segmented controls sit on surface-strong; the ring of a daily value is drawn inside its cell.
  [
    'focus',
    [
      'canvas',
      'surface',
      'surface-muted',
      'surface-strong',
      'holiday',
      'past',
      'approval-green-soft',
      'approval-orange-soft',
      'approval-red-soft',
    ],
    3,
  ],
];

describe.each(THEME_IDS.map((id) => [id, getTheme(id)] as const))('theme %s', (_id, theme) => {
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
    expect(resolveTheme('light-modern', true)).toBe(getTheme('light-modern'));
    expect(resolveTheme('dracula', false)).toBe(getTheme('dracula'));
  });

  it('offers about thirty custom themes, light and dark, with their own names', () => {
    const names = CUSTOM_THEME_IDS.map((id) => getTheme(id).name);
    expect(new Set(names).size).toBe(CUSTOM_THEME_IDS.length);
    expect(CUSTOM_THEME_IDS.filter((id) => !isDarkTheme(id))).toHaveLength(12);
    expect(CUSTOM_THEME_IDS.filter((id) => isDarkTheme(id))).toHaveLength(20);
    for (const id of CUSTOM_THEME_IDS) expect(getTheme(id).dark).toBe(isDarkTheme(id));
  });
});
