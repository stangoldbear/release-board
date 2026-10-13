import { memo } from 'react';
import type { KeyboardEvent } from 'react';
import { sumInRange } from '../../domain/metrics';
import { formatLocaleNumber } from '../../domain/numberFormat';
import { DAILY_METRIC } from '../../domain/plan';
import type { DateRange } from '../../domain/schedule';
import type { DailyMetric } from '../../domain/types';
import { monthLabel } from './calendarView';
import {
  CLOSURE_NAME,
  LABEL_CELL,
  NARROW_DAY_WIDTH,
  columnEdge,
  columnTone,
  dayLabel,
  monthSpans,
} from './timelineLayout';
import type { Column } from './timelineLayout';
import { useFormatDate } from '../..//shared/dateFormat';

interface MonthBandProps {
  range: DateRange;
  dayWidth: number;
  /** The daily values, for the total of each month; null while the values are hidden. */
  metrics: DailyMetric[] | null;
}

/** The months above the days. The name of a month stays in view while its days scroll by. */
export const MonthBand = memo(function MonthBand({ range, dayWidth, metrics }: MonthBandProps) {
  return (
    <div className="flex border-b border-line bg-surface text-xs">
      <div className={`${LABEL_CELL} flex items-center bg-surface font-bold uppercase`}>Mese</div>
      {monthSpans(range, dayWidth).map((span) => {
        const total = metrics ? sumInRange(metrics, span.days) : null;
        return (
          // Clipped, not hidden: a hidden overflow would make the cell the sticky container.
          <div
            key={span.month}
            style={{ width: span.width }}
            className="shrink-0 overflow-clip border-r border-line-strong py-1.5 in-data-compact:py-1"
          >
            <span className="sticky left-(--gantt-label-width) inline-flex items-baseline gap-2 px-2 whitespace-nowrap">
              <span className="font-bold tracking-wide uppercase">{monthLabel(span.month)}</span>
              {total !== null && (
                <span className="text-fg-muted tabular-nums">
                  {DAILY_METRIC.label} {formatLocaleNumber(total, DAILY_METRIC.decimals)}{' '}
                  {DAILY_METRIC.unit}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
});

interface DayHeaderRowProps {
  columns: Column[];
  /** Columns of a week, in the quarter view, rather than of a day. */
  weekColumns: boolean;
  /** Day columns wide enough for the month next to the day. */
  showMonth: boolean;
  /** Shows the days of a week column. */
  onShowDays: (date: string) => void;
  /** The day whose effort the footer shows; null for none. */
  selectedDay: string | null;
  /** Chooses a day, or none with the day already chosen. Stable. */
  onSelectDay: (date: string | null) => void;
}

/** The arrows move the focus from day to day along the row, as one stop of the Tab key. */
function moveAlongDays(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const next =
    event.key === 'ArrowLeft'
      ? event.currentTarget.previousElementSibling
      : event.currentTarget.nextElementSibling;
  if (!(next instanceof HTMLButtonElement)) return;
  event.preventDefault();
  next.focus();
}

/** A column at least this wide has room for the chip of today under its number. */
const TODAY_CHIP_WIDTH = 48;

/** The word «Oggi» under the number of today, so that the line of today has a name at its top. */
function TodayChip() {
  return (
    <span className="mx-auto mt-0.5 block w-fit rounded-sm bg-link px-1 text-xs leading-4 font-bold text-on-accent uppercase">
      Oggi
    </span>
  );
}

/**
 * The days, or the weeks, of the timeline. Today is underlined, with «Oggi» under its number. A
 * click on a day chooses it, and the footer says the effort of the teams on it; the arrows move
 * along the days, Enter or Space chooses.
 */
export const DayHeaderRow = memo(function DayHeaderRow({
  columns,
  weekColumns,
  showMonth,
  onShowDays,
  selectedDay,
  onSelectDay,
}: DayHeaderRowProps) {
  const formatDate = useFormatDate();
  // One stop of the Tab key: the chosen day, or today, or the first day.
  const stop =
    columns.find((column) => column.start === selectedDay)?.start ??
    columns.find((column) => column.isToday)?.start ??
    columns[0]?.start;
  return (
    <div className="flex border-b border-line-strong">
      <div className={`${LABEL_CELL} flex items-center bg-surface text-xs font-bold uppercase`}>
        {weekColumns ? 'Settimana' : 'Giorno'}
      </div>
      {columns.map((column) => {
        const start = dayLabel(column.start);
        const holidayText = column.holidays.join(', ');
        const todayMark = column.isToday ? 'underline decoration-2 underline-offset-4' : '';
        if (weekColumns) {
          const end = dayLabel(column.end);
          return (
            <button
              key={column.start}
              type="button"
              onClick={() => onShowDays(column.start)}
              style={{ width: column.width }}
              title={`Mostra i giorni dal ${formatDate(column.start)} al ${formatDate(column.end)}${column.isToday ? ' · Settimana di oggi' : ''}${holidayText ? ` · ${holidayText}` : ''}`}
              className={`shrink-0 cursor-pointer py-1 text-center text-xs hover:bg-surface-strong in-data-compact:py-0.5 ${columnEdge(column)} ${columnTone(column)}`}
            >
              <span className={`block font-bold ${todayMark}`}>
                {start.day} {start.month}
                {holidayText && (
                  <>
                    <span className="ml-0.5 text-holiday-fg" aria-hidden="true">
                      •
                    </span>
                    <span className="sr-only">, festività: {holidayText}</span>
                  </>
                )}
              </span>
              <span className="block text-fg-muted">
                – {end.day} {end.month}
              </span>
              {column.isToday && <TodayChip />}
            </button>
          );
        }
        // A narrow day has room for the initial of the weekday and a smaller number.
        const narrow = column.width < NARROW_DAY_WIDTH;
        const selected = column.start === selectedDay;
        return (
          <button
            key={column.start}
            type="button"
            aria-pressed={selected}
            tabIndex={column.start === stop ? 0 : -1}
            onClick={() => onSelectDay(selected ? null : column.start)}
            onKeyDown={moveAlongDays}
            style={{ width: column.width }}
            title={`${formatDate(column.start)}${column.isToday ? ' · Oggi' : ''}${holidayText ? ` · Festività: ${holidayText}` : ''}${column.closure ? ` · ${column.closure === CLOSURE_NAME ? CLOSURE_NAME : `${CLOSURE_NAME}: ${column.closure}`}` : ''} · ${selected ? 'Clic per togliere l’effort del giorno' : 'Clic per l’effort dei team in questo giorno'}`}
            className={`shrink-0 cursor-pointer py-1 text-center hover:bg-surface-strong focus-visible:-outline-offset-2 in-data-compact:py-0.5 ${columnEdge(column)} ${
              selected ? 'bg-accent-soft ring-2 ring-link ring-inset' : columnTone(column)
            } ${column.isToday ? 'font-bold' : ''}`}
          >
            <span className="block text-xs uppercase">
              {narrow ? (
                <>
                  <span aria-hidden="true">{start.weekday.charAt(0)}</span>
                  <span className="sr-only">{start.weekday}</span>
                </>
              ) : (
                start.weekday
              )}
              {holidayText && <span aria-hidden="true"> •</span>}
              {column.closure && <span className="sr-only">, chiusura aziendale</span>}
            </span>
            <span
              className={`block leading-tight font-bold ${narrow ? 'text-xs' : 'text-sm'} ${todayMark}`}
            >
              {start.day}
              {showMonth && ` ${start.month}`}
            </span>
            {column.isToday &&
              (column.width >= TODAY_CHIP_WIDTH ? (
                <TodayChip />
              ) : (
                <span className="sr-only">, oggi</span>
              ))}
          </button>
        );
      })}
    </div>
  );
});
