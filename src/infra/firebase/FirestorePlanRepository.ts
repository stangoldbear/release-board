import {
  collection,
  deleteField,
  doc,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import type {
  DocumentData,
  Firestore,
  FirestoreError,
  QuerySnapshot,
  Timestamp,
  WriteBatch,
} from 'firebase/firestore';
import type { HistoryReader } from '../../app/HistoryReader';
import type { PlanRepository, SyncStatus } from '../../app/PlanRepository';
import type { HistoryAction, HistoryEntity, HistoryEntry } from '../../domain/history';
import type { MetricValueChange, TaskChanges } from '../../domain/plan';
import type { DailyMetric, Lane, PlanSnapshot, TaskItem } from '../../domain/types';
import {
  METRIC_ID,
  buildPlan,
  chunk,
  contentPaths,
  contentWrites,
  importSummary,
  metricContent,
  readLane,
  readNote,
  readTask,
  readValue,
  taskContent,
} from './planDocs';

/** The signed-in member, as recorded in every change. */
export interface Actor {
  uid: string;
  githubId: string;
  login: string;
}

interface Options {
  db: Firestore;
  planId: string;
  actor: Actor;
  createId: () => string;
}

/** A Firestore batch holds at most 500 writes; one is the history entry. */
const CHUNK_SIZE = 499;

/** Optional task fields: clearing one removes it from the document. */
const OPTIONAL_TASK_FIELDS = new Set(['assignee', 'description', 'deliverables']);

type Parts = {
  lanes?: { lane: Lane; position: number }[];
  tasks?: TaskItem[];
  metricIds?: Set<string>;
  values?: DailyMetric[];
  notes?: [string, string][];
};

function mapDocs<T>(
  snapshot: QuerySnapshot,
  read: (id: string, data: DocumentData) => T | null,
): T[] {
  const items: T[] = [];
  for (const document of snapshot.docs) {
    const item = read(document.id, document.data());
    if (item !== null) items.push(item);
  }
  return items;
}

/** A map without the keys whose value is undefined, which Firestore refuses. */
function defined(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

/**
 * The plan in Firestore, shared with the other members in real time. Every change is one batch
 * with the entity writes and a history entry, as the security rules require; the local cache of
 * the SDK applies it at once and sends it when the network allows.
 */
export class FirestorePlanRepository implements PlanRepository, HistoryReader {
  private readonly db: Firestore;
  private readonly planPath: string;
  private readonly actor: Actor;
  private readonly createId: () => string;

  private parts: Parts = {};
  private plan: PlanSnapshot | null = null;
  private readonly planListeners = new Set<(plan: PlanSnapshot) => void>();

  private readonly statusListeners = new Set<(status: SyncStatus) => void>();
  private status: SyncStatus = 'synced';
  private pendingCommits = 0;
  private lastError: string | null = null;

  private readonly stops: (() => void)[] = [];
  private readonly ready: Promise<void>;
  private markReady!: () => void;
  private failReady!: (error: Error) => void;

  constructor({ db, planId, actor, createId }: Options) {
    this.db = db;
    this.planPath = `plans/${planId}`;
    this.actor = actor;
    this.createId = createId;
    this.ready = new Promise((resolve, reject) => {
      this.markReady = resolve;
      this.failReady = reject;
    });
    this.listen('lanes', (snapshot) => (this.parts.lanes = mapDocs(snapshot, readLane)));
    this.listen('tasks', (snapshot) => (this.parts.tasks = mapDocs(snapshot, readTask)));
    this.listen(
      'metrics',
      (snapshot) => (this.parts.metricIds = new Set(snapshot.docs.map((item) => item.id))),
    );
    this.listen(
      `metrics/${METRIC_ID}/values`,
      (snapshot) => (this.parts.values = mapDocs(snapshot, readValue)),
    );
    this.listen('notes', (snapshot) => (this.parts.notes = mapDocs(snapshot, readNote)));
    if (typeof window !== 'undefined') {
      const refresh = () => this.updateStatus();
      window.addEventListener('online', refresh);
      window.addEventListener('offline', refresh);
      this.stops.push(() => {
        window.removeEventListener('online', refresh);
        window.removeEventListener('offline', refresh);
      });
    }
  }

  /** Resolves once the whole plan has arrived; rejects when it cannot be read. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  /** Stops listening. The repository is not usable afterwards. */
  dispose(): void {
    for (const stop of this.stops) stop();
    this.stops.length = 0;
  }

  subscribe(listener: (plan: PlanSnapshot) => void): () => void {
    this.planListeners.add(listener);
    if (this.plan) listener(this.plan);
    return () => this.planListeners.delete(listener);
  }

  subscribeStatus(listener: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  /** Why the status is "error", if it is. */
  get error(): string | null {
    return this.lastError;
  }

  subscribeHistory(limit: number, listener: (entries: HistoryEntry[]) => void): () => void {
    const entries = query(
      collection(this.db, `${this.planPath}/history`),
      orderBy('at', 'desc'),
      limitTo(limit),
    );
    return onSnapshot(entries, (snapshot) => listener(mapDocs(snapshot, readHistoryEntry)));
  }

  createTask(content: Omit<TaskItem, 'id'>): string {
    const id = this.createId();
    const batch = writeBatch(this.db);
    const historyId = this.record(batch, 'task', id, 'create', { after: taskContent(content) });
    batch.set(this.ref(`tasks/${id}`), { ...taskContent(content), ...this.audit(historyId) });
    this.commit(batch);
    return id;
  }

  updateTask(taskId: string, changes: TaskChanges): void {
    const before = this.plan?.tasks.find((task) => task.id === taskId);
    const fields = Object.keys(changes) as (keyof TaskChanges)[];
    if (fields.length === 0) return;
    const update: DocumentData = {};
    for (const field of fields) {
      const value = changes[field];
      const cleared =
        value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
      update[field] = cleared && OPTIONAL_TASK_FIELDS.has(field) ? deleteField() : value;
    }
    const batch = writeBatch(this.db);
    const historyId = this.record(batch, 'task', taskId, 'update', {
      before: before ? defined(Object.fromEntries(fields.map((f) => [f, before[f]]))) : undefined,
      // The title is kept so that the history can name the task.
      after: defined({ title: before?.title, ...changes }),
    });
    batch.update(this.ref(`tasks/${taskId}`), { ...update, ...this.audit(historyId) });
    this.commit(batch);
  }

  deleteTask(taskId: string): void {
    const before = this.plan?.tasks.find((task) => task.id === taskId);
    const batch = writeBatch(this.db);
    this.record(batch, 'task', taskId, 'delete', {
      before: before ? taskContent(before) : undefined,
    });
    batch.delete(this.ref(`tasks/${taskId}`));
    this.commit(batch);
  }

  setNote(date: string, text: string): void {
    const trimmed = text.trim();
    const before = this.plan?.dailyNotes[date];
    if (trimmed === (before ?? '')) return;
    const batch = writeBatch(this.db);
    const path = `notes/${date}`;
    if (trimmed === '') {
      this.record(batch, 'note', date, 'delete', { before: { text: before } });
      batch.delete(this.ref(path));
    } else {
      const historyId = this.record(batch, 'note', date, before ? 'update' : 'create', {
        before: before ? { text: before } : undefined,
        after: { text: trimmed },
      });
      batch.set(this.ref(path), { text: trimmed, ...this.audit(historyId) });
    }
    this.commit(batch);
  }

  setMetricValues(changes: readonly MetricValueChange[]): void {
    const current = new Map(this.plan?.metrics.map((metric) => [metric.date, metric.value]));
    const effective = changes.filter(({ date, value }) => (current.get(date) ?? null) !== value);
    if (effective.length === 0) return;
    for (const group of chunk(effective, CHUNK_SIZE - 1)) {
      const batch = writeBatch(this.db);
      const historyId = this.record(batch, 'metric', METRIC_ID, 'update', {
        summary: `${group.length} ${group.length === 1 ? 'valore giornaliero' : 'valori giornalieri'}`,
        after: Object.fromEntries(group.map(({ date, value }) => [date, value])),
      });
      if (!this.parts.metricIds?.has(METRIC_ID)) {
        batch.set(this.ref(`metrics/${METRIC_ID}`), {
          ...metricContent(),
          ...this.audit(historyId),
        });
      }
      for (const { date, value } of group) {
        const ref = this.ref(`metrics/${METRIC_ID}/values/${date}`);
        if (value === null) batch.delete(ref);
        else batch.set(ref, { value, ...this.audit(historyId) });
      }
      this.commit(batch);
    }
  }

  replacePlan(plan: PlanSnapshot): void {
    const writes = contentWrites(plan);
    const keep = new Set(writes.map((write) => write.path));
    const deletions = this.plan ? contentPaths(this.plan).filter((path) => !keep.has(path)) : [];
    const operations = [
      ...deletions.map((path) => ({ path, data: null })),
      ...writes.map((write) => ({ path: write.path, data: write.data })),
    ];
    const groups = chunk(operations, CHUNK_SIZE);
    groups.forEach((group, index) => {
      const batch = writeBatch(this.db);
      const part = groups.length > 1 ? ` (parte ${index + 1} di ${groups.length})` : '';
      const historyId = this.record(batch, 'plan', 'main', 'import', {
        summary: `${importSummary(plan)}${part}`,
      });
      for (const operation of group) {
        if (operation.data === null) batch.delete(this.ref(operation.path));
        else batch.set(this.ref(operation.path), { ...operation.data, ...this.audit(historyId) });
      }
      this.commit(batch);
    });
  }

  private ref(path: string) {
    return doc(this.db, `${this.planPath}/${path}`);
  }

  private audit(historyId: string): DocumentData {
    return { updatedAt: serverTimestamp(), updatedBy: this.actor.uid, lastHistoryId: historyId };
  }

  /** Adds the history entry of a change to the batch and returns its id. */
  private record(
    batch: WriteBatch,
    entity: HistoryEntity,
    entityId: string,
    action: HistoryAction,
    details: { before?: DocumentData; after?: DocumentData; summary?: string },
  ): string {
    const id = this.createId();
    batch.set(this.ref(`history/${id}`), {
      entity,
      entityId,
      action,
      actor: { ...this.actor },
      at: serverTimestamp(),
      ...defined(details),
    });
    return id;
  }

  private commit(batch: WriteBatch): void {
    this.pendingCommits += 1;
    this.updateStatus();
    batch.commit().then(
      () => {
        this.lastError = null;
        this.pendingCommits -= 1;
        this.updateStatus();
      },
      (error: unknown) => {
        this.lastError = describeFirestoreError(error);
        this.pendingCommits -= 1;
        this.updateStatus();
      },
    );
  }

  private updateStatus(): void {
    // Node has a navigator without onLine: only an explicit false means offline.
    const online = typeof navigator === 'undefined' || navigator.onLine !== false;
    const next: SyncStatus = this.lastError
      ? 'error'
      : this.pendingCommits > 0
        ? online
          ? 'saving'
          : 'offline'
        : 'synced';
    if (next === this.status) return;
    this.status = next;
    for (const listener of this.statusListeners) listener(next);
  }

  private listen(path: string, apply: (snapshot: QuerySnapshot) => void): void {
    const stop = onSnapshot(
      collection(this.db, `${this.planPath}/${path}`),
      (snapshot) => {
        apply(snapshot);
        this.emitIfComplete();
      },
      (error: FirestoreError) => {
        this.lastError = describeFirestoreError(error);
        this.updateStatus();
        this.failReady(new Error(this.lastError));
      },
    );
    this.stops.push(stop);
  }

  private emitIfComplete(): void {
    const { lanes, tasks, metricIds, values, notes } = this.parts;
    if (!lanes || !tasks || !metricIds || !values || !notes) return;
    this.plan = buildPlan({ lanes, tasks, values, notes });
    this.markReady();
    for (const listener of this.planListeners) listener(this.plan);
  }
}

function readHistoryEntry(id: string, data: DocumentData): HistoryEntry | null {
  const { entity, entityId, action, actor, at } = data;
  if (typeof entity !== 'string' || typeof entityId !== 'string' || typeof action !== 'string')
    return null;
  if (typeof actor !== 'object' || actor === null) return null;
  const who = actor as Record<string, unknown>;
  const entry: HistoryEntry = {
    id,
    entity: entity as HistoryEntity,
    entityId,
    action: action as HistoryAction,
    actor: {
      uid: typeof who.uid === 'string' ? who.uid : '',
      githubId: typeof who.githubId === 'string' ? who.githubId : '',
      login: typeof who.login === 'string' ? who.login : '',
    },
    at: at && typeof (at as Timestamp).toDate === 'function' ? (at as Timestamp).toDate() : null,
  };
  if (typeof data.before === 'object' && data.before !== null)
    entry.before = data.before as Record<string, unknown>;
  if (typeof data.after === 'object' && data.after !== null)
    entry.after = data.after as Record<string, unknown>;
  if (typeof data.summary === 'string') entry.summary = data.summary;
  return entry;
}

/** A sentence for the user about a failed Firestore operation. */
export function describeFirestoreError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'permission-denied':
      return 'Modifica rifiutata: non fai più parte del piano o i dati non sono validi.';
    case 'unavailable':
      return 'Il servizio non è raggiungibile: la modifica sarà inviata appena torna la rete.';
    case 'resource-exhausted':
      return 'Quota giornaliera del database esaurita: riprova domani.';
    default:
      return `Salvataggio non riuscito${code ? ` (${code})` : ''}.`;
  }
}
