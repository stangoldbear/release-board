import { ITALIAN_MONTHS, parseISODate } from '../utils/dateUtils';
import type { TaskColorId } from './colors';
import type { Memo } from './types';

/** Longest title and text of a free note; the security rules enforce the same. */
export const MEMO_TITLE_MAX = 200;
export const MEMO_BODY_MAX = 2000;

/** What a new note holds; its place is at the end of the strip, its author whoever writes it. */
export type MemoContent = Omit<Memo, 'id' | 'position' | 'author'>;

/** Fields of a note to change; null removes an optional one. Moves go through `memoMoves`. */
export interface MemoChanges {
  title?: string;
  body?: string | null;
  colorId?: TaskColorId | null;
  remindOn?: string | null;
  private?: true | null;
}

/** Whose notes the strip shows in a shared instance: the user's own, or all those they can see. */
export type MemoScope = 'mine' | 'all';
export const MEMO_SCOPES: readonly MemoScope[] = ['mine', 'all'];

/** The notes of a scope: with 'mine', those written by `authorId`, private ones included. */
export function memosInScope(memos: readonly Memo[], scope: MemoScope, authorId: string): Memo[] {
  return scope === 'all' ? [...memos] : memos.filter((memo) => memo.author?.id === authorId);
}

/** The notes in the order of the strip; the id breaks ties, so every copy agrees. */
export function sortMemos(memos: readonly Memo[]): Memo[] {
  return [...memos].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

/** The position of a note added after all the others. */
export function endPosition(memos: readonly Memo[]): number {
  return memos.reduce((last, memo) => Math.max(last, memo.position), 0) + 1;
}

/** The note with the changes applied; null removes an optional field. */
export function applyMemoChanges(memo: Memo, changes: MemoChanges): Memo {
  const next: Record<string, unknown> = { ...memo };
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete next[key];
    else if (value !== undefined) next[key] = value;
  }
  return next as unknown as Memo;
}

/**
 * The fields that differ between a note and what the editor saves: blank text, no color and no
 * reminder remove the field.
 */
export function diffMemo(before: Memo, after: MemoContent): MemoChanges {
  const changes: MemoChanges = {};
  const title = after.title.trim();
  if (title !== before.title) changes.title = title;
  const body = after.body?.trim() || undefined;
  if (body !== before.body) changes.body = body ?? null;
  if (after.colorId !== before.colorId) changes.colorId = after.colorId ?? null;
  const remindOn = after.remindOn || undefined;
  if (remindOn !== before.remindOn) changes.remindOn = remindOn ?? null;
  if (Boolean(after.private) !== Boolean(before.private)) changes.private = after.private ?? null;
  return changes;
}

/**
 * The note that follows `memoId` once it is at `index` of `strip`, counting the other notes; null
 * when it ends up last. Moves name a neighbour rather than an index, so that they mean the same
 * on any part of the strip: the notes of one author, or all of them.
 */
export function followerAt(strip: readonly Memo[], memoId: string, index: number): string | null {
  const others = strip.filter((memo) => memo.id !== memoId);
  return others[Math.max(index, 0)]?.id ?? null;
}

/**
 * The new positions that put a note right before `beforeId`, or after all the notes when it is
 * null. Usually the moved note alone takes the middle between its new neighbours; when they are
 * too close for a number between them, every note is numbered again, and the moved one may keep
 * its number. Empty when nothing moves or a note is missing.
 */
export function memoMoves(
  memos: readonly Memo[],
  memoId: string,
  beforeId: string | null,
): Map<string, number> {
  const ordered = sortMemos(memos);
  const from = ordered.findIndex((memo) => memo.id === memoId);
  const moved = ordered[from];
  if (!moved || beforeId === memoId) return new Map();
  const others = ordered.filter((memo) => memo.id !== memoId);
  const to = beforeId === null ? others.length : others.findIndex((memo) => memo.id === beforeId);
  if (to < 0 || to === from) return new Map();

  const before = others[to - 1];
  const after = others[to];
  const position =
    before && after
      ? (before.position + after.position) / 2
      : before
        ? before.position + 1
        : after
          ? after.position - 1
          : moved.position;
  const between = (!before || position > before.position) && (!after || position < after.position);
  if (between) return new Map([[memoId, position]]);

  const renumbered = [...others.slice(0, to), moved, ...others.slice(to)];
  return new Map(
    numberStrip(renumbered).filter(
      ([id, position]) => ordered.find((memo) => memo.id === id)?.position !== position,
    ),
  );
}

/**
 * New positions for a whole strip, in its order. Shared notes take 1, 2, 3…, so that the other
 * members see no gap where a private note sits; private notes share out the room between their
 * shared neighbours.
 */
function numberStrip(strip: readonly Memo[]): [string, number][] {
  const numbers: [string, number][] = [];
  let shared = 0;
  let run: Memo[] = [];
  const placeRun = () => {
    run.forEach((memo, at) => numbers.push([memo.id, shared + (at + 1) / (run.length + 1)]));
    run = [];
  };
  for (const memo of strip) {
    if (memo.private) {
      run.push(memo);
    } else {
      placeRun();
      shared += 1;
      numbers.push([memo.id, shared]);
    }
  }
  placeRun();
  return numbers;
}

/** Reminders already shown by a browser: note id → the reminder day it was shown for. */
export type SeenReminders = Readonly<Record<string, string>>;

/** The reminders shown, as a browser saved them; null when the saved value is not one. */
export function readSeenReminders(value: unknown): SeenReminders | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

/**
 * The reminders shown, with those of `shown` added: their notes do not remind again of the same
 * day. Notes that are no longer among `existing` are forgotten, so the list does not grow forever.
 */
export function rememberReminders(
  seen: SeenReminders,
  shown: readonly Memo[],
  existing: readonly Memo[],
): SeenReminders {
  const ids = new Set(existing.map((memo) => memo.id));
  const kept: Record<string, string> = Object.fromEntries(
    Object.entries(seen).filter(([id]) => ids.has(id)),
  );
  for (const memo of shown) if (memo.remindOn) kept[memo.id] = memo.remindOn;
  return kept;
}

/**
 * The notes whose reminder day has come, today or before, and that this browser has not shown
 * yet: `seen` keeps the reminder day each note was shown for, so a new day shows it again.
 */
export function dueMemos(memos: readonly Memo[], today: string, seen: SeenReminders): Memo[] {
  return sortMemos(memos).filter(
    (memo) =>
      memo.remindOn !== undefined && memo.remindOn <= today && seen[memo.id] !== memo.remindOn,
  );
}

/**
 * Where a title divides as "lead: rest": the first colon followed by a space, so that times
 * ("14:00") and links ("https://") stay whole. -1 when there is none.
 */
function leadEnd(title: string): number {
  return title.search(/:\s/);
}

/**
 * A title as "lead: rest", as in "App mobile: rilascio a gennaio": the strip shows the lead in
 * bold. Null lead when there is no such colon with text on both sides.
 */
export function splitMemoTitle(title: string): { lead: string | null; rest: string } {
  const colon = leadEnd(title);
  const lead = title.slice(0, colon + 1);
  const rest = title.slice(colon + 1).trim();
  return colon > 0 && lead.trim().length > 1 && rest !== ''
    ? { lead, rest }
    : { lead: null, rest: title };
}

const FIXED_MILESTONES = ['Code Freeze', 'Rollout 100%'];

/** Milestones to complete a title with: the go-live of this month and the next four, and more. */
export function memoSuggestions(today: string): string[] {
  const month = parseISODate(today).getMonth();
  const golives = Array.from(
    { length: 5 },
    (_, step) => `Golive ${ITALIAN_MONTHS[(month + step) % 12] ?? ''}`,
  );
  return [...golives, ...FIXED_MILESTONES];
}

/** Whether a piece of a title is a milestone the dialog suggests, in any month. */
function isMilestone(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return (
    FIXED_MILESTONES.some((milestone) => milestone.toLowerCase() === lower) ||
    ITALIAN_MONTHS.some((month) => `golive ${month.toLowerCase()}` === lower)
  );
}

/** What separates the pieces after the colon: "stima entro il 20 · Code Freeze". */
const PIECES = ' · ';

/**
 * The title with a milestone after its colon. Nothing written is lost: the milestone takes the
 * place of a previous one, otherwise it goes after the text. "App mobile" gives "App mobile:
 * Golive Gennaio"; then "Code Freeze" gives "App mobile: Code Freeze"; "App: stima" gives "App:
 * stima · Code Freeze". An empty title becomes the milestone.
 */
export function withMilestone(title: string, milestone: string): string {
  const trimmed = title.trim();
  // "App:" with nothing after it has a lead too.
  const colon = trimmed.endsWith(':') ? trimmed.length - 1 : leadEnd(trimmed);
  const lead = (colon >= 0 ? trimmed.slice(0, colon) : trimmed).trim();
  const rest = colon >= 0 ? trimmed.slice(colon + 1).trim() : '';
  const pieces = rest ? rest.split(PIECES) : [];
  if (pieces.length > 0 && isMilestone(pieces.at(-1) ?? '')) pieces.pop();
  const after = [...pieces, milestone].join(PIECES);
  return (lead ? `${lead}: ${after}` : after).slice(0, MEMO_TITLE_MAX);
}
