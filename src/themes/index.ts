import type { CSSProperties } from 'react';
import { TASK_COLOR_IDS } from '../domain/colors';
import type { TaskColorId } from '../domain/colors';
import darkModern from './dark-modern.json';
import lightModern from './light-modern.json';

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

/** Every available theme, by id. Colors are #rrggbb, so that contrast can be checked. */
export const THEMES = {
  'light-modern': lightModern,
  'dark-modern': darkModern,
} satisfies Record<string, Theme>;

export type ThemeId = keyof typeof THEMES;

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

/** A theme, or the light or dark theme that follows the system setting. */
export type ThemePreference = 'system' | ThemeId;

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', ...THEME_IDS];

/** Themes used when the preference follows the system. */
export const SYSTEM_THEMES: Record<'light' | 'dark', ThemeId> = {
  light: 'light-modern',
  dark: 'dark-modern',
};

export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): Theme {
  if (preference !== 'system') return THEMES[preference];
  return THEMES[SYSTEM_THEMES[systemIsDark ? 'dark' : 'light']];
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
