import { memo, useContext } from 'react';
import type { FocusEvent, KeyboardEvent, PointerEvent } from 'react';
import { ChevronsDownUp, ChevronsUpDown, StickyNote } from 'lucide-react';
import { isNoteShown } from '../../domain/filters';
import type { DailyNotes } from '../../domain/types';
import {
  CURRENT_RESULT,
  Highlight,
  SearchHighlightContext,
  resultKey,
} from '../../shared/ui/Highlight';
import { HoverCard, useHoverCard } from '../../shared/ui/HoverCard';
import { todayIso } from '../../utils/dateUtils';
import { LABEL_CELL, NARROW_DAY_WIDTH, clampLines, columnEdge, columnFill } from './timelineLayout';
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
  /** The text on one line, cut with an ellipsis, rather than on a few lines. */
  oneLine: boolean;
  /**
   * Every note shows more of its text, on more lines inside its day, and a week lists its notes.
   * The row grows to hold the tallest.
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

/** The lines a note shows when the notes are expanded, inside its day. */
export const EXPANDED_NOTE_LINES = 8;
/** The lines of each note that a week lists when the notes are expanded. */
const WEEK_NOTE_LINES = 2;

/** The notes of a day or of a week, as the card shows them whole. */
type NoteEntries = [date: string, text: string][];

/**
 * Whether the text of a note fits in its rectangle: an icon in a narrow day does not, nor a text
 * cut by its lines or its ellipsis.
 */
function fitsInItsBox(cell: HTMLElement): boolean {
  const chip = cell.firstElementChild;
  if (!(chip instanceof HTMLElement) || chip.querySelector('svg')) return false;
  return chip.scrollHeight <= chip.clientHeight + 1 && chip.scrollWidth <= chip.clientWidth + 1;
}

/**
 * One note per day, or the notes of each week. A text never goes out of its rectangle, so that the
 * notes of days in a row do not run over each other: what does not fit is cut, or is an icon in a
 * narrow day, and the whole note is in a card that opens on the mouse and the focus (only when the
 * note does not fit) and in the window that a click opens.
 */
export const NotesRow = memo(function NotesRow({
  columns,
  dailyNotes,
  matches,
  weekColumns,
  dayHeight,
  weekHeight,
  lines,
  oneLine: oneLineText,
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
  const { card, triggerProps, cardProps, close } = useHoverCard<NoteEntries>();
  // The card of a note that does not fit, on the mouse and the focus; the click opens the window.
  const cardOf = (entries: NoteEntries, always: boolean) => {
    const trigger = triggerProps(entries);
    return {
      onPointerEnter: (event: PointerEvent<HTMLElement>) => {
        if (always || !fitsInItsBox(event.currentTarget)) trigger.onPointerEnter(event);
      },
      onPointerLeave: trigger.onPointerLeave,
      onFocus: (event: FocusEvent<HTMLElement>) => {
        if (always || !fitsInItsBox(event.currentTarget)) trigger.onFocus(event);
      },
      onBlur: trigger.onBlur,
    };
  };
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
              {...(notes.length > 0 ? cardOf(notes, true) : {})}
              aria-label={
                notes.length > 0
                  ? `${notes.map(([date, text]) => `${formatDate(date)}: ${text}`).join('; ')}. Mostra i giorni`
                  : undefined
              }
              style={{ width: column.width, minHeight: weekHeight }}
              title={
                notes.length > 0 ? undefined : `Mostra i giorni dal ${formatDate(column.start)}`
              }
              className={`relative min-w-0 shrink-0 cursor-pointer overflow-hidden p-1 text-xs hover:bg-warning-soft ${columnEdge(column)} ${column.past ? 'bg-past' : ''} ${expanded ? 'flex flex-col items-stretch justify-start gap-1 text-left' : ''}`}
            >
              {notes.length > 0 &&
                (expanded ? (
                  notes.map(([date, text]) => (
                    <span
                      key={date}
                      style={clampLines(WEEK_NOTE_LINES)}
                      className="w-full rounded-sm border border-warning bg-warning-soft px-1 break-words hyphens-auto"
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
        // Inside its day, always: one line cut with an ellipsis, or a few lines, more when the
        // notes are expanded. In a narrow day the note is an icon.
        const oneLine = oneLineText && !expanded;
        const iconOnly = narrow;
        const chipClass = `w-full min-w-0 rounded-xs border border-warning bg-warning-soft p-1 text-xs in-data-compact:px-1 in-data-compact:py-0.5 ${
          oneLine ? 'truncate' : 'break-words hyphens-auto'
        } ${iconOnly ? 'flex items-center justify-center' : ''}`;
        const chipStyle =
          iconOnly || oneLine ? undefined : clampLines(expanded ? EXPANDED_NOTE_LINES : lines);
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
            {...(text ? cardOf([[date, text]], false) : {})}
            onPointerDown={
              text
                ? (event) => {
                    close();
                    onStartDrag(event, date);
                  }
                : undefined
            }
            onClick={() => onOpen(date)}
            onKeyDown={text ? (event) => onKeyDown(event, date) : undefined}
            tabIndex={text || date === entry ? 0 : -1}
            style={{ width: column.width, minHeight: dayHeight }}
            aria-label={
              text
                ? `Nota del ${formatDate(date)}: ${text}`
                : hidden
                  ? `Nota del ${formatDate(date)}, nascosta dalla ricerca`
                  : `Aggiungi una nota per il ${formatDate(date)}`
            }
            aria-describedby={text ? describedBy : undefined}
            title={hidden ? 'Nota nascosta dalla ricerca' : undefined}
            className={`group/note relative flex min-w-0 shrink-0 p-1 text-left in-data-compact:p-0.5 ${isCurrent ? 'z-[500]' : ''} ${columnEdge(column)} ${
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

      {card && (
        <HoverCard
          anchor={card.anchor}
          cardRef={cardProps.cardRef}
          onPointerEnter={cardProps.onPointerEnter}
          onPointerLeave={cardProps.onPointerLeave}
        >
          <ul className="flex flex-col gap-1.5 text-sm">
            {card.item.map(([date, text]) => (
              <li key={date}>
                <span className="block text-xs font-semibold text-fg-muted">
                  Nota del {formatDate(date)}
                </span>
                <span className="block break-words whitespace-pre-line">{text}</span>
              </li>
            ))}
          </ul>
        </HoverCard>
      )}
    </div>
  );
});
