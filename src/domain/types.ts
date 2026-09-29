import type { TaskColorId } from './colors';

export type TaskStatus = 'planned' | 'in_progress' | 'review' | 'completed' | 'blocked';

export type BorderStyle = 'dashed' | 'solid';

export interface TaskItem {
  id: string;
  title: string;
  laneId: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD, inclusive */
  endDate: string;
  colorId: TaskColorId;
  borderStyle: BorderStyle;
  status: TaskStatus;
  assignee?: string;
  description?: string;
  deliverables?: string[];
}

export interface Lane {
  id: string;
  name: string;
}

export interface DailyMetric {
  /** YYYY-MM-DD */
  date: string;
  value: number;
}

/** Note text by date (YYYY-MM-DD). */
export type DailyNotes = Record<string, string>;

/** Everything that makes up a plan: what is saved, exported and restored. */
export interface PlanSnapshot {
  lanes: Lane[];
  tasks: TaskItem[];
  metrics: DailyMetric[];
  dailyNotes: DailyNotes;
}

/** Calendar rows the user chose to hide. New lanes are visible by default. */
export interface RowVisibility {
  hiddenLaneIds: string[];
  showNotes: boolean;
}
