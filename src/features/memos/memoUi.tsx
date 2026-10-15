import { Bell, BellRing, Lock } from 'lucide-react';
import type { CSSProperties } from 'react';
import { splitMemoTitle } from '../../domain/memos';
import { Highlight } from '../../shared/ui/Highlight';
import type { TaskColorId } from '../../domain/colors';
import type { NoteShape, NotesBoard } from '../../domain/notesLook';
import type { Memo } from '../../domain/types';
import { taskColorStyle } from '../../themes';
import { formatDate } from '../../utils/dateUtils';
import type { DateFormat } from '../../utils/dateUtils';
import { dayName } from '../calendar/timelineLayout';
import { useDateFormat } from '../..//shared/dateFormat';

/**
 * The colors of a note: those of a task color, or, without one, those of `paperColor` (the yellow
 * of the post-its on the board of Notes) or the plain surface with its border.
 */
export function memoSurface(
  memo: Pick<Memo, 'colorId'>,
  paperColor?: TaskColorId,
): {
  style?: CSSProperties;
  className: string;
} {
  const colorId = memo.colorId ?? paperColor;
  return colorId
    ? { style: taskColorStyle(colorId), className: '' }
    : { className: 'border-line-strong bg-surface text-fg' };
}

/**
 * How a note is drawn in each shape: a post-it with sharp corners, a shadow and a folded corner,
 * tilted a little, one way or the other; a card with round corners; or plain, on the surface of
 * the page with a band of its color on the left (`plainEdge`).
 */
export function noteShapeClass(shape: NoteShape, index: number): string {
  if (shape === 'card') return 'rounded-xl shadow-xs';
  if (shape === 'plain') return 'rounded-md border-l-4';
  const tilt = ['rotate-[-0.6deg]', 'rotate-[0.5deg]', ''][index % 3] ?? '';
  return `relative rounded-[3px] shadow-md ${tilt} after:pointer-events-none after:absolute after:right-0 after:bottom-0 after:size-3.5 after:bg-[linear-gradient(135deg,transparent_50%,color-mix(in_srgb,currentColor_22%,transparent)_50%)]`;
}

/** The band of a plain note: the strong tone of its color, or the strong line of the page. */
export function plainEdge(memo: Pick<Memo, 'colorId'>, paperColor?: TaskColorId): CSSProperties {
  const colorId = memo.colorId ?? paperColor;
  return {
    borderColor: 'var(--color-line)',
    borderLeftColor: colorId ? `var(--rb-task-${colorId}-border)` : 'var(--color-line-strong)',
  };
}

/**
 * What is behind the notes of Notes: cork, the muted surface, a grid of dots, or slate. No text sits
 * right on it: titles, names and messages of the board have the surface of the page behind them,
 * so that they keep their contrast whatever the board and the theme.
 */
export function boardStyle(board: NotesBoard): { style?: CSSProperties; className: string } {
  const dots = (color: string, step: number): CSSProperties => ({
    backgroundImage: `radial-gradient(color-mix(in srgb, ${color} 45%, transparent) 1px, transparent 1.5px)`,
    backgroundSize: `${step}px ${step}px`,
  });
  switch (board) {
    case 'cork':
      // The strong brown over the page, a third of it: tan in light themes, dark brown in dark ones.
      return {
        style: {
          backgroundColor:
            'color-mix(in oklab, var(--rb-task-brown-border) 32%, var(--color-surface))',
          ...dots('var(--rb-task-brown-border)', 9),
        },
        className: '',
      };
    case 'slate':
      return { style: { backgroundColor: 'var(--rb-task-slate-bg)' }, className: '' };
    case 'dots':
      return { style: dots('var(--color-line-strong)', 16), className: 'bg-surface' };
    case 'neutral':
      return { className: 'bg-surface-muted' };
  }
}

/** When the reminder of a note comes, in words, for its label and for screen readers. */
export function reminderText(remindOn: string, today: string, dateFormat: DateFormat): string {
  if (remindOn === today) return 'promemoria oggi';
  return remindOn < today
    ? `promemoria dal ${formatDate(remindOn, dateFormat)}`
    : `promemoria il ${formatDate(remindOn, dateFormat)}`;
}

/**
 * The day of a reminder, with a bell that rings once the day has come: the shape and the words
 * change, not only the color ("oggi", "dal lun 5 ott" once past).
 */
export function ReminderBadge({ remindOn, today }: { remindOn: string; today: string }) {
  const dateFormat = useDateFormat();
  const due = remindOn <= today;
  const Icon = due ? BellRing : Bell;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-sm px-1 text-xs font-semibold ${
        due ? 'border border-warning bg-warning-soft text-warning' : ''
      }`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span aria-hidden="true">
        {remindOn === today ? 'oggi' : due ? `dal ${dayName(remindOn)}` : dayName(remindOn)}
      </span>
      <span className="sr-only">{reminderText(remindOn, today, dateFormat)}</span>
    </span>
  );
}

/** A dot in the strong tone of a note's color, the one of its border; none without a color. */
export function MemoDot({ memo }: { memo: Pick<Memo, 'colorId'> }) {
  if (!memo.colorId) return null;
  return (
    <span
      aria-hidden="true"
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: taskColorStyle(memo.colorId).borderColor }}
    />
  );
}

/** The title, with what comes before its colon in bold: "**App mobile:** rilascio a gennaio". */
export function MemoTitle({ title }: { title: string }) {
  const { lead, rest } = splitMemoTitle(title);
  if (!lead) return <Highlight text={title} />;
  return (
    <>
      <strong className="font-bold">
        <Highlight text={lead} />
      </strong>{' '}
      <Highlight text={rest} />
    </>
  );
}

/**
 * Who wrote a note, in full, on a line of its own under the title and much smaller: the name is
 * also in the label of the element that shows it.
 */
export function MemoAuthorLine({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="block truncate text-[0.8333em] leading-tight">
      <Highlight text={name} />
    </span>
  );
}

/**
 * The padlock of a private note, first in the note, in the colors of the text turned around, so
 * that it stands out on any note; its name goes in the label of the element that shows it.
 */
export function PrivateMark() {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-sm bg-fg p-0.5 text-canvas">
      <Lock className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}

/** Words for screen readers about whose a note is: "nota privata", or "di Mario Rossi". */
export function memoOwnership(
  memo: Memo,
  meId: string | null,
  authorName: string | null,
): string | null {
  if (memo.private) return 'nota privata';
  return meId && memo.author && memo.author.id !== meId && authorName ? `di ${authorName}` : null;
}
