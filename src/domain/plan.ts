import type { BorderStyle, Lane, PlanSnapshot, TaskItem, TaskStatus } from './types';

export const DEFAULT_LANES: readonly Lane[] = [
  { id: 'lane-1', name: 'Frontend' },
  { id: 'lane-2', name: 'Backend' },
  { id: 'lane-3', name: 'Contenuti' },
];

/** The single daily metric of this version. Label and unit become configurable per plan later. */
export const DAILY_METRIC = { id: 'metric-1', label: 'Fatturato', unit: '€', decimals: 0 } as const;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  planned: 'Pianificato',
  in_progress: 'In corso',
  review: 'In revisione',
  completed: 'Completato',
  blocked: 'Bloccato',
};

export const TASK_STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];

export const BORDER_STYLES: readonly BorderStyle[] = ['dashed', 'solid'];

export function createEmptyPlan(): PlanSnapshot {
  return {
    lanes: DEFAULT_LANES.map((lane) => ({ ...lane })),
    tasks: [],
    metrics: [],
    dailyNotes: {},
  };
}

export function isPlanEmpty(plan: PlanSnapshot): boolean {
  return (
    plan.tasks.length === 0 &&
    plan.metrics.length === 0 &&
    Object.keys(plan.dailyNotes).length === 0
  );
}

/** Fields of a task to overwrite; the ones left out stay as they are. */
export type TaskChanges = Partial<Omit<TaskItem, 'id'>>;

/** A daily value to set, or to remove with null. */
export interface MetricValueChange {
  date: string;
  value: number | null;
}

/**
 * The fields that differ between two versions of a task. Saving only these keeps the changes that
 * someone else made to the other fields in the meantime. Fields missing from `after` count as
 * unchanged.
 */
export function diffTask(before: TaskItem, after: TaskItem): TaskChanges {
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(after) as (keyof TaskItem)[]) {
    const value = after[key];
    if (key === 'id' || value === undefined) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(value)) changes[key] = value;
  }
  return changes;
}

/** The content of a new task equal to this one, marked as a copy in the title. */
export function copyOfTask({ id, ...content }: TaskItem): Omit<TaskItem, 'id'> {
  return {
    ...content,
    title: content.title.includes('(Copia)') ? content.title : `${content.title} (Copia)`,
  };
}

export function addTask(plan: PlanSnapshot, task: TaskItem): PlanSnapshot {
  return { ...plan, tasks: [...plan.tasks, task] };
}

/** Applies the changes to the task; a task that no longer exists stays deleted. */
export function updateTask(plan: PlanSnapshot, taskId: string, changes: TaskChanges): PlanSnapshot {
  return {
    ...plan,
    tasks: plan.tasks.map((task) => (task.id === taskId ? { ...task, ...changes } : task)),
  };
}

export function removeTask(plan: PlanSnapshot, taskId: string): PlanSnapshot {
  return { ...plan, tasks: plan.tasks.filter((task) => task.id !== taskId) };
}

/** Sets the note of a day; blank text removes it. */
export function setNote(plan: PlanSnapshot, date: string, text: string): PlanSnapshot {
  const dailyNotes = { ...plan.dailyNotes };
  if (text.trim()) dailyNotes[date] = text.trim();
  else delete dailyNotes[date];
  return { ...plan, dailyNotes };
}

export function setMetricValues(
  plan: PlanSnapshot,
  changes: readonly MetricValueChange[],
): PlanSnapshot {
  const values = new Map(plan.metrics.map((metric) => [metric.date, metric.value]));
  for (const change of changes) {
    if (change.value === null) values.delete(change.date);
    else values.set(change.date, change.value);
  }
  return {
    ...plan,
    metrics: [...values]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
