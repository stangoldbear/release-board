import { useEffect, useReducer } from 'react';
import type { Dispatch } from 'react';
import { ZOOM_LEVELS } from '../../domain/schedule';
import { oneOf, readPreference, writePreference } from '../../infra/preferences';
import { todayIso } from '../../utils/dateUtils';
import { calendarViewReducer, initialView } from './calendarView';
import type { CalendarAction, CalendarView } from './calendarView';

/** The calendar view, starting from today. The browser remembers the zoom level. */
export function useCalendarView(): [CalendarView, Dispatch<CalendarAction>] {
  const [view, dispatch] = useReducer(calendarViewReducer, null, () =>
    initialView(readPreference('zoom', oneOf(ZOOM_LEVELS)) ?? 'month', todayIso()),
  );
  useEffect(() => writePreference('zoom', view.zoom), [view.zoom]);
  return [view, dispatch];
}
