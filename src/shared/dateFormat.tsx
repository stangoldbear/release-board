import { createContext, useCallback, useContext } from 'react';
import { DEFAULT_DATE_FORMAT, formatDate } from '../utils/dateUtils';
import type { DateFormat } from '../utils/dateUtils';

/**
 * The format of the dates written in full, as this browser remembers it. A context, so that the
 * memoized rows of the calendars redraw their labels when the setting changes.
 */
export const DateFormatContext = createContext<DateFormat>(DEFAULT_DATE_FORMAT);

/** The format of the dates, to pass to the functions that write dates outside the components. */
export function useDateFormat(): DateFormat {
  return useContext(DateFormatContext);
}

/** Writes a date in full in the format of this browser. */
export function useFormatDate(): (date: Date | string | null | undefined) => string {
  const format = useDateFormat();
  return useCallback((date) => formatDate(date, format), [format]);
}
