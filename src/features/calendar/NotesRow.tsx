import { memo } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { StickyNote } from 'lucide-react';
import type { DailyNotes } from '../../domain/types';
import { formatDateToIT } from '../../utils/dateUtils';
import { LABEL_CELL, LABEL_WIDTH, columnEdge } from './timelineLayout';
import type { Column } from './timelineLayout';
import type { NoteDrag } from './useNoteDrag';

interface NotesRowProps {
  columns: Column[];
  dailyNotes: DailyNotes;
  weekColumns: boolean;
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
  weekColumns,
  drag,
  describedBy,
  onStartDrag,
  onOpen,
  onKeyDown,
  onShowDays,
}: NotesRowProps) {
  return (
    <div className="flex border-t-2 border-warning">
      <div
        className={`${LABEL_CELL} flex flex-col justify-center bg-warning-soft`}
        style={{ width: LABEL_WIDTH }}
      >
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
            .sort(([a], [b]) => a.localeCompare(b));
          return (
            <button
              key={column.start}
              type="button"
              onClick={() => onShowDays(column.start)}
              style={{ width: column.width }}
              title={
                notes.length > 0
                  ? notes.map(([date, text]) => `${formatDateToIT(date)}: ${text}`).join('\n')
                  : `Mostra i giorni dal ${formatDateToIT(column.start)}`
              }
              className={`min-h-14 shrink-0 cursor-pointer p-1 text-xs hover:bg-warning-soft ${columnEdge(column)} ${column.past ? 'bg-past' : ''}`}
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
        const text = dailyNotes[date] ?? '';
        const isSource = drag?.from === date;
        const isTarget = drag !== null && drag.to === date && drag.to !== drag.from;
        // Where the note would land: its text, faded, in the free day under the pointer.
        const preview = isTarget && drag.allowed ? dailyNotes[drag.from] : undefined;
        return (
          <button
            key={date}
            id={`note-cell-${date}`}
            type="button"
            onPointerDown={text ? (event) => onStartDrag(event, date) : undefined}
            onClick={() => onOpen(date)}
            onKeyDown={text ? (event) => onKeyDown(event, date) : undefined}
            style={{ width: column.width }}
            aria-label={
              text
                ? `Nota del ${formatDateToIT(date)}: ${text}`
                : `Aggiungi una nota per il ${formatDateToIT(date)}`
            }
            aria-describedby={text ? describedBy : undefined}
            title={text || undefined}
            className={`group/note flex min-h-16 shrink-0 p-1 text-left ${columnEdge(column)} ${
              text ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
            } ${column.past ? 'bg-past' : column.red ? 'bg-holiday' : ''} ${
              isTarget ? `ring-2 ring-inset ${drag.allowed ? 'ring-link' : 'ring-danger'}` : ''
            }`}
          >
            {text ? (
              <span
                className={`line-clamp-3 w-full rounded-xs border border-warning bg-warning-soft p-1 text-xs leading-4 break-words group-hover/note:shadow-sm ${
                  isSource ? 'opacity-40' : ''
                }`}
              >
                {text}
              </span>
            ) : preview ? (
              <span className="line-clamp-3 w-full rounded-xs border border-dashed border-warning bg-warning-soft p-1 text-xs leading-4 break-words opacity-80">
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
