import { TASK_STATUSES } from './plan';
import type { TaskItem, TaskStatus } from './types';

/** How many tasks are in each status; every status is present, with zero when unused. */
export function countByStatus(tasks: readonly TaskItem[]): Record<TaskStatus, number> {
  const counts = Object.fromEntries(TASK_STATUSES.map((status) => [status, 0])) as Record<
    TaskStatus,
    number
  >;
  for (const task of tasks) counts[task.status] += 1;
  return counts;
}
