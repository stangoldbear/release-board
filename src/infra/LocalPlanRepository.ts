import { INITIAL_SYNC } from '../app/PlanRepository';
import type { PlanRepository, SyncState } from '../app/PlanRepository';
import { createBackupFile, parseBackupText, serializeBackup } from '../domain/backup';
import { endPosition } from '../domain/memos';
import type { MemoChanges, MemoContent } from '../domain/memos';
import type { ProjectChanges, ProjectContent } from '../domain/projects';
import {
  addMemo,
  addProject,
  addTask,
  createEmptyPlan,
  importDailyValues,
  moveMemo,
  moveNote,
  removeMemo,
  removeProject,
  removeTask,
  setMetricValues,
  setNote,
  updateMemo,
  updateProject,
  updateTask,
} from '../domain/plan';
import type { MetricValueChange, TaskChanges } from '../domain/plan';
import type { DailyMetric, Memo, PlanSnapshot, TaskItem } from '../domain/types';

export const PLAN_STORAGE_KEY = 'release-board:plan';

interface LocalPlanRepositoryOptions {
  /** Null when the browser does not allow saving data. */
  storage: Storage | null;
  /** The window, to hear about changes made in other tabs. */
  events?: EventTarget;
  now: () => Date;
  createId: () => string;
}

/**
 * Keeps the plan in the browser's local storage, in the backup format, so it is validated in the
 * same way when it is read back. Other tabs of the same browser see every change.
 */
export class LocalPlanRepository implements PlanRepository {
  /** Why the saved plan could not be loaded, when it could not. */
  readonly loadWarning: string | null;

  private plan: PlanSnapshot;
  private readonly listeners = new Set<(plan: PlanSnapshot) => void>();
  private readonly storage: Storage | null;
  private readonly events: EventTarget | undefined;
  private readonly now: () => Date;
  private readonly createId: () => string;

  constructor({ storage, events, now, createId }: LocalPlanRepositoryOptions) {
    this.storage = storage;
    this.events = events;
    this.now = now;
    this.createId = createId;
    const loaded = this.load();
    this.plan = loaded.plan;
    this.loadWarning = loaded.warning;
  }

  /** Local data is saved at once: there is never anything in flight, nor anywhere to sync with. */
  subscribeSync(listener: (state: SyncState) => void): () => void {
    listener(INITIAL_SYNC);
    return () => {};
  }

  subscribe(listener: (plan: PlanSnapshot) => void): () => void {
    if (this.listeners.size === 0) this.events?.addEventListener('storage', this.onStorage);
    this.listeners.add(listener);
    listener(this.plan);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.events?.removeEventListener('storage', this.onStorage);
    };
  }

  createTask(content: Omit<TaskItem, 'id'>): string {
    const id = this.createId();
    this.change(addTask(this.plan, { ...content, id }));
    return id;
  }

  updateTask(taskId: string, changes: TaskChanges): void {
    this.change(updateTask(this.plan, taskId, changes));
  }

  deleteTask(taskId: string): void {
    this.change(removeTask(this.plan, taskId));
  }

  setNote(date: string, text: string): void {
    this.change(setNote(this.plan, date, text));
  }

  moveNote(from: string, to: string, text?: string): void {
    this.change(moveNote(this.plan, from, to, text));
  }

  setMetricValues(changes: readonly MetricValueChange[]): void {
    this.change(setMetricValues(this.plan, changes));
  }

  importDailyValues(days: readonly DailyMetric[]): void {
    this.change(importDailyValues(this.plan, days));
  }

  // One browser, one person: notes have no author, and nothing is private from anyone.
  createMemo(content: MemoContent): string {
    const id = this.createId();
    const memo: Memo = { ...content, id, position: endPosition(this.plan.memos) };
    delete memo.private;
    this.change(addMemo(this.plan, memo));
    return id;
  }

  updateMemo(memoId: string, changes: MemoChanges, beforeId?: string | null): string {
    const kept = { ...changes };
    delete kept.private;
    const changed = updateMemo(this.plan, memoId, kept);
    this.change(beforeId === undefined ? changed : moveMemo(changed, memoId, beforeId));
    return memoId;
  }

  deleteMemo(memoId: string): void {
    this.change(removeMemo(this.plan, memoId));
  }

  moveMemo(memoId: string, beforeId: string | null): void {
    this.change(moveMemo(this.plan, memoId, beforeId));
  }

  createProject(content: ProjectContent): string {
    const id = this.createId();
    this.change(addProject(this.plan, { ...content, id }));
    return id;
  }

  updateProject(projectId: string, changes: ProjectChanges): void {
    this.change(updateProject(this.plan, projectId, changes));
  }

  deleteProject(projectId: string): void {
    this.change(removeProject(this.plan, projectId));
  }

  replacePlan(plan: PlanSnapshot): void {
    this.change(plan);
  }

  private change(next: PlanSnapshot): void {
    this.plan = next;
    try {
      this.storage?.setItem(PLAN_STORAGE_KEY, serializeBackup(createBackupFile(next, this.now())));
    } catch {
      // Storage full or disabled: the plan stays in memory for this session.
    }
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.plan);
  }

  /** Another tab saved the plan: take its version, if it can be read. */
  private readonly onStorage = (event: Event): void => {
    if ((event as StorageEvent).key !== PLAN_STORAGE_KEY) return;
    const stored = this.read();
    if (stored === null) return;
    const result = parseBackupText(stored);
    if (!result.ok) return;
    this.plan = result.plan;
    this.emit();
  };

  private read(): string | null {
    try {
      return this.storage?.getItem(PLAN_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  /** An unreadable saved plan is moved to another key, so that it is neither lost nor overwritten. */
  private load(): { plan: PlanSnapshot; warning: string | null } {
    if (this.storage === null) {
      return { plan: createEmptyPlan(), warning: 'Il browser non consente di salvare i dati.' };
    }
    const stored = this.read();
    if (stored === null) return { plan: createEmptyPlan(), warning: null };

    const result = parseBackupText(stored);
    if (result.ok) return { plan: result.plan, warning: null };

    try {
      this.storage.setItem(`${PLAN_STORAGE_KEY}:non-leggibile:${this.now().getTime()}`, stored);
      this.storage.removeItem(PLAN_STORAGE_KEY);
    } catch {
      // Nothing else to do: the original stays where it was and the warning tells the user.
    }
    return {
      plan: createEmptyPlan(),
      warning: 'I dati salvati non erano leggibili: ne è stata conservata una copia nel browser.',
    };
  }
}
