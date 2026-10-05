import type { CSSProperties } from 'react';
import { TASK_COLOR_IDS } from '../domain/colors';
import type { TaskColorId } from '../domain/colors';
import darkModern from './dark-modern.json';
import { deriveTheme } from './derive';
import lightModern from './light-modern.json';
import { VSCODE_THEME_SEEDS } from './vscodeThemes';

/** The semantic colors of the interface. tokens.css turns each one into Tailwind utilities. */
export const COLOR_TOKENS = [
  /** Page background. */
  'canvas',
  /** Cards, header, dialogs, fields. */
  'surface',
  /** Secondary areas on a surface: row labels, dialog header and footer. */
  'surface-muted',
  /** Hover and selected backgrounds, tracks of segmented controls. */
  'surface-strong',
  /** Dividers. */
  'line',
  /** Borders of fields and controls. */
  'line-strong',
  'fg',
  /** Secondary text. */
  'fg-muted',
  /** Primary actions. */
  'accent',
  'on-accent',
  /** Today and other highlights. */
  'accent-soft',
  'link',
  'focus',
  /** Destructive actions and errors. */
  'danger',
  'on-danger',
  'danger-soft',
  /** Daily notes. */
  'warning',
  'warning-soft',
  'success',
  /** Weekends and holidays. */
  'holiday',
  'holiday-fg',
  /** Days before today. */
  'past',
  /** Approval light of a day in the revenue forecast: text, and the background of its cell. */
  'approval-green',
  'approval-green-soft',
  'approval-orange',
  'approval-orange-soft',
  'approval-red',
  'approval-red-soft',
  /** Behind modal dialogs, used with transparency. */
  'overlay',
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

/** How one task color looks in a theme. */
export interface TaskTint {
  bg: string;
  border: string;
  fg: string;
}

export interface Theme {
  name: string;
  dark: boolean;
  colors: Record<ColorToken, string>;
  tasks: Record<TaskColorId, TaskTint>;
}

/** The app's own themes, the ones that follow the system. */
const BUILT_IN_THEMES = {
  'light-modern': lightModern,
  'dark-modern': darkModern,
} satisfies Record<string, Theme>;

/** Themes inspired by Visual Studio Code, chosen in the settings among the custom ones. */
export type CustomThemeId = (typeof VSCODE_THEME_SEEDS)[number]['id'];

type BuiltInThemeId = keyof typeof BUILT_IN_THEMES;

export type ThemeId = BuiltInThemeId | CustomThemeId;

/** The custom themes in the order of the list: the light ones, then the dark ones. */
export const CUSTOM_THEME_IDS: readonly CustomThemeId[] = VSCODE_THEME_SEEDS.map((seed) => seed.id);

export const THEME_IDS: readonly ThemeId[] = [
  ...(Object.keys(BUILT_IN_THEMES) as BuiltInThemeId[]),
  ...CUSTOM_THEME_IDS,
];

const derived = new Map<ThemeId, Theme>();

/**
 * A theme by id. Colors are #rrggbb, so that contrast can be checked. The custom themes are
 * worked out the first time they are needed: the one in use when the app opens, the others when
 * their list does.
 */
export function getTheme(id: ThemeId): Theme {
  if (id === 'light-modern' || id === 'dark-modern') return BUILT_IN_THEMES[id];
  let theme = derived.get(id);
  if (!theme) {
    const seed = VSCODE_THEME_SEEDS.find((item) => item.id === id);
    if (!seed) throw new Error(`Unknown theme ${id}`);
    theme = deriveTheme(seed);
    derived.set(id, theme);
  }
  return theme;
}

/** Whether a theme is dark, without working out its colors. */
export function isDarkTheme(id: ThemeId): boolean {
  if (id === 'light-modern' || id === 'dark-modern') return BUILT_IN_THEMES[id].dark;
  return VSCODE_THEME_SEEDS.some((seed) => seed.id === id && seed.dark);
}

/** A theme, or the light or dark theme that follows the system setting. */
export type ThemePreference = 'system' | ThemeId;

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', ...THEME_IDS];

/** Themes used when the preference follows the system. */
export const SYSTEM_THEMES: Record<'light' | 'dark', ThemeId> = {
  light: 'light-modern',
  dark: 'dark-modern',
};

export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): Theme {
  if (preference !== 'system') return getTheme(preference);
  return getTheme(SYSTEM_THEMES[systemIsDark ? 'dark' : 'light']);
}

/** Sets the theme's colors as the --rb-* variables that tokens.css reads. */
export function applyTheme(theme: Theme, root: HTMLElement): void {
  for (const token of COLOR_TOKENS) root.style.setProperty(`--rb-${token}`, theme.colors[token]);
  for (const id of TASK_COLOR_IDS) {
    const tint = theme.tasks[id];
    root.style.setProperty(`--rb-task-${id}-bg`, tint.bg);
    root.style.setProperty(`--rb-task-${id}-border`, tint.border);
    root.style.setProperty(`--rb-task-${id}-fg`, tint.fg);
  }
  // The browser's own controls, such as date pickers and scrollbars, follow the theme too.
  root.style.colorScheme = theme.dark ? 'dark' : 'light';
}

/** Background, border and text of a task color in the current theme. */
export function taskColorStyle(colorId: TaskColorId): CSSProperties {
  return {
    backgroundColor: `var(--rb-task-${colorId}-bg)`,
    borderColor: `var(--rb-task-${colorId}-border)`,
    color: `var(--rb-task-${colorId}-fg)`,
  };
}
