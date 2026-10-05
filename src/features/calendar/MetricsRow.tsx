import { memo, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { APPROVAL_LABELS, strictestLight } from '../../domain/approval';
import { formatShortNumber } from '../../domain/numberFormat';
import { DAILY_METRIC } from '../../domain/plan';
import { rangeDays } from '../../domain/schedule';
import type { DailyMetric } from '../../domain/types';
import { HoverCard, useHoverCard } from '../../shared/ui/HoverCard';
import { formatDateToIT, todayIso } from '../../utils/dateUtils';
import {
  APPROVAL_TONE,
  ApprovalIcon,
  DayDetails,
  WeekDetails,
  describeDay,
  preciseValue,
} from '../metrics/MetricDetails';
import { LABEL_CELL, LABEL_WIDTH, columnEdge } from './timelineLayout';
import type { Column } from './timelineLayout';

interface MetricsRowProps {
  columns: Column[];
  metrics: DailyMetric[];
  weekColumns: boolean;
}

/** A column with its values: one day, or the days of a week. */
interface ColumnValues {
  column: Column;
  days: DailyMetric[];
}

/** Width of the approval icon and its gap, taken from the room for the number. */
const ICON_WIDTH = 14;

function cellId(date: string): string {
  return `metric-cell-${date}`;
}

function weekLabel({ column, days }: ColumnValues): string {
  const total = days.reduce((sum, day) => sum + day.value, 0);
  const light = strictestLight(days.map((day) => day.approval));
  return `${DAILY_METRIC.label} della settimana dal ${formatDateToIT(column.start)} al ${formatDateToIT(column.end)}: ${preciseValue(total)}${
    light ? `; semaforo più restrittivo: ${APPROVAL_LABELS[light].name.toLowerCase()}` : ''
  }`;
}

/**
 * The daily values, or their sum for each week. A value is colored by the approval light of its
 * day (for a week, the most restrictive one); resting on it, focusing it or tapping it shows the
 * exact value and the promotions. The arrows move between the values.
 */
export const MetricsRow = memo(function MetricsRow({
  columns,
  metrics,
  weekColumns,
}: MetricsRowProps) {
  const byDate = useMemo(() => new Map(metrics.map((metric) => [metric.date, metric])), [metrics]);
  const cells: ColumnValues[] = columns.map((column) => ({
    column,
    days: rangeDays(column).flatMap((date) => byDate.get(date) ?? []),
  }));
  const withValues = cells.filter((cell) => cell.days.length > 0).map((cell) => cell.column.start);

  const { card, triggerProps, cardProps } = useHoverCard<ColumnValues>();
  // One stop in the tab order for the whole row: the arrows move along it.
  const [active, setActive] = useState<string | null>(null);
  const today = todayIso();
  const tabStop =
    (active && withValues.includes(active) ? active : null) ??
    withValues.find((date) => date >= today) ??
    withValues.at(-1);

  const moveFocus = (event: KeyboardEvent, date: string) => {
    const index = withValues.indexOf(date);
    const target =
      event.key === 'ArrowRight'
        ? withValues[index + 1]
        : event.key === 'ArrowLeft'
          ? withValues[index - 1]
          : event.key === 'Home'
            ? withValues[0]
            : event.key === 'End'
              ? withValues.at(-1)
              : undefined;
    if (!target) return;
    event.preventDefault();
    setActive(target);
    const element = document.getElementById(cellId(target));
    // Scroll first, focus on the next frame: the scroll closes the open card, the focus opens the new one.
    element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    window.requestAnimationFrame(() => element?.focus({ preventScroll: true }));
  };

  // Roughly how many characters of a number fit in a column, next to the light's icon.
  const maxDigits = Math.floor(((columns[0]?.width ?? 0) - ICON_WIDTH) / 7);

  return (
    <div
      role="toolbar"
      aria-label={`${DAILY_METRIC.label}: frecce per passare da un valore all'altro`}
      className="flex border-b border-line bg-surface-muted text-xs"
    >
      <div className={`${LABEL_CELL} bg-surface-muted`} style={{ width: LABEL_WIDTH }}>
        <span className="block truncate font-bold">{DAILY_METRIC.label}</span>
        <span className="block truncate text-fg-muted">
          {weekColumns ? 'Per settimana' : 'Per giorno'}
        </span>
      </div>
      {cells.map((cell) => {
        const { column, days } = cell;
        const base = `flex shrink-0 items-center justify-center gap-0.5 truncate px-0.5 tabular-nums ${columnEdge(column)}`;
        if (days.length === 0) {
          return (
            <div
              key={column.start}
              style={{ width: column.width }}
              className={`${base} ${column.past ? 'bg-past' : ''}`}
            />
          );
        }
        const total = days.reduce((sum, day) => sum + day.value, 0);
        const light = strictestLight(days.map((day) => day.approval));
        // Past days are grey whatever their light; the card still shows it.
        const tone = column.past
          ? 'bg-past text-fg-muted'
          : light
            ? `${APPROVAL_TONE[light]} font-semibold`
            : column.isToday
              ? 'bg-accent-soft text-link'
              : '';
        const [day] = days;
        return (
          <button
            key={column.start}
            id={cellId(column.start)}
            type="button"
            tabIndex={column.start === tabStop ? 0 : -1}
            aria-label={weekColumns || !day ? weekLabel(cell) : describeDay(day)}
            onKeyDown={(event) => moveFocus(event, column.start)}
            {...triggerProps(cell)}
            style={{ width: column.width }}
            className={`${base} ${tone} scroll-ml-24 cursor-pointer hover:brightness-95 focus-visible:-outline-offset-2`}
          >
            {light && !column.past && <ApprovalIcon light={light} />}
            {formatShortNumber(total, DAILY_METRIC.decimals, maxDigits)}
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
          {weekColumns || !card.item.days[0] ? (
            <WeekDetails week={card.item.column} days={card.item.days} />
          ) : (
            <DayDetails metric={card.item.days[0]} />
          )}
        </HoverCard>
      )}
    </div>
  );
});
