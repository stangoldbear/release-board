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

/**
 * How freely work can be released on a day, from the revenue forecast: green without limits, red
 * only with the approval of several stakeholders.
 */
export type ApprovalLight = 'green' | 'orange' | 'red';

export interface DailyMetric {
  /** YYYY-MM-DD */
  date: string;
  value: number;
  /** From an imported revenue forecast, with the promotions running on the day. */
  approval?: ApprovalLight;
  promoEu?: string;
  promoNonEu?: string;
}

/** Note text by date (YYYY-MM-DD). */
export type DailyNotes = Record<string, string>;

/** Who wrote a free note in a shared instance: GitHub id and username. */
export interface MemoAuthor {
  id: string;
  login: string;
}

/** A free note, in the strip under the search: about anything, not tied to a day. */
export interface Memo {
  id: string;
  title: string;
  body?: string;
  colorId?: TaskColorId;
  /** YYYY-MM-DD: from this day on, opening the calendar shows a reminder of the note. */
  remindOn?: string;
  /** Order in the strip, lowest first; fractional, so that a move changes one note only. */
  position: number;
  /** In a shared instance; the notes of the local mode have no author. */
  author?: MemoAuthor;
  /** Seen by its author only; absent on the notes that every member sees. */
  private?: true;
}

/** How far a project of the roadmap has come. */
export type ProjectStatus = 'idea' | 'planned' | 'in_progress' | 'completed' | 'on_hold';

/** A project of the roadmap, past, current or future: one row, with a bar from start to end. */
export interface Project {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD, inclusive */
  endDate: string;
  colorId: TaskColorId;
  status: ProjectStatus;
  /** Who leads it. */
  owner?: string;
  description?: string;
}

/** Everything that makes up a plan: what is saved, exported and restored. */
export interface PlanSnapshot {
  lanes: Lane[];
  tasks: TaskItem[];
  metrics: DailyMetric[];
  dailyNotes: DailyNotes;
  /** In the order of the strip. */
  memos: Memo[];
  /** The roadmap, in the order of its rows. */
  projects: Project[];
}

/** Calendar rows the user chose to hide. New lanes are visible by default. */
export interface RowVisibility {
  hiddenLaneIds: string[];
  showNotes: boolean;
}
