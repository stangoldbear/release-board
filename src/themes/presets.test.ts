import { describe, expect, it } from 'vitest';
import { TASK_COLOR_IDS } from '../domain/colors';
import type { TaskColorId } from '../domain/colors';
import { contrast, deltaE, toOklch } from './color';
import { THEME_IDS, getTheme } from './index';
import { COLOR_PRESET_IDS, DEFAULT_COLOR_PRESET, presetTasks } from './presets';

/** A light color and the deeper one of the same hue: they must stay apart. */
const PAIRS: [TaskColorId, TaskColorId][] = [
  ['blue', 'navy'],
  ['teal', 'petrol'],
  ['green', 'forest'],
  ['red', 'wine'],
  ['purple', 'plum'],
  ['gray', 'slate'],
  ['blue', 'ice'],
];

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

describe('the color presets', () => {
  it('start from the pastel one, and keep each theme as it is with «Regolare»', () => {
    expect(DEFAULT_COLOR_PRESET).toBe('pastel');
    for (const id of THEME_IDS)
      expect(presetTasks(getTheme(id), 'regular')).toBe(getTheme(id).tasks);
  });

  describe.each(THEME_IDS.flatMap((id) => COLOR_PRESET_IDS.map((preset) => [id, preset] as const)))(
    '%s, %s',
    (id, preset) => {
      const theme = getTheme(id);
      const tasks = presetTasks(theme, preset);

      it('defines every color as #rrggbb, with text readable on its background', () => {
        expect(Object.keys(tasks).sort()).toEqual([...TASK_COLOR_IDS].sort());
        for (const [color, tint] of Object.entries(tasks)) {
          for (const value of [tint.bg, tint.border, tint.fg])
            expect(value).toMatch(/^#[0-9A-F]{6}$/);
          expect(contrast(tint.fg, tint.bg), color).toBeGreaterThanOrEqual(4.5);
        }
      });

      // «Regolare» keeps the sets of the themes as they were.
      it.skipIf(preset === 'regular')(
        'draws every bar apart from the surface, and a deep color apart from the light one',
        () => {
          for (const [color, tint] of Object.entries(tasks)) {
            expect(deltaE(tint.border, theme.colors.surface), color).toBeGreaterThanOrEqual(5);
          }
          for (const [light, deep] of PAIRS) {
            expect(
              deltaE(tasks[light].border, tasks[deep].border),
              `${light}/${deep}`,
            ).toBeGreaterThanOrEqual(5);
          }
        },
      );
    },
  );

  it('go from the softest to the fullest: pastel, smooth, regular', () => {
    for (const id of ['light-modern', 'dark-modern'] as const) {
      const theme = getTheme(id);
      const chroma = (preset: 'pastel' | 'smooth' | 'regular') =>
        average(Object.values(presetTasks(theme, preset)).map((tint) => toOklch(tint.border).c));
      expect(chroma('pastel')).toBeLessThan(chroma('smooth'));
      expect(chroma('smooth')).toBeLessThan(chroma('regular'));
    }
  });

  it('give the pastel colors of a theme one lightness, so that none stands out', () => {
    const tasks = presetTasks(getTheme('light-modern'), 'pastel');
    const lightness = Object.entries(tasks)
      .filter(([id]) => !['navy', 'petrol', 'forest', 'wine', 'plum', 'slate', 'ice'].includes(id))
      .map(([, tint]) => toOklch(tint.border).l);
    expect(Math.max(...lightness) - Math.min(...lightness)).toBeLessThan(0.02);
  });
});
