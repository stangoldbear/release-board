import type { TaskColorId } from '../domain/colors';
import { contrast, ensureContrast, mix } from './color';
import type { TaskTint, Theme } from './index';

/**
 * The colors that make a theme recognizable, as its editor theme defines them: backgrounds,
 * text, the accent of its buttons and links, and its syntax palette.
 */
export interface ThemeSeed {
  id: string;
  name: string;
  dark: boolean;
  /** Around the editor: side bar and activity bar. */
  canvas: string;
  /** The editor itself. */
  surface: string;
  /** Secondary panels, such as the tab bar. */
  muted: string;
  /** Hover and selection. */
  strong: string;
  /** Borders, when the theme has its own. */
  line?: string;
  fg: string;
  /** Descriptions, or comments. */
  fgMuted: string;
  /** The primary button. */
  accent: string;
  link?: string;
  red: string;
  orange: string;
  yellow: string;
  green: string;
  cyan: string;
  blue: string;
  purple: string;
}

const WHITE = '#FFFFFF';
const BLACK = '#000000';

/** Below this contrast with the surface, a background reads as the surface itself. */
const DISTINCT = 1.08;

/** Above this contrast with the surface, a border is too loud for the dividers of the grid. */
const QUIET_LINE = 2;

/** From this contrast with white, an accent keeps white text and only darkens a little. */
const WHITE_TEXT_FROM = 3;

/**
 * A complete theme from the colors of an editor theme. Backgrounds keep the theme's own colors;
 * text, icons and borders move towards black or white only as far as WCAG AA requires on every
 * background they sit on (4.5:1 for text, 3:1 for borders and the focus ring), so the theme
 * stays recognizable and readable at once.
 */
export function deriveTheme(seed: ThemeSeed): Theme {
  const { dark, surface } = seed;
  // Text gains contrast towards white on dark themes, towards black on light ones.
  const ink = dark ? WHITE : BLACK;
  const tint = (color: string, light: number, darkAmount: number) =>
    mix(surface, color, dark ? darkAmount : light);
  const readable = (color: string, backgrounds: string[], minimum = 4.5) =>
    ensureContrast(color, backgrounds, minimum, ink);

  const canvas = seed.canvas;
  const surfaceMuted =
    contrast(seed.muted, surface) >= DISTINCT ? seed.muted : mix(surface, seed.fg, 0.04);
  const surfaceStrong =
    contrast(seed.strong, surface) >= DISTINCT ? seed.strong : mix(surface, seed.fg, 0.1);
  // Dividers stay quiet: a border as bright as Dracula's purple would draw the whole grid.
  const line =
    seed.line &&
    contrast(seed.line, surface) >= DISTINCT &&
    contrast(seed.line, surface) <= QUIET_LINE
      ? seed.line
      : mix(surface, seed.fg, 0.15);

  // An accent with readable text on it: white, as on most buttons, when a little darker accent is
  // enough for 4.5:1; otherwise the dark of the theme, as on the light accents of dark themes.
  const deep = dark ? surface : BLACK;
  const onAccent =
    contrast(seed.accent, WHITE) >= WHITE_TEXT_FROM ||
    contrast(seed.accent, WHITE) >= contrast(seed.accent, deep)
      ? WHITE
      : deep;
  const accent = ensureContrast(seed.accent, [onAccent], 4.5, onAccent === WHITE ? BLACK : WHITE);

  const accentSoft = tint(accent, 0.14, 0.24);
  const dangerSoft = tint(seed.red, 0.12, 0.2);
  const warningSoft = tint(seed.yellow, 0.2, 0.18);
  const holiday = tint(seed.red, 0.08, 0.12);
  const past = tint(seed.fgMuted, 0.1, 0.1);
  const approvalSoft = {
    green: tint(seed.green, 0.15, 0.2),
    orange: tint(seed.orange, 0.15, 0.2),
    red: tint(seed.red, 0.15, 0.2),
  };

  const danger = readable(seed.red, [surface, dangerSoft]);

  const tasks = {} as Record<TaskColorId, TaskTint>;
  const hues: [TaskColorId, string][] = [
    ['yellow', seed.yellow],
    ['gray', seed.fgMuted],
    ['blue', seed.blue],
    ['ice', seed.cyan],
    ['green', seed.green],
    ['indigo', mix(seed.blue, seed.purple, 0.5)],
    ['red', seed.red],
    ['purple', seed.purple],
  ];
  for (const [id, hue] of hues) {
    // Ice is the palest of all, close to the surface.
    const bg = id === 'ice' ? tint(hue, 0.06, 0.1) : tint(hue, 0.16, 0.24);
    tasks[id] = { bg, border: hue, fg: readable(mix(hue, ink, 0.6), [bg]) };
  }

  return {
    name: seed.name,
    dark,
    colors: {
      canvas,
      surface,
      'surface-muted': surfaceMuted,
      'surface-strong': surfaceStrong,
      line,
      'line-strong': readable(mix(surface, seed.fg, 0.45), [surface, surfaceMuted], 3),
      fg: readable(seed.fg, [
        canvas,
        surface,
        surfaceMuted,
        surfaceStrong,
        accentSoft,
        dangerSoft,
        warningSoft,
        holiday,
        past,
      ]),
      'fg-muted': readable(seed.fgMuted, [
        canvas,
        surface,
        surfaceMuted,
        surfaceStrong,
        holiday,
        past,
        accentSoft,
        warningSoft,
        dangerSoft,
      ]),
      accent,
      'on-accent': onAccent,
      'accent-soft': accentSoft,
      link: readable(seed.link ?? accent, [surface, surfaceMuted, accentSoft, warningSoft]),
      focus: readable(
        accent,
        [
          canvas,
          surface,
          surfaceMuted,
          surfaceStrong,
          holiday,
          past,
          approvalSoft.green,
          approvalSoft.orange,
          approvalSoft.red,
        ],
        3,
      ),
      danger,
      // Light on dark themes and dark on light ones: the surface reads on it as it reads on the surface.
      'on-danger': dark ? surface : WHITE,
      'danger-soft': dangerSoft,
      warning: readable(seed.yellow, [surface, warningSoft]),
      'warning-soft': warningSoft,
      success: readable(seed.green, [surface]),
      holiday,
      'holiday-fg': readable(seed.red, [surface, holiday]),
      past,
      'approval-green': readable(seed.green, [surface, surfaceMuted, approvalSoft.green]),
      'approval-green-soft': approvalSoft.green,
      'approval-orange': readable(seed.orange, [surface, surfaceMuted, approvalSoft.orange]),
      'approval-orange-soft': approvalSoft.orange,
      'approval-red': readable(seed.red, [surface, surfaceMuted, approvalSoft.red]),
      'approval-red-soft': approvalSoft.red,
      overlay: BLACK,
    },
    tasks,
  };
}
