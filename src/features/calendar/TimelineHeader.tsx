import { memo } from 'react';
import { sumInRange } from '../../domain/metrics';
import { formatLocaleNumber } from '../../domain/numberFormat';
import { DAILY_METRIC } from '../../domain/plan';
import type { DateRange } from '../../domain/schedule';
import type { DailyMetric } from '../../domain/types';
import { formatDateToIT } from '../../utils/dateUtils';
import { monthLabel } from './calendarView';
import {
  LABEL_CELL,
  LABEL_WIDTH,
  columnEdge,
  columnTone,
  dayLabel,
  monthSpans,
} from './timelineLayout';
import type { Column } from './timelineLayout';

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
      <div
        className={`${LABEL_CELL} flex items-center bg-surface font-bold uppercase`}
        style={{ width: LABEL_WIDTH }}
      >
        Mese
      </div>
      {monthSpans(range, dayWidth).map((span) => {
        const total = metrics ? sumInRange(metrics, span.days) : null;
        return (
          // Clipped, not hidden: a hidden overflow would make the cell the sticky container.
          <div
            key={span.month}
            style={{ width: span.width }}
            className="shrink-0 overflow-clip border-r border-line-strong py-1.5"
          >
            <span
              className="sticky inline-flex items-baseline gap-2 px-2 whitespace-nowrap"
              style={{ left: LABEL_WIDTH }}
            >
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
}

/** The days, or the weeks, of the timeline. Today is underlined. */
export const DayHeaderRow = memo(function DayHeaderRow({
  columns,
  weekColumns,
  showMonth,
  onShowDays,
}: DayHeaderRowProps) {
  return (
    <div className="flex border-b border-line-strong">
      <div
        className={`${LABEL_CELL} flex items-center bg-surface text-xs font-bold uppercase`}
        style={{ width: LABEL_WIDTH }}
      >
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
              title={`Mostra i giorni dal ${formatDateToIT(column.start)} al ${formatDateToIT(column.end)}${column.isToday ? ' · Settimana di oggi' : ''}${holidayText ? ` · ${holidayText}` : ''}`}
              className={`shrink-0 cursor-pointer py-1 text-center text-xs hover:bg-surface-strong ${columnEdge(column)} ${columnTone(column)}`}
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
            </button>
          );
        }
        return (
          <div
            key={column.start}
            style={{ width: column.width }}
            title={`${formatDateToIT(column.start)}${column.isToday ? ' · Oggi' : ''}${holidayText ? ` · Festività: ${holidayText}` : ''}`}
            className={`shrink-0 py-1 text-center ${columnEdge(column)} ${columnTone(column)} ${column.isToday ? 'font-bold' : ''}`}
          >
            <span className="block text-xs uppercase">
              {start.weekday}
              {holidayText && <span aria-hidden="true"> •</span>}
            </span>
            <span className={`block text-sm leading-tight font-bold ${todayMark}`}>
              {start.day}
              {showMonth && ` ${start.month}`}
            </span>
            {column.isToday && <span className="sr-only">, oggi</span>}
          </div>
        );
      })}
    </div>
  );
});
