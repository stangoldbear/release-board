import { useEffect, useReducer } from 'react';
import type { Dispatch } from 'react';
import { ZOOM_LEVELS } from '../../domain/schedule';
import type { ZoomLevel } from '../../domain/schedule';
import { oneOf, readPreference, writePreference } from '../../infra/preferences';
import { todayIso } from '../../utils/dateUtils';
import { calendarViewReducer, initialView } from './calendarView';
import type { CalendarAction, CalendarView } from './calendarView';

/**
 * A calendar view, starting from today. The browser remembers the zoom level under `key`: the
 * calendar of the releases and the roadmap each have their own.
 */
export function useCalendarView(
  key = 'zoom',
  fallback: ZoomLevel = 'month',
): [CalendarView, Dispatch<CalendarAction>] {
  const [view, dispatch] = useReducer(calendarViewReducer, null, () =>
    initialView(readPreference(key, oneOf(ZOOM_LEVELS)) ?? fallback, todayIso()),
  );
  useEffect(() => writePreference(key, view.zoom), [key, view.zoom]);
  return [view, dispatch];
}
