import { addDaysIso } from '../utils/dateUtils';
import { isKnownColorId } from './colors';
import type { TaskColorId } from './colors';
import type { DailyNotes, Memo, Milestone } from './types';

// The row «Note sulla timeline» gathers everything that has a day: the notes on the timeline
// (diamonds), the note of a day of Next Releases (a flag), and the free notes of Notes whose
// reminder comes on that day (a post-it, a pile when there are several). The shape says where a
// note comes from; the color only helps.

/** The kinds of the row, in the order they take in a day and in the lanes. */
export const TIMELINE_NOTE_KINDS = ['dayNote', 'memos', 'milestone'] as const;
export type TimelineNoteKind = (typeof TIMELINE_NOTE_KINDS)[number];

/** Symbol and title, the symbol alone, or nothing. */
export type TimelineNoteShow = 'title' | 'symbol' | 'hidden';
export const TIMELINE_NOTE_SHOWS: readonly TimelineNoteShow[] = ['title', 'symbol', 'hidden'];

/** The color of each note, when it has one, or one color for all. */
export type TimelineNoteColor = 'own' | TaskColorId;

export interface TimelineNoteKindLook {
  show: TimelineNoteShow;
  color: TimelineNoteColor;
}

/** All the notes on one line, those of a day side by side, or a line for each kind. */
export type TimelineNotesLayout = 'line' | 'lanes';
export const TIMELINE_NOTES_LAYOUTS: readonly TimelineNotesLayout[] = ['line', 'lanes'];

/** How this browser draws the row: the layout, and how each kind shows. */
export interface TimelineNotesLook {
  layout: TimelineNotesLayout;
  kinds: Record<TimelineNoteKind, TimelineNoteKindLook>;
}

export const DEFAULT_TIMELINE_NOTES_LOOK: TimelineNotesLook = {
  layout: 'line',
  kinds: {
    // The notes of the days have no color of their own.
    dayNote: { show: 'symbol', color: 'amber' },
    memos: { show: 'symbol', color: 'own' },
    milestone: { show: 'title', color: 'own' },
  },
};

/** Whether a kind has a color of its own on each note: the notes of the days do not. */
export function kindHasOwnColors(kind: TimelineNoteKind): boolean {
  return kind !== 'dayNote';
}

type Data = Record<string, unknown>;

function isData(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseKindLook(kind: TimelineNoteKind, value: unknown): TimelineNoteKindLook {
  const fallback = DEFAULT_TIMELINE_NOTES_LOOK.kinds[kind];
  if (!isData(value)) return fallback;
  const show = TIMELINE_NOTE_SHOWS.includes(value.show as TimelineNoteShow)
    ? (value.show as TimelineNoteShow)
    : fallback.show;
  const known =
    typeof value.color === 'string' &&
    ((value.color === 'own' && kindHasOwnColors(kind)) || isKnownColorId(value.color));
  return { show, color: known ? (value.color as TimelineNoteColor) : fallback.color };
}

/**
 * The look a browser saved, or a settings file holds; what it does not know takes the default,
 * so that a choice added later does not throw the others away. Null when it is not a look.
 */
export function parseTimelineNotesLook(value: unknown): TimelineNotesLook | null {
  if (!isData(value)) return null;
  const kinds = isData(value.kinds) ? value.kinds : {};
  return {
    layout: TIMELINE_NOTES_LAYOUTS.includes(value.layout as TimelineNotesLayout)
      ? (value.layout as TimelineNotesLayout)
      : DEFAULT_TIMELINE_NOTES_LOOK.layout,
    kinds: {
      dayNote: parseKindLook('dayNote', kinds.dayNote),
      memos: parseKindLook('memos', kinds.memos),
      milestone: parseKindLook('milestone', kinds.milestone),
    },
  };
}

/** The kinds the row shows, in their order. */
export function shownKinds(look: TimelineNotesLook): TimelineNoteKind[] {
  return TIMELINE_NOTE_KINDS.filter((kind) => look.kinds[kind].show !== 'hidden');
}

/** One mark of the row: the note of a day, a note on the timeline, or the free notes of a day. */
export type TimelineNoteMark =
  | { kind: 'dayNote'; date: string; text: string }
  | { kind: 'milestone'; date: string; milestone: Milestone }
  | { kind: 'memos'; date: string; memos: Memo[] };

interface MarkSources {
  dailyNotes: DailyNotes;
  /** The notes on the timeline of no project: those of a project are on its row. */
  milestones: readonly Milestone[];
  /** The free notes, in the order of Notes; those with a reminder have a day. */
  memos: readonly Memo[];
}

/**
 * The marks of the kinds shown, by day and, within a day, in the order of the kinds; the free
 * notes of a day in one mark, in their order in Notes. `from` and `to`, when given, keep only the
 * days between them.
 */
export function timelineNoteMarks(
  { dailyNotes, milestones, memos }: MarkSources,
  look: TimelineNotesLook,
  from?: string,
  to?: string,
): TimelineNoteMark[] {
  const kinds = new Set(shownKinds(look));
  const inside = (date: string) => (!from || date >= from) && (!to || date <= to);
  const marks: TimelineNoteMark[] = [];
  if (kinds.has('dayNote')) {
    for (const [date, text] of Object.entries(dailyNotes)) {
      if (inside(date)) marks.push({ kind: 'dayNote', date, text });
    }
  }
  if (kinds.has('memos')) {
    const byDay = new Map<string, Memo[]>();
    for (const memo of memos) {
      if (!memo.remindOn || !inside(memo.remindOn)) continue;
      byDay.set(memo.remindOn, [...(byDay.get(memo.remindOn) ?? []), memo]);
    }
    for (const [date, list] of byDay) marks.push({ kind: 'memos', date, memos: list });
  }
  if (kinds.has('milestone')) {
    for (const milestone of milestones) {
      if (inside(milestone.date))
        marks.push({ kind: 'milestone', date: milestone.date, milestone });
    }
  }
  const order = (mark: TimelineNoteMark) => TIMELINE_NOTE_KINDS.indexOf(mark.kind);
  return marks.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      order(a) - order(b) ||
      (a.kind === 'milestone' && b.kind === 'milestone'
        ? a.milestone.title.localeCompare(b.milestone.title) ||
          a.milestone.id.localeCompare(b.milestone.id)
        : 0),
  );
}

/** A mark with its place: the lane, and its slot among the marks of its day on that lane. */
export interface PlacedMark {
  mark: TimelineNoteMark;
  lane: number;
  slot: number;
  /** How many marks share the day on that lane: they sit side by side, around its middle. */
  slots: number;
}

/**
 * Where the marks go: on one line, the marks of a day side by side; with a lane for each kind,
 * every kind on its own line, and side by side only the notes on the timeline of the same day.
 */
export function placeMarks(
  marks: readonly TimelineNoteMark[],
  look: TimelineNotesLook,
): PlacedMark[] {
  const lanes = shownKinds(look);
  const laneOf = (mark: TimelineNoteMark) =>
    look.layout === 'lanes' ? Math.max(0, lanes.indexOf(mark.kind)) : 0;
  const groups = new Map<string, TimelineNoteMark[]>();
  for (const mark of marks) {
    const key = `${mark.date}|${laneOf(mark)}`;
    groups.set(key, [...(groups.get(key) ?? []), mark]);
  }
  return marks.map((mark) => {
    const group = groups.get(`${mark.date}|${laneOf(mark)}`) ?? [mark];
    return { mark, lane: laneOf(mark), slot: group.indexOf(mark), slots: group.length };
  });
}

/** How many lines the row has. */
export function laneCount(look: TimelineNotesLook): number {
  return look.layout === 'lanes' ? Math.max(1, shownKinds(look).length) : 1;
}

/** One column of the agenda: the free notes whose reminder is past, or a day with its notes. */
export type AgendaDay =
  | { kind: 'overdue'; marks: TimelineNoteMark[] }
  | { kind: 'day'; date: string; marks: TimelineNoteMark[] };

/** How far ahead the agenda looks. */
export const AGENDA_DAYS = 60;

/**
 * The agenda over Notes: first the free notes whose reminder is already past, still waiting,
 * then each day from today with its notes, for `AGENDA_DAYS` days.
 */
export function agendaDays(
  sources: MarkSources,
  look: TimelineNotesLook,
  today: string,
): AgendaDay[] {
  const last = addDaysIso(today, AGENDA_DAYS - 1);
  const days: AgendaDay[] = [];
  const overdue = timelineNoteMarks(sources, look, undefined, addDaysIso(today, -1)).filter(
    (mark) => mark.kind === 'memos',
  );
  if (overdue.length > 0) days.push({ kind: 'overdue', marks: overdue });
  for (const mark of timelineNoteMarks(sources, look, today, last)) {
    const previous = days.at(-1);
    if (previous?.kind === 'day' && previous.date === mark.date) previous.marks.push(mark);
    else days.push({ kind: 'day', date: mark.date, marks: [mark] });
  }
  return days;
}

/** How many notes a mark stands for. */
export function markCount(mark: TimelineNoteMark): number {
  return mark.kind === 'memos' ? mark.memos.length : 1;
}
