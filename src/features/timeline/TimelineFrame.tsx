import { useMemo, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ZOOM_DAY_WIDTH } from '../../domain/schedule';
import type { DateRange } from '../../domain/schedule';
import type { Closure, DailyMetric } from '../../domain/types';
import { scaledTextStyle } from '../../shared/ui/textScale';
import type { TextScale } from '../../shared/ui/textScale';
import { useRootHeightVar } from '../../shared/useRootHeightVar';
import { useStableCallback } from '../../shared/useStableCallback';
import { diffDays } from '../../utils/dateUtils';
import type { CalendarJump } from '../calendar/calendarView';
import { MetricsRow } from '../calendar/MetricsRow';
import { DayHeaderRow, MonthBand } from '../calendar/TimelineHeader';
import {
  TIMELINE_FRAME,
  TIMELINE_SCROLLER,
  buildColumns,
  columnUnit,
  timelineMetrics,
} from '../calendar/timelineLayout';
import type { Column } from '../calendar/timelineLayout';
import { useLinkedScroll } from '../calendar/useLinkedScroll';
import { useTimelineScroll } from '../calendar/useTimelineScroll';
import { useViewportWidth } from '../calendar/useViewportWidth';
import { useZoomGestures } from '../calendar/useZoomGestures';
import { ColumnHandle } from './ColumnHandle';

/** The variable with the height of the rows at the top of the timeline, which stay in view. */
const HEAD_HEIGHT_VAR = '--timeline-head-height';

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
  /** The company closures, striped red on every row. */
  closures: readonly Closure[];
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
  /** The day chosen at the top, whose effort the footer shows; null for none. */
  selectedDay: string | null;
  onSelectDay: (date: string | null) => void;
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
 * The days of a timeline: the months, the daily values and the days at the top, and the rows the
 * sections draw under them over the same columns. As tall as its rows: the page scrolls them, with
 * one scroll bar, while the rows at the top stay in view under the header of the page. The days
 * scroll sideways together at the top, in the rows and in a scroll bar kept at the bottom of the
 * window, with the names at the left always in view. It scrolls to the jumps of the view, keeps
 * its place when the zoom changes, reports the days in view and the width of the days, and zooms
 * with Ctrl + wheel and a pinch. Its own stacking context, so that nothing inside passes over the
 * header of the page.
 */
export function TimelineFrame({
  range,
  dayWidth,
  today,
  highlightWeekends,
  closures,
  anchor,
  jump,
  onScrolled,
  onResized,
  onZoom,
  onShowDays,
  selectedDay,
  onSelectDay,
  labelWidth,
  labelWidthPx,
  labelResize,
  metrics,
  textScale,
  compact,
  children,
}: TimelineFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const headScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const followers = useMemo(() => [headScrollRef, barRef], []);
  const columns = useMemo(
    () => buildColumns(range, dayWidth, highlightWeekends, today, closures),
    [range, dayWidth, highlightWeekends, today, closures],
  );
  const weekColumns = columnUnit(dayWidth) === 'week';
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const todayOffset =
    range.start <= today && today <= range.end
      ? (diffDays(range.start, today) + 0.5) * dayWidth
      : null;
  const showDays = useStableCallback(onShowDays);
  const selectDay = useStableCallback(onSelectDay);
  const { digitWidth } = timelineMetrics(dayWidth, textScale, compact);

  // The rows lead: the days at the top and the scroll bar follow them, and lead them in turn.
  const follow = useLinkedScroll(scrollRef, followers);
  useZoomGestures(frameRef, onZoom);
  useViewportWidth(frameRef, onResized);
  useTimelineScroll(scrollRef, {
    range,
    dayWidth,
    labelWidth: labelWidthPx,
    openOn: anchor,
    jump,
    onScrolled,
    follow,
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

  const width = `calc(var(--gantt-label-width) + ${totalWidth}px)`;

  return (
    <div
      ref={frameRef}
      data-compact={compact || undefined}
      style={
        {
          ...scaledTextStyle(textScale, compact),
          '--gantt-label-width': labelWidth,
        } as CSSProperties
      }
      className={TIMELINE_FRAME}
    >
      {/* The rows at the top stay in view, under the header of the page, while the page scrolls. */}
      <div
        ref={headRef}
        className="sticky top-0 z-[1100] bg-surface sm:top-[var(--header-height,0px)]"
      >
        {/* Not a stop of its own for the keyboard, which has the period and its arrows. */}
        <div ref={headScrollRef} tabIndex={-1} className={TIMELINE_SCROLLER}>
          <div style={{ width }}>
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
              selectedDay={selectedDay}
              onSelectDay={selectDay}
            />
          </div>
        </div>
        {/* Outside the days, so that it stays on the edge of the column while they scroll. */}
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
      {/* An element brought into view in the rows stays clear of the rows at the top. */}
      <div
        ref={scrollRef}
        className={`${TIMELINE_SCROLLER} **:scroll-mt-[var(--timeline-head-height,0px)]`}
      >
        <div style={{ width }}>{children(geometry)}</div>
      </div>
      {/* The scroll bar of the days, at the bottom of the window while the rows go on below it.
          The keyboard has the period and its arrows. */}
      <div
        ref={barRef}
        aria-hidden="true"
        tabIndex={-1}
        className="sticky bottom-[var(--tab-bar-height,0px)] z-[1100] overflow-x-auto overflow-y-hidden"
      >
        <div style={{ width, height: 1 }} />
      </div>
    </div>
  );
}
