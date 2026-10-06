import type { DailyNotes, Memo, Project, TaskItem, TaskStatus } from './types';

/** A search finds the items with all its words, or with at least one of them. */
export type SearchMode = 'all' | 'any';
export const SEARCH_MODES: readonly SearchMode[] = ['all', 'any'];

export interface TaskFilter {
  /** Text to find in tasks, notes, free notes and projects. */
  search: string;
  /** All the words of the search, the default, or any of them. */
  mode?: SearchMode;
  /** Only tasks in this status; null for all of them. */
  status: TaskStatus | null;
}

export const NO_FILTER: TaskFilter = { search: '', status: null };

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

/** The words of a search, lowercase and without accents; none when nothing is searched. */
export function searchWords(search: string): string[] {
  return normalize(search).split(/\s+/).filter(Boolean);
}

/**
 * True when the texts, together, have every word of the search, or at least one in the 'any'
 * mode: a word in the title and another in the description count. An empty search finds
 * everything.
 */
function matches(
  texts: readonly (string | undefined)[],
  search: string,
  mode: SearchMode = 'all',
): boolean {
  const words = searchWords(search);
  if (words.length === 0) return true;
  const found = texts.flatMap((text) => (text === undefined ? [] : [normalize(text)]));
  const has = (word: string) => found.some((text) => text.includes(word));
  return mode === 'all' ? words.every(has) : words.some(has);
}

/** The tasks in the status, with the searched words in title, assignee or description. */
export function filterTasks(tasks: readonly TaskItem[], filter: TaskFilter): TaskItem[] {
  return tasks.filter(
    (task) =>
      (filter.status === null || task.status === filter.status) &&
      matches([task.title, task.assignee, task.description], filter.search, filter.mode),
  );
}

/**
 * Whether the note of a day shows: always without a search, otherwise when the search finds it.
 * A hidden note still takes its day.
 */
export function isNoteShown(matches: Set<string> | null, date: string): boolean {
  return matches === null || matches.has(date);
}

/** The days whose note has the searched words; null while nothing is searched. */
export function matchingNoteDays(
  notes: DailyNotes,
  search: string,
  mode: SearchMode = 'all',
): Set<string> | null {
  if (search.trim() === '') return null;
  return new Set(
    Object.entries(notes)
      .filter(([, text]) => matches([text], search, mode))
      .map(([date]) => date),
  );
}

/**
 * The free notes with the searched words in title, text, or the username or the full name of
 * their author, when `authorName` knows it.
 */
export function filterMemos(
  memos: readonly Memo[],
  search: string,
  mode: SearchMode = 'all',
  authorName: (memo: Memo) => string | undefined = () => undefined,
): Memo[] {
  return memos.filter((memo) =>
    matches([memo.title, memo.body, memo.author?.login, authorName(memo)], search, mode),
  );
}

/** The projects of the roadmap with the searched words in title, owner or description. */
export function filterProjects(
  projects: readonly Project[],
  search: string,
  mode: SearchMode = 'all',
): Project[] {
  return projects.filter((project) =>
    matches([project.title, project.owner, project.description], search, mode),
  );
}

/**
 * Where the words of a search are in a text, to highlight them: ranges of the text, start
 * included and end excluded, in order and without overlaps. Accents and case do not count, as in
 * the search.
 */
export function highlightRanges(text: string, words: readonly string[]): [number, number][] {
  if (words.length === 0) return [];
  // The normalized text, with where each of its characters comes from in the original one.
  let normalized = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let at = 0;
  for (const char of text) {
    const pieces = normalize(char);
    // An accent written apart belongs to the letter before it, and is highlighted with it.
    if (pieces === '' && ends.length > 0) ends[ends.length - 1] = at + char.length;
    // One entry per UTF-16 unit, as indexOf counts them: an emoji takes two.
    normalized += pieces;
    for (let unit = 0; unit < pieces.length; unit++) {
      starts.push(at);
      ends.push(at + char.length);
    }
    at += char.length;
  }
  const found: [number, number][] = [];
  for (const word of words) {
    for (
      let index = normalized.indexOf(word);
      index >= 0;
      index = normalized.indexOf(word, index + 1)
    ) {
      const start = starts[index];
      const end = ends[index + word.length - 1];
      if (start !== undefined && end !== undefined) found.push([start, end]);
    }
  }
  found.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of found) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}

/** What a search can find, in the order of the areas on the page. */
export type SearchResultKind = 'memo' | 'task' | 'note' | 'project';

/** One thing a search found, to bring into view. */
export interface SearchResult {
  kind: SearchResultKind;
  /** The id of the item; the day, for the note of a day. */
  id: string;
  /** The day of the calendar to show: the start of a task, the day of a note. */
  date?: string;
  /** The last day of a task, which tells whether it is all in the past. */
  endDate?: string;
  /** What it is, for screen readers: "attività «Collaudo»". */
  label: string;
}

/**
 * The results of a search in the order of the page: the free notes, then the tasks and the notes
 * of the days by date, then the projects. Each list comes in its own order.
 */
export function searchResults(found: {
  memos: readonly Memo[];
  tasks: readonly TaskItem[];
  notes: Readonly<Record<string, string>>;
  projects: readonly Project[];
}): SearchResult[] {
  const quoted = (text: string) => `«${text.replace(/\s+/g, ' ').trim()}»`;
  const dated: SearchResult[] = [
    ...found.tasks.map((task) => ({
      kind: 'task' as const,
      id: task.id,
      date: task.startDate,
      endDate: task.endDate,
      label: `attività ${quoted(task.title)}`,
    })),
    ...Object.keys(found.notes).map((date) => ({
      kind: 'note' as const,
      id: date,
      date,
      endDate: date,
      label: `nota del giorno ${date.split('-').reverse().join('/')}`,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return [
    ...found.memos.map((memo) => ({
      kind: 'memo' as const,
      id: memo.id,
      label: `nota libera ${quoted(memo.title)}`,
    })),
    ...dated,
    ...found.projects.map((project) => ({
      kind: 'project' as const,
      id: project.id,
      label: `progetto ${quoted(project.title)}`,
    })),
  ];
}

/**
 * The result after `current`, or before it when `by` is -1, going round at the ends; with none
 * shown yet, the first or the last.
 */
export function stepResult(current: number | null, total: number, by: 1 | -1): number {
  if (current === null) return by === 1 ? 0 : total - 1;
  return (current + by + total) % total;
}
