import { memo, useContext } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { StickyNote } from 'lucide-react';
import { isNoteShown } from '../../domain/filters';
import type { DailyNotes } from '../../domain/types';
import {
  CURRENT_RESULT,
  Highlight,
  SearchHighlightContext,
  resultKey,
} from '../../shared/ui/Highlight';
import { formatDateToIT, todayIso } from '../../utils/dateUtils';
import { LABEL_CELL, clampLines, columnEdge } from './timelineLayout';
import type { Column } from './timelineLayout';
import type { NoteDrag } from './useNoteDrag';

/** The cell of the note of a day, to give it the focus or bring it into view. */
export function noteCellId(date: string): string {
  return `note-cell-${date}`;
}

interface NotesRowProps {
  columns: Column[];
  dailyNotes: DailyNotes;
  /** The days whose note the search finds; null while nothing is searched. */
  matches: Set<string> | null;
  weekColumns: boolean;
  /** Least height of a day and of a week, and the lines of a note a day shows. */
  dayHeight: number;
  weekHeight: number;
  lines: number;
  /** The note being dragged, once the pointer has moved. */
  drag: NoteDrag | null;
  /** Id of the text that explains the keyboard commands of a note. */
  describedBy: string;
  onStartDrag: (event: PointerEvent, date: string) => void;
  /** Opens the note of a day, or a new one. */
  onOpen: (date: string) => void;
  onKeyDown: (event: KeyboardEvent, date: string) => void;
  /** Shows the days of a week column. */
  onShowDays: (date: string) => void;
}

/** One note per day, or the count of notes in each week. */
export const NotesRow = memo(function NotesRow({
  columns,
  dailyNotes,
  matches,
  weekColumns,
  dayHeight,
  weekHeight,
  lines,
  drag,
  describedBy,
  onStartDrag,
  onOpen,
  onKeyDown,
  onShowDays,
}: NotesRowProps) {
  // The Tab key stops at the notes and at one empty day, today's: hundreds of empty days would
  // each be a stop. From there a note goes to any day, with the day field of its window.
  const today = todayIso();
  const entry = columns.some((column) => column.start === today) ? today : columns[0]?.start;
  const { current } = useContext(SearchHighlightContext);
  return (
    <div className="flex border-t-2 border-warning">
      <div className={`${LABEL_CELL} flex flex-col justify-center bg-warning-soft`}>
        <span className="flex items-center gap-1 text-xs font-bold uppercase">
          <StickyNote className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
          Note
        </span>
        <span className="text-xs text-fg-muted">
          {weekColumns ? 'Per settimana' : 'Per giorno'}
        </span>
      </div>
      {columns.map((column) => {
        if (weekColumns) {
          const notes = Object.entries(dailyNotes)
            .filter(([date]) => column.start <= date && date <= column.end)
            .filter(([date]) => isNoteShown(matches, date))
            .sort(([a], [b]) => a.localeCompare(b));
          return (
            <button
              key={column.start}
              type="button"
              onClick={() => onShowDays(column.start)}
              style={{ width: column.width, minHeight: weekHeight }}
              title={
                notes.length > 0
                  ? notes.map(([date, text]) => `${formatDateToIT(date)}: ${text}`).join('\n')
                  : `Mostra i giorni dal ${formatDateToIT(column.start)}`
              }
              className={`shrink-0 cursor-pointer p-1 text-xs hover:bg-warning-soft ${columnEdge(column)} ${column.past ? 'bg-past' : ''}`}
            >
              {notes.length > 0 && (
                <span className="rounded-sm bg-warning-soft px-1 font-semibold">
                  {notes.length} {notes.length === 1 ? 'nota' : 'note'}
                </span>
              )}
            </button>
          );
        }
        const date = column.start;
        const saved = dailyNotes[date] ?? '';
        // A note the search does not find keeps its day taken, without showing its text.
        const hidden = saved !== '' && !isNoteShown(matches, date);
        const text = hidden ? '' : saved;
        const isSource = drag?.from === date;
        const isTarget = drag !== null && drag.to === date && drag.to !== drag.from;
        // Where the note would land: its text, faded, in the free day under the pointer.
        const preview = isTarget && drag.allowed ? dailyNotes[drag.from] : undefined;
        return (
          <button
            key={date}
            id={noteCellId(date)}
            type="button"
            onPointerDown={text ? (event) => onStartDrag(event, date) : undefined}
            onClick={() => onOpen(date)}
            onKeyDown={text ? (event) => onKeyDown(event, date) : undefined}
            tabIndex={text || date === entry ? 0 : -1}
            style={{ width: column.width, minHeight: dayHeight }}
            aria-label={
              text
                ? `Nota del ${formatDateToIT(date)}: ${text}`
                : hidden
                  ? `Nota del ${formatDateToIT(date)}, nascosta dalla ricerca`
                  : `Aggiungi una nota per il ${formatDateToIT(date)}`
            }
            aria-describedby={text ? describedBy : undefined}
            title={text || (hidden ? 'Nota nascosta dalla ricerca' : undefined)}
            className={`group/note flex shrink-0 p-1 text-left in-data-compact:p-0.5 ${columnEdge(column)} ${
              text ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
            } ${column.past ? 'bg-past' : column.red ? 'bg-holiday' : ''} ${
              isTarget ? `ring-2 ring-inset ${drag.allowed ? 'ring-link' : 'ring-danger'}` : ''
            } ${current === resultKey('note', date) ? `relative z-10 ${CURRENT_RESULT}` : ''}`}
          >
            {text ? (
              <span
                style={clampLines(lines)}
                className={`w-full rounded-xs border border-warning bg-warning-soft p-1 text-xs break-words hyphens-auto group-hover/note:shadow-sm in-data-compact:px-1 in-data-compact:py-0.5 ${
                  isSource ? 'opacity-40' : ''
                }`}
              >
                <Highlight text={text} />
              </span>
            ) : hidden ? null : preview ? (
              <span
                style={clampLines(lines)}
                className="w-full rounded-xs border border-dashed border-warning bg-warning-soft p-1 text-xs break-words hyphens-auto opacity-80 in-data-compact:px-1 in-data-compact:py-0.5"
              >
                {preview}
              </span>
            ) : (
              // The plus is drawn by CSS: one icon element per empty day would weigh on long timelines.
              <span className="flex w-full items-center justify-center rounded-xs border border-dashed border-line text-base leading-none text-fg-muted opacity-60 after:content-['+'] group-hover/note:border-warning group-hover/note:opacity-100" />
            )}
          </button>
        );
      })}
    </div>
  );
});
