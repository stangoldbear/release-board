import { ZOOM_LEVELS, shiftAnchor, visibleRange, weekRange } from '../../domain/schedule';
import type { DateRange, ZoomLevel } from '../../domain/schedule';
import { addDaysIso, ITALIAN_MONTHS, ITALIAN_MONTHS_SHORT } from '../../utils/dateUtils';

/** The timeline with lanes, or the board of one week. */
export type CalendarMode = 'timeline' | 'week';

export interface CalendarView {
  mode: CalendarMode;
  /** Zoom of the timeline; the week board ignores it. */
  zoom: ZoomLevel;
  /** A date in the visible period. Changing zoom or mode keeps it in view. */
  anchor: string;
}

export type CalendarAction =
  | { type: 'previous' }
  | { type: 'next' }
  | { type: 'goTo'; date: string }
  | { type: 'setMode'; mode: CalendarMode }
  | { type: 'setZoom'; zoom: ZoomLevel }
  /** -1 zooms in, towards fewer days; 1 zooms out. Stops at the first and last level. */
  | { type: 'zoomBy'; step: -1 | 1 };

export function calendarViewReducer(view: CalendarView, action: CalendarAction): CalendarView {
  switch (action.type) {
    case 'previous':
    case 'next': {
      const step = action.type === 'next' ? 1 : -1;
      const anchor =
        view.mode === 'week'
          ? addDaysIso(view.anchor, 7 * step)
          : shiftAnchor(view.zoom, view.anchor, step);
      return { ...view, anchor };
    }
    case 'goTo':
      return { ...view, anchor: action.date };
    case 'setMode':
      return { ...view, mode: action.mode };
    case 'setZoom':
      return { ...view, mode: 'timeline', zoom: action.zoom };
    case 'zoomBy': {
      const index = ZOOM_LEVELS.indexOf(view.zoom) + action.step;
      const zoom = ZOOM_LEVELS[Math.min(Math.max(index, 0), ZOOM_LEVELS.length - 1)];
      return zoom === undefined || zoom === view.zoom ? view : { ...view, zoom };
    }
  }
}

export function visiblePeriod(view: CalendarView): DateRange {
  return view.mode === 'week' ? weekRange(view.anchor) : visibleRange(view.zoom, view.anchor);
}

function parts(iso: string) {
  const [year = '', month = '', day = ''] = iso.split('-');
  return { year, month: Number(month) - 1, day: Number(day) };
}

/** "28 set – 11 ott 2026", with the year only once when both dates share it. */
function dayRangeLabel(range: DateRange): string {
  const start = parts(range.start);
  const end = parts(range.end);
  const startText = `${start.day} ${ITALIAN_MONTHS_SHORT[start.month]}`;
  const endText = `${end.day} ${ITALIAN_MONTHS_SHORT[end.month]} ${end.year}`;
  return start.year === end.year
    ? `${startText} – ${endText}`
    : `${startText} ${start.year} – ${endText}`;
}

/** What the header shows for the visible period. */
export function periodLabel(view: CalendarView): string {
  if (view.mode === 'week' || view.zoom === 'detail') return dayRangeLabel(visiblePeriod(view));

  const first = parts(view.anchor);
  if (view.zoom === 'month') return `${ITALIAN_MONTHS[first.month]} ${first.year}`;

  const last = parts(shiftAnchor('month', view.anchor, 2));
  return first.year === last.year
    ? `${ITALIAN_MONTHS[first.month]} – ${ITALIAN_MONTHS[last.month]} ${last.year}`
    : `${ITALIAN_MONTHS[first.month]} ${first.year} – ${ITALIAN_MONTHS[last.month]} ${last.year}`;
}
