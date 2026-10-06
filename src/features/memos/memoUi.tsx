import { Bell, BellRing, Lock } from 'lucide-react';
import type { CSSProperties } from 'react';
import { splitMemoTitle } from '../../domain/memos';
import { Highlight } from '../../shared/ui/Highlight';
import type { Memo } from '../../domain/types';
import { taskColorStyle } from '../../themes';
import { formatDateToIT } from '../../utils/dateUtils';
import { dayName } from '../calendar/timelineLayout';

/** The colors of a note: those of a task color, or the plain surface with its border. */
export function memoSurface(memo: Pick<Memo, 'colorId'>): {
  style?: CSSProperties;
  className: string;
} {
  return memo.colorId
    ? { style: taskColorStyle(memo.colorId), className: '' }
    : { className: 'border-line-strong bg-surface text-fg' };
}

/** When the reminder of a note comes, in words, for its label and for screen readers. */
export function reminderText(remindOn: string, today: string): string {
  if (remindOn === today) return 'promemoria oggi';
  return remindOn < today
    ? `promemoria dal ${formatDateToIT(remindOn)}`
    : `promemoria il ${formatDateToIT(remindOn)}`;
}

/**
 * The day of a reminder, with a bell that rings once the day has come: the shape and the words
 * change, not only the color ("oggi", "dal lun 5 ott" once past).
 */
export function ReminderBadge({ remindOn, today }: { remindOn: string; today: string }) {
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
      <span className="sr-only">{reminderText(remindOn, today)}</span>
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
