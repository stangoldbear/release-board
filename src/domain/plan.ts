import type { BorderStyle, Lane, PlanSnapshot, TaskStatus } from '../types';

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
