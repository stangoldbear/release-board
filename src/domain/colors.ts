/** The colors a task can have. Each theme defines how they look. */
export const TASK_COLORS = [
  { id: 'yellow', name: 'Giallo' },
  { id: 'gray', name: 'Grigio' },
  { id: 'blue', name: 'Azzurro' },
  { id: 'ice', name: 'Ghiaccio' },
  { id: 'green', name: 'Verde' },
  { id: 'indigo', name: 'Indaco' },
  { id: 'red', name: 'Rosso' },
  { id: 'purple', name: 'Viola' },
] as const;

export type TaskColorId = (typeof TASK_COLORS)[number]['id'];

export const TASK_COLOR_IDS: readonly TaskColorId[] = TASK_COLORS.map((color) => color.id);

export const DEFAULT_COLOR_ID: TaskColorId = 'yellow';

/** Color ids written by the previous data format, mapped to the current ones. */
const LEGACY_COLOR_IDS: Record<string, TaskColorId> = {
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

export function isKnownColorId(colorId: string): colorId is TaskColorId {
  return (TASK_COLOR_IDS as readonly string[]).includes(colorId);
}
