import type { TaskItem, TaskStatus } from './types';

export interface TaskFilter {
  /** Text to find in the title, assignee or description. */
  search: string;
  /** Only tasks in this status; null for all of them. */
  status: TaskStatus | null;
}

export const NO_FILTER: TaskFilter = { search: '', status: null };

export function isFiltering(filter: TaskFilter): boolean {
  return filter.status !== null || filter.search.trim() !== '';
}

/** Lowercase and without accents, so that "attivita" finds "attività". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function filterTasks(tasks: readonly TaskItem[], filter: TaskFilter): TaskItem[] {
  const query = normalize(filter.search.trim());
  return tasks.filter((task) => {
    if (filter.status !== null && task.status !== filter.status) return false;
    if (query === '') return true;
    return [task.title, task.assignee ?? '', task.description ?? ''].some((field) =>
      normalize(field).includes(query),
    );
  });
}
