import { memo, useContext } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { ChevronsDownUp, ChevronsUpDown, StickyNote } from 'lucide-react';
import { isNoteShown } from '../../domain/filters';
import type { DailyNotes } from '../../domain/types';
import {
  CURRENT_RESULT,
  Highlight,
  SearchHighlightContext,
  resultKey,
} from '../../shared/ui/Highlight';
import { todayIso } from '../../utils/dateUtils';
import {
  LABEL_CELL,
  NARROW_DAY_WIDTH,
  clampLines,
  columnEdge,
  columnFill,
  stackingOrder,
} from './timelineLayout';
import type { Column } from './timelineLayout';
import type { NoteDrag } from './useNoteDrag';
import { useFormatDate } from '../..//shared/dateFormat';

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
  /** The text on one line, out of its day when longer, rather than wrapped or cut. */
  overflowText: boolean;
  /**
   * Every note shows its whole text, wrapped in a few lines over the following days when its own
   * is narrower, and as a list in a week. The row grows to hold the longest.
   */
  expanded: boolean;
  onToggleExpanded: () => void;
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
  overflowText,
  expanded,
  onToggleExpanded,
  drag,
  describedBy,
  onStartDrag,
  onOpen,
  onKeyDown,
  onShowDays,
}: NotesRowProps) {
  const formatDate = useFormatDate();
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
        <span className="flex flex-wrap items-center justify-between gap-x-2 text-xs text-fg-muted">
          {weekColumns ? 'Per settimana' : 'Per giorno'}
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            aria-label={expanded ? 'Riduci le note dei giorni' : 'Espandi le note dei giorni'}
            className="inline-flex cursor-pointer items-center gap-0.5 rounded-sm font-semibold text-link hover:underline"
          >
            {expanded ? (
              <ChevronsDownUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            {expanded ? 'Riduci' : 'Espandi'}
          </button>
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
              style={
                {
                  width: column.width,
                  minHeight: weekHeight,
                  // Expanded, the notes run over the following weeks, under the nearer ones.
                  '--z': expanded && notes.length > 0 ? stackingOrder(today, column.start) : 0,
                } as CSSProperties
              }
              title={
                notes.length > 0
                  ? notes.map(([date, text]) => `${formatDate(date)}: ${text}`).join('\n')
                  : `Mostra i giorni dal ${formatDate(column.start)}`
              }
              className={`relative z-(--z) shrink-0 cursor-pointer p-1 text-xs hover:z-[600] hover:bg-warning-soft focus-visible:z-[600] ${columnEdge(column)} ${column.past ? 'bg-past' : ''} ${expanded ? 'flex flex-col items-start justify-start gap-1 text-left' : ''}`}
            >
              {notes.length > 0 &&
                (expanded ? (
                  notes.map(([date, text]) => (
                    <span
                      key={date}
                      className="w-max max-w-56 min-w-full rounded-sm border border-warning bg-warning-soft px-1 break-words hyphens-auto"
                    >
                      <span className="font-semibold">{formatDate(date)}</span>{' '}
                      <Highlight text={text} />
                    </span>
                  ))
                ) : (
                  <span className="rounded-sm bg-warning-soft px-1 font-semibold">
                    {notes.length} {notes.length === 1 ? 'nota' : 'note'}
                  </span>
                ))}
            </button>
          );
        }
        const date = column.start;
        const narrow = column.width < NARROW_DAY_WIDTH;
        const saved = dailyNotes[date] ?? '';
        // A note the search does not find keeps its day taken, without showing its text.
        const hidden = saved !== '' && !isNoteShown(matches, date);
        const text = hidden ? '' : saved;
        const isSource = drag?.from === date;
        const isTarget = drag !== null && drag.to === date && drag.to !== drag.from;
        // Where the note would land: its text, faded, in the free day under the pointer.
        const preview = isTarget && drag.allowed ? dailyNotes[drag.from] : undefined;
        const isCurrent = current === resultKey('note', date);
        // Expanded, the whole text shows, wrapped in a few lines that run over the following
        // days when its own is narrower. Otherwise one line out of the day, or as many lines as
        // fit in it.
        const oneLine = overflowText && !expanded;
        const spills = oneLine || expanded;
        // A text that runs out of its day is drawn over the notes further from today; the note
        // under the pointer or the focus comes up.
        const stacking = isCurrent ? 500 : spills && text ? stackingOrder(today, date) : 0;
        // In a narrow day the note is an icon, unless its text runs out of the day anyway.
        const iconOnly = narrow && !spills;
        const chipClass = `rounded-xs border border-warning bg-warning-soft p-1 text-xs in-data-compact:px-1 in-data-compact:py-0.5 ${
          oneLine
            ? 'w-max max-w-none min-w-full shrink-0 whitespace-nowrap'
            : expanded
              ? 'w-max max-w-56 min-w-full shrink-0 break-words hyphens-auto'
              : 'w-full break-words hyphens-auto'
        } ${iconOnly ? 'flex items-center justify-center' : ''}`;
        const chipStyle = iconOnly || spills ? undefined : clampLines(lines);
        const chipContent = (words: string) =>
          iconOnly ? (
            <StickyNote className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
          ) : (
            <Highlight text={words} />
          );
        return (
          <button
            key={date}
            id={noteCellId(date)}
            type="button"
            onPointerDown={text ? (event) => onStartDrag(event, date) : undefined}
            onClick={() => onOpen(date)}
            onKeyDown={text ? (event) => onKeyDown(event, date) : undefined}
            tabIndex={text || date === entry ? 0 : -1}
            style={{ width: column.width, minHeight: dayHeight, '--z': stacking } as CSSProperties}
            aria-label={
              text
                ? `Nota del ${formatDate(date)}: ${text}`
                : hidden
                  ? `Nota del ${formatDate(date)}, nascosta dalla ricerca`
                  : `Aggiungi una nota per il ${formatDate(date)}`
            }
            aria-describedby={text ? describedBy : undefined}
            title={text || (hidden ? 'Nota nascosta dalla ricerca' : undefined)}
            className={`group/note relative z-(--z) flex shrink-0 p-1 text-left in-data-compact:p-0.5 hover:z-[600] focus-visible:z-[600] ${columnEdge(column)} ${
              text ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
            } ${columnFill(column)} ${
              isTarget ? `ring-2 ring-inset ${drag.allowed ? 'ring-link' : 'ring-danger'}` : ''
            } ${isCurrent ? CURRENT_RESULT : ''}`}
          >
            {text ? (
              <span
                style={chipStyle}
                className={`${chipClass} group-hover/note:shadow-sm ${isSource ? 'opacity-40' : ''}`}
              >
                {chipContent(text)}
              </span>
            ) : hidden ? null : preview ? (
              <span style={chipStyle} className={`${chipClass} border-dashed opacity-80`}>
                {chipContent(preview)}
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
