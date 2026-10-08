import { useEffect, useReducer } from 'react';
import type { Dispatch } from 'react';
import { ZOOM_LEVELS } from '../../domain/schedule';
import type { ZoomLevel } from '../../domain/schedule';
import { oneOf, readPreference, writePreference } from '../../infra/preferences';
import { todayIso } from '../../utils/dateUtils';
import { calendarViewReducer, initialView, parseFitDays } from './calendarView';
import type { CalendarAction, CalendarView } from './calendarView';

/**
 * A calendar view, starting from today. The browser remembers the zoom level under `<prefix>zoom`
 * and the days of the fitted level under `<prefix>fit-days`: the calendar of the releases and the
 * roadmap each have their own.
 */
export function useCalendarView(
  prefix = '',
  fallback: ZoomLevel = 'month',
): [CalendarView, Dispatch<CalendarAction>] {
  const zoomKey = `${prefix}zoom`;
  const daysKey = `${prefix}fit-days`;
  const [view, dispatch] = useReducer(calendarViewReducer, null, () =>
    initialView(
      readPreference(zoomKey, oneOf(ZOOM_LEVELS)) ?? fallback,
      todayIso(),
      readPreference(daysKey, parseFitDays) ?? undefined,
    ),
  );
  useEffect(() => writePreference(zoomKey, view.zoom), [zoomKey, view.zoom]);
  useEffect(() => writePreference(daysKey, view.fitDays), [daysKey, view.fitDays]);
  return [view, dispatch];
}
