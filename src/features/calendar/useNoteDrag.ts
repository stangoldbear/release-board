import type { PointerEvent as ReactPointerEvent } from 'react';
import type { DateRange } from '../../domain/schedule';
import { addDaysIso } from '../../utils/dateUtils';
import { usePointerDrag } from './usePointerDrag';

export interface NoteDrag {
  /** The day the note comes from. */
  from: string;
  /** The day under the pointer, within the visible period. */
  to: string;
  /** False when `to` already has a note: a day has one. */
  allowed: boolean;
}

/** The day `days` after `date`, kept within the visible period. */
function dayWithin(date: string, days: number, period: DateRange): string {
  const day = addDaysIso(date, days);
  if (day < period.start) return period.start;
  return day > period.end ? period.end : day;
}

/**
 * Drags the notes of the calendar from one day to another with a mouse or a pen, like the tasks;
 * on touch screens a finger scrolls the calendar instead. A day that already has a note does not
 * take another one.
 */
export function useNoteDrag(
  dayWidth: number,
  period: DateRange,
  isDayFree: (date: string) => boolean,
  onMoveNote: (from: string, to: string) => void,
) {
  const { drag, start, isClickAfterDrag } = usePointerDrag<NoteDrag>(
    (current, delta) => {
      const to = dayWithin(current.from, Math.round(delta.x / dayWidth), period);
      const allowed = to === current.from || isDayFree(to);
      return to === current.to && allowed === current.allowed
        ? current
        : { ...current, to, allowed };
    },
    (done) => {
      if (done.to !== done.from && done.allowed) onMoveNote(done.from, done.to);
    },
  );

  const startDrag = (event: ReactPointerEvent, date: string) => {
    start(event, { from: date, to: date, allowed: true });
  };

  return { drag, startDrag, isClickAfterDrag };
}
