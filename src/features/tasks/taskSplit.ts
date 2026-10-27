import type { TaskColorId } from '../../domain/colors';
import { maxSplitParts, splitDays } from '../../domain/split';
import type { TaskItem } from '../../domain/types';
import { daysBetween } from '../../utils/dateUtils';
import type { SplitTarget } from '../split/SplitDialog';

/** How many parts a task can make: a day each at least. */
export function taskSplitParts(task: Pick<TaskItem, 'startDate' | 'endDate'>): number {
  return maxSplitParts(daysBetween(task.startDate, task.endDate), 1);
}

/**
 * The window «Dividi» for a task of Next Releases: its days of the calendar, weekends included as
 * the task has them, in parts one after the other.
 */
export function taskSplitTarget(
  task: TaskItem,
  colorId: TaskColorId,
  formatDate: (iso: string) => string,
): SplitTarget {
  const total = daysBetween(task.startDate, task.endDate);
  return {
    name: task.title.replace(/\s+/g, ' ').trim(),
    summary: `${total} giorni dal ${formatDate(task.startDate)} al ${formatDate(task.endDate)}`,
    total,
    step: 1,
    maxParts: taskSplitParts(task),
    colorId,
    hasNote: Boolean(task.description?.trim()),
    pauseIn: 'calendar',
    place: (sizes, pause) => splitDays(task.startDate, sizes, pause),
    // A task covers every day of its span: none is drawn as a day off.
    isDayOff: () => false,
  };
}
