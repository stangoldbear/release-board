import type { TaskColor } from '../types';

export const COLOR_PRESETS: TaskColor[] = [
  {
    id: 'yellow',
    name: 'Giallo',
    bg: 'bg-amber-100',
    border: 'border-amber-400',
    text: 'text-amber-950',
    badgeBg: 'bg-amber-200 text-amber-900',
  },
  {
    id: 'gray',
    name: 'Grigio',
    bg: 'bg-slate-200',
    border: 'border-slate-400',
    text: 'text-slate-900',
    badgeBg: 'bg-slate-300 text-slate-800',
  },
  {
    id: 'blue',
    name: 'Azzurro',
    bg: 'bg-sky-100',
    border: 'border-sky-400',
    text: 'text-sky-950',
    badgeBg: 'bg-sky-200 text-sky-900',
  },
  {
    id: 'ice',
    name: 'Ghiaccio',
    bg: 'bg-slate-50',
    border: 'border-sky-400',
    text: 'text-slate-800',
    badgeBg: 'bg-slate-200 text-slate-700',
  },
  {
    id: 'green',
    name: 'Verde',
    bg: 'bg-emerald-100',
    border: 'border-emerald-400',
    text: 'text-emerald-950',
    badgeBg: 'bg-emerald-200 text-emerald-900',
  },
  {
    id: 'indigo',
    name: 'Indaco',
    bg: 'bg-indigo-100',
    border: 'border-indigo-400',
    text: 'text-indigo-950',
    badgeBg: 'bg-indigo-200 text-indigo-900',
  },
  {
    id: 'red',
    name: 'Rosso',
    bg: 'bg-rose-100',
    border: 'border-rose-400',
    text: 'text-rose-950',
    badgeBg: 'bg-rose-200 text-rose-900',
  },
  {
    id: 'purple',
    name: 'Viola',
    bg: 'bg-purple-100',
    border: 'border-purple-400',
    text: 'text-purple-950',
    badgeBg: 'bg-purple-200 text-purple-900',
  },
];

export const DEFAULT_COLOR_ID = 'yellow';

/** Color ids written by the previous data format, mapped to the current ones. */
const LEGACY_COLOR_IDS: Record<string, string> = {
  'server-yellow': 'yellow',
  'release-gray': 'gray',
  'mobile-blue': 'blue',
  'qa-ice': 'ice',
  'emerald-deploy': 'green',
  'indigo-feature': 'indigo',
  'rose-critical': 'red',
  'purple-design': 'purple',
};

export function normalizeColorId(colorId: string): string {
  return LEGACY_COLOR_IDS[colorId] ?? colorId;
}

export function isKnownColorId(colorId: string): boolean {
  return COLOR_PRESETS.some((color) => color.id === colorId);
}

export function getColorById(colorId: string): TaskColor {
  return COLOR_PRESETS.find((color) => color.id === colorId) ?? COLOR_PRESETS[0];
}
