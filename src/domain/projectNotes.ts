import { isIsoDate, isIsoDateTime } from '../utils/dateUtils';
import type { SeenReminders } from './memos';
import type { MemoAuthor, ProjectNote, ProjectNoteStatus } from './types';

/** Longest text of a note, and its lists of owners and tags; the security rules enforce the same. */
export const PROJECT_NOTE_TEXT_MAX = 2000;
export const NOTE_LIST_MAX = 20;
export const NOTE_LIST_ITEM_MAX = 60;

export const PROJECT_NOTE_STATUSES: readonly ProjectNoteStatus[] = ['open', 'done'];

export const PROJECT_NOTE_STATUS_LABELS: Record<ProjectNoteStatus, string> = {
  open: 'Da fare',
  done: 'Fatta',
};

/** What a new note holds; its time and author are set by whoever saves it. */
export type ProjectNoteContent = Omit<ProjectNote, 'id' | 'createdAt' | 'author'>;

/** Fields of a note to change; null removes an optional one. */
export interface ProjectNoteChanges {
  text?: string;
  status?: ProjectNoteStatus | null;
  dueOn?: string | null;
  remind?: true | null;
  owners?: string[] | null;
  tags?: string[] | null;
}

/** The notes oldest first, as they were written; the id breaks ties, so every copy agrees. */
export function sortProjectNotes(notes: readonly ProjectNote[]): ProjectNote[] {
  return [...notes].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}

export function notesOfProject(notes: readonly ProjectNote[], projectId: string): ProjectNote[] {
  return sortProjectNotes(notes.filter((note) => note.projectId === projectId));
}

/** "a, b ,, c" gives ["a", "b", "c"]: trimmed, without blanks or repeats, at most NOTE_LIST_MAX. */
export function splitList(text: string): string[] {
  const items: string[] = [];
  for (const piece of text.split(',')) {
    const item = piece.trim().slice(0, NOTE_LIST_ITEM_MAX);
    if (item && !items.includes(item)) items.push(item);
  }
  return items.slice(0, NOTE_LIST_MAX);
}

function sameList(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  return (a ?? []).join('\u0000') === (b ?? []).join('\u0000');
}

/**
 * The fields that differ between a note and what the editor saves. Blank text is not a change:
 * a note always has a text. Empty lists, no state, no deadline remove the field.
 */
export function diffProjectNote(
  before: ProjectNote,
  after: ProjectNoteContent,
): ProjectNoteChanges {
  const changes: ProjectNoteChanges = {};
  const text = after.text.trim();
  if (text && text !== before.text) changes.text = text;
  if (after.status !== before.status) changes.status = after.status ?? null;
  const dueOn = after.dueOn || undefined;
  if (dueOn !== before.dueOn) changes.dueOn = dueOn ?? null;
  // Without a deadline there is nothing to be reminded of.
  const remind = dueOn && after.remind ? true : undefined;
  if (remind !== before.remind) changes.remind = remind ?? null;
  const owners = after.owners && after.owners.length > 0 ? after.owners : undefined;
  if (!sameList(owners, before.owners)) changes.owners = owners ?? null;
  const tags = after.tags && after.tags.length > 0 ? after.tags : undefined;
  if (!sameList(tags, before.tags)) changes.tags = tags ?? null;
  return changes;
}

/** The owners and tags already written in some notes, each once, in alphabetical order. */
export function noteSuggestions(notes: readonly ProjectNote[]): {
  owners: string[];
  tags: string[];
} {
  const distinct = (lists: (readonly string[] | undefined)[]) =>
    [...new Set(lists.flatMap((list) => list ?? []))].sort((a, b) =>
      a.localeCompare(b, 'it', { sensitivity: 'base' }),
    );
  return {
    owners: distinct(notes.map((note) => note.owners)),
    tags: distinct(notes.map((note) => note.tags)),
  };
}

/** A note past its deadline and not done. */
export function isNoteOverdue(note: Pick<ProjectNote, 'dueOn' | 'status'>, today: string): boolean {
  return note.dueOn !== undefined && note.dueOn < today && note.status !== 'done';
}

/**
 * The notes whose deadline has come, today or before, that ask to be reminded of, are not done
 * and this browser has not shown yet: `seen` keeps the deadline each note was shown for, so a
 * deadline moved to another day shows the note again.
 */
export function dueProjectNotes(
  notes: readonly ProjectNote[],
  today: string,
  seen: SeenReminders,
): ProjectNote[] {
  return sortProjectNotes(notes).filter(
    (note) =>
      note.remind === true &&
      note.dueOn !== undefined &&
      note.dueOn <= today &&
      note.status !== 'done' &&
      seen[note.id] !== note.dueOn,
  );
}

/**
 * The reminders shown, with those of `shown` added. Notes that are no longer among `existing` are
 * forgotten, so the list does not grow forever.
 */
export function rememberNoteReminders(
  seen: SeenReminders,
  shown: readonly ProjectNote[],
  existing: readonly ProjectNote[],
): SeenReminders {
  const ids = new Set(existing.map((note) => note.id));
  const kept: Record<string, string> = Object.fromEntries(
    Object.entries(seen).filter(([id]) => ids.has(id)),
  );
  for (const note of shown) if (note.dueOn) kept[note.id] = note.dueOn;
  return kept;
}

type Data = Record<string, unknown>;

function isData(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > NOTE_LIST_MAX) return null;
  const items: unknown[] = value;
  return items.every(
    (item): item is string =>
      typeof item === 'string' && item.trim() !== '' && item.length <= NOTE_LIST_ITEM_MAX,
  )
    ? items
    : null;
}

/**
 * A note from its data, as a backup or a document holds it; null when the data does not describe
 * one. The author is read when present, in the shape of the free notes' one.
 */
export function parseProjectNote(id: string, value: unknown): ProjectNote | null {
  if (!isData(value)) return null;
  const { projectId, text, createdAt } = value;
  if (typeof projectId !== 'string' || projectId.trim() === '') return null;
  if (typeof text !== 'string' || text.trim() === '' || text.length > PROJECT_NOTE_TEXT_MAX)
    return null;
  if (!isIsoDateTime(createdAt)) return null;
  const note: ProjectNote = { id, projectId, text, createdAt };
  if (isData(value.author)) {
    const { id: authorId, login } = value.author;
    if (typeof authorId !== 'string' || typeof login !== 'string' || !authorId || !login)
      return null;
    note.author = { id: authorId, login } satisfies MemoAuthor;
  }
  if (value.status !== undefined) {
    if (!(PROJECT_NOTE_STATUSES as readonly unknown[]).includes(value.status)) return null;
    note.status = value.status as ProjectNoteStatus;
  }
  if (value.dueOn !== undefined) {
    if (!isIsoDate(value.dueOn)) return null;
    note.dueOn = value.dueOn;
  }
  if (value.remind !== undefined) {
    if (value.remind !== true || note.dueOn === undefined) return null;
    note.remind = true;
  }
  if (value.owners !== undefined) {
    const owners = stringList(value.owners);
    if (!owners) return null;
    if (owners.length > 0) note.owners = owners;
  }
  if (value.tags !== undefined) {
    const tags = stringList(value.tags);
    if (!tags) return null;
    if (tags.length > 0) note.tags = tags;
  }
  return note;
}
