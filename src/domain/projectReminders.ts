import type { SeenReminders } from './memos';
import type { Project } from './types';
import { addDaysIso } from '../utils/dateUtils';

// The alert of a project: some days before its hard deadline, or without one before its go-live,
// the end of its work; shown once per browser, as the alerts of the notes.

/** The most days before the date an alert can be asked for. */
export const REMIND_DAYS_MAX = 365;

/** The choices of the window: none, the day itself, or some days before. */
export const REMIND_DAYS_OPTIONS: readonly { days: number | null; label: string }[] = [
  { days: null, label: 'Nessuno' },
  { days: 0, label: 'Il giorno stesso' },
  { days: 1, label: '1 giorno prima' },
  { days: 3, label: '3 giorni prima' },
  { days: 7, label: '1 settimana prima' },
  { days: 14, label: '2 settimane prima' },
  { days: 30, label: '1 mese prima' },
];

export function isRemindDays(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= REMIND_DAYS_MAX
  );
}

/** "il giorno stesso", "3 giorni prima": the choice in words, for the history and the window. */
export function describeRemindDays(days: number): string {
  if (days === 0) return 'il giorno stesso';
  return `${days} ${days === 1 ? 'giorno' : 'giorni'} prima`;
}

/** A project whose alert has come, with the day it is about. */
export interface DueProject {
  project: Project;
  /** The hard deadline, or the end of the work. */
  date: string;
  /** The alert is about the hard deadline rather than the end of the work. */
  deadline: boolean;
}

/**
 * The projects whose alert has come today or before: those that asked for one and are not
 * completed, from the days before their hard deadline, or their end without one, that this
 * browser has not dismissed yet for that day.
 */
export function dueProjects(
  projects: readonly Project[],
  endOf: (project: Project) => string,
  today: string,
  seen: SeenReminders,
): DueProject[] {
  return projects.flatMap((project) => {
    if (project.remindDaysBefore === undefined || project.status === 'completed') return [];
    const date = project.deadline ?? endOf(project);
    if (addDaysIso(date, -project.remindDaysBefore) > today || seen[project.id] === date) {
      return [];
    }
    return [{ project, date, deadline: project.deadline !== undefined }];
  });
}

/** The alerts dismissed, by project and day; those of projects gone are forgotten. */
export function rememberProjectReminders(
  seen: SeenReminders,
  shown: readonly DueProject[],
  existing: readonly Project[],
): SeenReminders {
  const ids = new Set(existing.map((project) => project.id));
  const kept: Record<string, string> = Object.fromEntries(
    Object.entries(seen).filter(([id]) => ids.has(id)),
  );
  for (const due of shown) kept[due.project.id] = due.date;
  return kept;
}
