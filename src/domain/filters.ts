import type { DailyNotes, Memo, TaskItem, TaskStatus } from './types';

export interface TaskFilter {
  /** Text to find in tasks, in the notes of the days and in the free notes. */
  search: string;
  /** Only tasks in this status; null for all of them. */
  status: TaskStatus | null;
}

export const NO_FILTER: TaskFilter = { search: '', status: null };

export function isFiltering(filter: TaskFilter): boolean {
  return filter.status !== null || isSearching(filter);
}

export function isSearching(filter: TaskFilter): boolean {
  return filter.search.trim() !== '';
}

/** Lowercase and without accents, so that "attivita" finds "attività". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** True when one of the texts has the searched one; an empty search finds everything. */
function matches(texts: readonly (string | undefined)[], search: string): boolean {
  const query = normalize(search.trim());
  return (
    query === '' || texts.some((text) => text !== undefined && normalize(text).includes(query))
  );
}

/** The tasks in the status, with the searched text in title, assignee or description. */
export function filterTasks(tasks: readonly TaskItem[], filter: TaskFilter): TaskItem[] {
  return tasks.filter(
    (task) =>
      (filter.status === null || task.status === filter.status) &&
      matches([task.title, task.assignee, task.description], filter.search),
  );
}

/**
 * Whether the note of a day shows: always without a search, otherwise when the search finds it.
 * A hidden note still takes its day.
 */
export function isNoteShown(matches: Set<string> | null, date: string): boolean {
  return matches === null || matches.has(date);
}

/** The days whose note has the searched text; null while nothing is searched. */
export function matchingNoteDays(notes: DailyNotes, search: string): Set<string> | null {
  if (search.trim() === '') return null;
  return new Set(
    Object.entries(notes)
      .filter(([, text]) => matches([text], search))
      .map(([date]) => date),
  );
}

/** The free notes with the searched text in title, text or the username of their author. */
export function filterMemos(memos: readonly Memo[], search: string): Memo[] {
  return memos.filter((memo) => matches([memo.title, memo.body, memo.author?.login], search));
}
