import { useMemo, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ZOOM_DAY_WIDTH } from '../../domain/schedule';
import type { DateRange } from '../../domain/schedule';
import type { DailyMetric } from '../../domain/types';
import { scaledTextStyle } from '../../shared/ui/textScale';
import type { TextScale } from '../../shared/ui/textScale';
import { useRootHeightVar } from '../../shared/useRootHeightVar';
import { useStableCallback } from '../../shared/useStableCallback';
import { diffDays } from '../../utils/dateUtils';
import type { CalendarJump } from '../calendar/calendarView';
import { MetricsRow } from '../calendar/MetricsRow';
import { DayHeaderRow, MonthBand } from '../calendar/TimelineHeader';
import {
  TIMELINE_SCROLLER,
  buildColumns,
  columnUnit,
  timelineMetrics,
} from '../calendar/timelineLayout';
import type { Column } from '../calendar/timelineLayout';
import { useTimelineScroll } from '../calendar/useTimelineScroll';
import { useViewportWidth } from '../calendar/useViewportWidth';
import { useZoomGestures } from '../calendar/useZoomGestures';
import { ColumnHandle } from './ColumnHandle';

/** The variable with the height of the rows at the top of the timeline, which stay in view. */
const HEAD_HEIGHT_VAR = '--timeline-head-height';

/** The variable with the height of the bar above the timeline, set by the area: the frame fits under it. */
export const TOOLBAR_HEIGHT_VAR = '--timeline-toolbar-height';

/** The least height of the frame: on a short window the page scrolls instead. */
const MIN_HEIGHT = 320;

/** The days of a timeline as its rows draw them: the same for every section. */
export interface TimelineGeometry {
  range: DateRange;
  dayWidth: number;
  today: string;
  columns: Column[];
  /** Columns of a week, when a day would be too narrow. */
  weekColumns: boolean;
  /** Width of all the columns, in pixels. */
  totalWidth: number;
  /** The middle of today's column, from the first day; null when today is out of the range. */
  todayOffset: number | null;
  /** Shows the days of a week column. Stable. */
  onShowDays: (date: string) => void;
}

/** The column of the names as the user sizes it: the width, in pixels at the normal text, and its limits. */
export interface LabelResize {
  width: number;
  min: number;
  max: number;
  onChange: (width: number) => void;
  onReset: () => void;
}

interface TimelineFrameProps {
  /** The days the timeline holds; it scrolls through them. */
  range: DateRange;
  /** Pixels per day, as the view sets them. */
  dayWidth: number;
  today: string;
  highlightWeekends: boolean;
  /** The first day in view when the timeline opens, where the user left it. */
  anchor: string;
  /** The last navigation: the timeline scrolls so that its day is at the left edge. */
  jump: CalendarJump;
  /** First and last day in view, as the user scrolls; `settled` once scrolling has stopped. */
  onScrolled: (first: string, last: string, settled: boolean) => void;
  /** The width of the days beside the column of the names, on opening and once the window settles. */
  onResized: (width: number) => void;
  /** -1 zooms in, 1 zooms out. */
  onZoom: (step: -1 | 1) => void;
  /** Shows the days of a week, from the quarter view. */
  onShowDays: (date: string) => void;
  /** The column of the names: its width as a CSS length, and in pixels for the scroll. */
  labelWidth: string;
  labelWidthPx: number;
  /** The handle that sizes the column, when the user can. */
  labelResize?: LabelResize;
  /** The daily values, drawn under the months with their monthly totals; null to show none. */
  metrics: DailyMetric[] | null;
  textScale: TextScale;
  compact: boolean;
  /** The rows, drawn with the geometry of the days. */
  children: (geometry: TimelineGeometry) => ReactNode;
}

/**
 * The scrolling part of a timeline: the months, the daily values and the days at the top, and the
 * rows the sections draw under them over the same columns. It scrolls through the days and, no
 * taller than the window leaves it, through the rows, with the rows at the top and the names at
 * the left always in view. It scrolls to the jumps of the view, keeps its place when the zoom
 * changes, reports the days in view and the width of the days, and zooms with Ctrl + wheel and a
 * pinch. Its own stacking context, so that nothing inside passes over the header of the page.
 */
export function TimelineFrame({
  range,
  dayWidth,
  today,
  highlightWeekends,
  anchor,
  jump,
  onScrolled,
  onResized,
  onZoom,
  onShowDays,
  labelWidth,
  labelWidthPx,
  labelResize,
  metrics,
  textScale,
  compact,
  children,
}: TimelineFrameProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const columns = useMemo(
    () => buildColumns(range, dayWidth, highlightWeekends, today),
    [range, dayWidth, highlightWeekends, today],
  );
  const weekColumns = columnUnit(dayWidth) === 'week';
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const todayOffset =
    range.start <= today && today <= range.end
      ? (diffDays(range.start, today) + 0.5) * dayWidth
      : null;
  const showDays = useStableCallback(onShowDays);
  const { digitWidth } = timelineMetrics(dayWidth, textScale, compact);

  useZoomGestures(scrollRef, onZoom);
  useViewportWidth(scrollRef, onResized);
  useTimelineScroll(scrollRef, {
    range,
    dayWidth,
    labelWidth: labelWidthPx,
    openOn: anchor,
    jump,
    onScrolled,
  });
  // An element brought into view stays clear of the rows at the top.
  useRootHeightVar(headRef, HEAD_HEIGHT_VAR);

  const geometry: TimelineGeometry = {
    range,
    dayWidth,
    today,
    columns,
    weekColumns,
    totalWidth,
    todayOffset,
    onShowDays: showDays,
  };

  return (
    // Relative, so that hidden labels placed absolutely stay inside the scroll area instead of
    // widening the page. No scroll anchoring: the timeline keeps its place itself when it grows
    // at the start.
    <div
      ref={scrollRef}
      data-compact={compact || undefined}
      style={
        {
          ...scaledTextStyle(textScale, compact),
          '--gantt-label-width': labelWidth,
          maxHeight: `max(${MIN_HEIGHT}px, calc(100dvh - var(--header-height, 0px) - var(--tab-bar-height, 0px) - var(${TOOLBAR_HEIGHT_VAR}, 0px) - 0.5rem))`,
          scrollPaddingTop: `var(${HEAD_HEIGHT_VAR}, 0px)`,
        } as CSSProperties
      }
      className={TIMELINE_SCROLLER}
    >
      <div style={{ width: `calc(var(--gantt-label-width) + ${totalWidth}px)` }}>
        {/* The rows at the top stay in view while the rows scroll under them. */}
        <div ref={headRef} className="sticky top-0 z-[1100] bg-surface">
          <MonthBand range={range} dayWidth={dayWidth} metrics={metrics} />
          {metrics && (
            <MetricsRow
              columns={columns}
              metrics={metrics}
              weekColumns={weekColumns}
              digitWidth={digitWidth}
            />
          )}
          <DayHeaderRow
            columns={columns}
            weekColumns={weekColumns}
            showMonth={dayWidth >= ZOOM_DAY_WIDTH.detail}
            onShowDays={showDays}
          />
          {labelResize && (
            <ColumnHandle
              width={labelResize.width}
              min={labelResize.min}
              max={labelResize.max}
              scale={textScale}
              onChange={labelResize.onChange}
              onReset={labelResize.onReset}
            />
          )}
        </div>
        {children(geometry)}
      </div>
    </div>
  );
}
