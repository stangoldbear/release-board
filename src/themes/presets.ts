import type { TaskColorId } from '../domain/colors';
import { TASK_COLOR_IDS } from '../domain/colors';
import { ensureContrast, fromOklch, mix, toOklch } from './color';
import type { TaskTint, Theme } from './index';

// The color presets: how the 24 colors of tasks, projects, teams and values look, over any theme.
// «Regular» is each theme's own set; the others keep the theme's hues, or Solarized's, and give
// every color the same lightness and chroma for its role, so that none shouts over the others.
// Whatever the preset, the text of a color stays at 4.5:1 on its background.

export type ColorPreset = 'pastel' | 'smooth' | 'regular' | 'solarized';

export const COLOR_PRESETS: readonly { id: ColorPreset; name: string; description: string }[] = [
  {
    id: 'pastel',
    name: 'Pastello',
    description: 'Tinte chiare e tenui, che riposano gli occhi.',
  },
  {
    id: 'smooth',
    name: 'Morbido',
    description: 'Colori smorzati, più presenti dei pastello ma mai accesi.',
  },
  {
    id: 'regular',
    name: 'Regolare',
    description: 'I colori pieni di ogni tema, come nelle versioni precedenti.',
  },
  {
    id: 'solarized',
    name: 'Solarized',
    description: 'Gli accenti caldi e calibrati della tavolozza Solarized.',
  },
];

export const COLOR_PRESET_IDS: readonly ColorPreset[] = COLOR_PRESETS.map((preset) => preset.id);

export const DEFAULT_COLOR_PRESET: ColorPreset = 'pastel';

/** The colors that stand apart from the light color of the same hue by being deeper. */
const DEEP: readonly TaskColorId[] = ['navy', 'petrol', 'forest', 'wine', 'plum', 'slate'];

/**
 * How a preset draws the colors in a light or dark theme. The fill, which is the border of a bar
 * and the whole bar of a person, has one lightness and at most one chroma; the background of a
 * bar is the fill over the surface of the theme.
 */
interface Recipe {
  fill: { l: number; c: number };
  deepFill: { l: number; c: number };
  /** How much of the fill makes the background of a bar. */
  background: number;
  deepBackground: number;
  /** How much of the ink the text starts from, before it reaches 4.5:1. */
  text: number;
}

const RECIPES: Record<'pastel' | 'smooth', { light: Recipe; dark: Recipe }> = {
  pastel: {
    light: {
      fill: { l: 0.85, c: 0.08 },
      deepFill: { l: 0.75, c: 0.07 },
      background: 0.3,
      deepBackground: 0.4,
      text: 0.55,
    },
    dark: {
      fill: { l: 0.82, c: 0.075 },
      deepFill: { l: 0.7, c: 0.065 },
      background: 0.2,
      deepBackground: 0.24,
      text: 0.55,
    },
  },
  smooth: {
    light: {
      fill: { l: 0.75, c: 0.105 },
      deepFill: { l: 0.6, c: 0.09 },
      background: 0.24,
      deepBackground: 0.32,
      text: 0.6,
    },
    dark: {
      fill: { l: 0.7, c: 0.1 },
      deepFill: { l: 0.58, c: 0.09 },
      background: 0.24,
      deepBackground: 0.3,
      text: 0.6,
    },
  },
};

/** The eight accents of Solarized, and its two grays of content. */
const SOLARIZED = {
  yellow: '#B58900',
  orange: '#CB4B16',
  red: '#DC322F',
  magenta: '#D33682',
  violet: '#6C71C4',
  blue: '#268BD2',
  cyan: '#2AA198',
  green: '#859900',
  base01: '#586E75',
  base1: '#93A1A1',
};

/** A color moved in lightness, and its chroma scaled, keeping its hue. */
function shifted(hex: string, lightness: number, chroma = 1): string {
  const color = toOklch(hex);
  return fromOklch({ l: color.l + lightness, c: color.c * chroma, h: color.h });
}

/**
 * Each color as an accent of Solarized, or a blend of two, paler where it needs to. The deep ones
 * are darker in a light theme and lighter, a little grayer, in a dark one: always further from
 * the surface than their light color.
 */
function solarizedFills(dark: boolean): Record<TaskColorId, string> {
  const deeper = (hex: string) => (dark ? shifted(hex, 0.12, 0.75) : shifted(hex, -0.15));
  return {
    yellow: SOLARIZED.yellow,
    gray: dark ? SOLARIZED.base01 : SOLARIZED.base1,
    blue: SOLARIZED.blue,
    ice: shifted(SOLARIZED.blue, 0.2, 0.35),
    green: SOLARIZED.green,
    indigo: mix(SOLARIZED.violet, SOLARIZED.blue, 0.45),
    red: SOLARIZED.red,
    purple: SOLARIZED.violet,
    orange: SOLARIZED.orange,
    coral: mix(SOLARIZED.orange, SOLARIZED.red, 0.5),
    pink: shifted(mix(SOLARIZED.magenta, SOLARIZED.red, 0.3), 0.1, 0.8),
    magenta: SOLARIZED.magenta,
    teal: SOLARIZED.cyan,
    lime: shifted(mix(SOLARIZED.green, SOLARIZED.yellow, 0.35), 0.08),
    olive: mix(SOLARIZED.yellow, SOLARIZED.base01, 0.5),
    brown: mix(SOLARIZED.orange, SOLARIZED.base01, 0.55),
    navy: deeper(SOLARIZED.blue),
    cyan: mix(SOLARIZED.cyan, SOLARIZED.blue, 0.35),
    petrol: deeper(SOLARIZED.cyan),
    forest: deeper(SOLARIZED.green),
    amber: mix(SOLARIZED.yellow, SOLARIZED.orange, 0.5),
    wine: deeper(SOLARIZED.red),
    plum: deeper(SOLARIZED.magenta),
    slate: dark ? SOLARIZED.base1 : SOLARIZED.base01,
  };
}

const SOLARIZED_FILLS = { light: solarizedFills(false), dark: solarizedFills(true) };

/** A fill with its background over the surface and text readable on it, as the themes make them. */
function tintOf(fill: string, theme: Theme, background: number, text: number): TaskTint {
  const ink = theme.dark ? '#FFFFFF' : '#000000';
  const bg = mix(theme.colors.surface, fill, background);
  return { bg, border: fill, fg: ensureContrast(mix(fill, ink, text), [bg], 4.5, ink) };
}

/**
 * The fill of a color in a recipe: the hue of the theme's own, with the preset's lightness and
 * chroma. Ice is a gray of blue, a little further from the surface than blue; brown is grayer
 * than orange.
 */
function recipeFill(own: string, id: TaskColorId, recipe: Recipe, dark: boolean): string {
  const { c, h } = toOklch(own);
  const target = DEEP.includes(id) ? recipe.deepFill : recipe.fill;
  if (id === 'ice')
    return fromOklch({ l: target.l + (dark ? 0.06 : -0.04), c: Math.min(c, 0.02), h });
  return fromOklch({
    l: target.l,
    // A gray stays a gray: the chroma of the theme's own color is a ceiling too.
    c: Math.min(c, target.c) * (id === 'brown' ? 0.6 : 1),
    h,
  });
}

function computePreset(theme: Theme, preset: Exclude<ColorPreset, 'regular'>) {
  const tasks = {} as Record<TaskColorId, TaskTint>;
  for (const id of TASK_COLOR_IDS) {
    const deep = DEEP.includes(id);
    if (preset === 'solarized') {
      const background = theme.dark ? (deep ? 0.3 : 0.24) : deep ? 0.26 : 0.18;
      tasks[id] = tintOf(
        SOLARIZED_FILLS[theme.dark ? 'dark' : 'light'][id],
        theme,
        background,
        0.6,
      );
    } else {
      const recipe = RECIPES[preset][theme.dark ? 'dark' : 'light'];
      const fill = recipeFill(theme.tasks[id].border, id, recipe, theme.dark);
      tasks[id] = tintOf(
        fill,
        theme,
        deep ? recipe.deepBackground : recipe.background,
        recipe.text,
      );
    }
  }
  return tasks;
}

const computed = new WeakMap<Theme, Map<ColorPreset, Record<TaskColorId, TaskTint>>>();

/** The 24 colors of a theme in a preset; «Regular» is the theme's own set. */
export function presetTasks(theme: Theme, preset: ColorPreset): Record<TaskColorId, TaskTint> {
  if (preset === 'regular') return theme.tasks;
  let byPreset = computed.get(theme);
  if (!byPreset) {
    byPreset = new Map();
    computed.set(theme, byPreset);
  }
  let tasks = byPreset.get(preset);
  if (!tasks) {
    tasks = computePreset(theme, preset);
    byPreset.set(preset, tasks);
  }
  return tasks;
}
