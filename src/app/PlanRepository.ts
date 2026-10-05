import type { MetricValueChange, TaskChanges } from '../domain/plan';
import type { DailyMetric, PlanSnapshot, TaskItem } from '../domain/types';

/** Whether the changes made here have reached where the plan is kept. */
export type SyncStatus = 'synced' | 'saving' | 'offline' | 'error';

/**
 * Where the plan lives. The app reads it only through `subscribe` and changes it one entity, or one
 * field, at a time: a shared backend can then merge the changes made by several people, and the
 * app never overwrites the whole plan with a stale copy.
 */
export interface PlanRepository {
  /**
   * Calls the listener with the current plan, synchronously when it is already available, and
   * again after every change, made here or elsewhere. Returns the function that stops the calls.
   */
  subscribe(listener: (plan: PlanSnapshot) => void): () => void;
  /** Calls the listener with the current status and after every change of it. */
  subscribeStatus(listener: (status: SyncStatus) => void): () => void;
  /** Adds a new task with the given content and returns its id. */
  createTask(content: Omit<TaskItem, 'id'>): string;
  updateTask(taskId: string, changes: TaskChanges): void;
  deleteTask(taskId: string): void;
  /** Sets the note of a day; blank text removes it. */
  setNote(date: string, text: string): void;
  /**
   * Moves the note of `from` to `to`, with a new text when one is given. A day has one note: when
   * `to` already has one, nothing changes.
   */
  moveNote(from: string, to: string, text?: string): void;
  /** Sets or removes daily values; a day keeps its approval light and promotions. */
  setMetricValues(changes: readonly MetricValueChange[]): void;
  /** Saves the days of an imported forecast: each replaces what its day had, details included. */
  importDailyValues(days: readonly DailyMetric[]): void;
  /** Replaces everything, as when a backup is restored. */
  replacePlan(plan: PlanSnapshot): void;
}
