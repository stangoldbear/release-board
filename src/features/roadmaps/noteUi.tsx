import { BellRing, CalendarClock } from 'lucide-react';
import { isNoteOverdue } from '../../domain/projectNotes';
import type { ProjectNote } from '../../domain/types';
import { formatDateToIT } from '../../utils/dateUtils';

/** When a note is due, in words: "scade oggi", "entro il 20/10/2026", "scaduta il 20/10/2026". */
export function dueText(note: Pick<ProjectNote, 'dueOn' | 'status'>, today: string): string {
  if (!note.dueOn) return '';
  if (note.status === 'done') return `entro il ${formatDateToIT(note.dueOn)}`;
  if (note.dueOn === today) return 'scade oggi';
  return isNoteOverdue(note, today)
    ? `scaduta il ${formatDateToIT(note.dueOn)}`
    : `entro il ${formatDateToIT(note.dueOn)}`;
}

/**
 * The deadline of a note: its words, a clock, and a bell when the note asks to be reminded of.
 * Past and not done, it takes the warning colors and the words say "scaduta": not the color alone.
 */
export function DueBadge({
  note,
  today,
}: {
  note: Pick<ProjectNote, 'dueOn' | 'status' | 'remind'>;
  today: string;
}) {
  if (!note.dueOn) return null;
  const overdue = isNoteOverdue(note, today) || (note.dueOn === today && note.status !== 'done');
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-sm px-1 text-xs font-semibold ${
        overdue ? 'border border-warning bg-warning-soft text-warning' : ''
      }`}
    >
      <CalendarClock className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="first-letter:uppercase">{dueText(note, today)}</span>
      {note.remind && (
        <>
          <BellRing className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="sr-only">, con avviso</span>
        </>
      )}
    </span>
  );
}
