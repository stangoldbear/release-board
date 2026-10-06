import {
  collection,
  deleteField,
  doc,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
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
import type { HistoryQuery, HistoryReader } from '../../app/HistoryReader';
import { INITIAL_SYNC } from '../../app/PlanRepository';
import type { PlanPart, PlanRepository, SyncState, SyncStatus } from '../../app/PlanRepository';
import { isHistoryAction, isHistoryEntity } from '../../domain/history';
import type { HistoryAction, HistoryEntity, HistoryEntry } from '../../domain/history';
import { applyChanges } from '../../domain/changes';
import { endPosition, memoMoves } from '../../domain/memos';
import type { MemoChanges, MemoContent } from '../../domain/memos';
import type { ProjectChanges, ProjectContent } from '../../domain/projects';
import type { MetricValueChange, TaskChanges } from '../../domain/plan';
import type {
  DailyMetric,
  Lane,
  Memo,
  MemoAuthor,
  PlanSnapshot,
  Project,
  TaskItem,
} from '../../domain/types';
import { formatDateToIT } from '../../utils/dateUtils';
import {
  METRIC_ID,
  buildPlan,
  chunk,
  contentPaths,
  contentWrites,
  importSummary,
  memoContent,
  metricContent,
  projectContent,
  valueContent,
  readLane,
  readMemo,
  readNote,
  readPrivateMemo,
  readProject,
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
  /** The clock of the synchronization time; the real one unless a test needs another. */
  now?: () => Date;
}

/** A Firestore batch holds at most 500 writes; one is the history entry. */
const CHUNK_SIZE = 499;

/** Optional task fields: clearing one removes it from the document. */
const OPTIONAL_TASK_FIELDS = new Set(['assignee', 'description', 'deliverables']);

/**
 * Free notes and projects came with rules of their own. Until the owner publishes them, reading
 * them is refused: the plan opens without them, and the synchronization state says why.
 */
const PART_NAMES: Record<PlanPart, string> = { memos: 'Note libere', projects: 'Progetti' };

/** Where each part lives under the plan, to leave it out of a restore that the rules refuse. */
const PART_PATHS: Record<PlanPart, string> = { memos: 'memos/', projects: 'projects/' };

export function unavailableMessage(parts: readonly PlanPart[]): string {
  const [first = '', ...others] = parts.map((part) => PART_NAMES[part]);
  const names = [first, ...others.map((part) => part.toLowerCase())];
  const list =
    names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1) ?? ''}` : first;
  return `${list} non disponibili: chi gestisce l'istanza deve pubblicare le regole di sicurezza aggiornate.`;
}

type Parts = {
  lanes?: { lane: Lane; position: number }[];
  tasks?: TaskItem[];
  metricIds?: Set<string>;
  values?: DailyMetric[];
  notes?: [string, string][];
  memos?: Memo[];
  privateMemos?: Memo[];
  projects?: Project[];
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
  private readonly now: () => Date;

  private parts: Parts = {};
  private plan: PlanSnapshot | null = null;
  private readonly planListeners = new Set<(plan: PlanSnapshot) => void>();

  private readonly syncListeners = new Set<(state: SyncState) => void>();
  private sync: SyncState = INITIAL_SYNC;
  private pendingCommits = 0;
  private lastError: string | null = null;
  /**
   * Parts of the plan that the published rules do not let anyone read yet, by their name for
   * people, and another failure to read a part; both stay until the page is reloaded.
   */
  private readonly refusedParts = new Set<PlanPart>();
  private unreadable: string | null = null;
  private lastSyncedAt: Date | null = null;

  private readonly stops: (() => void)[] = [];
  private readonly ready: Promise<void>;
  private markReady!: () => void;
  private failReady!: (error: Error) => void;

  constructor({ db, planId, actor, createId, now = () => new Date() }: Options) {
    this.db = db;
    this.planPath = `plans/${planId}`;
    this.actor = actor;
    this.createId = createId;
    this.now = now;
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
    this.listen('memos', (snapshot) => (this.parts.memos = mapDocs(snapshot, readMemo)), {
      part: 'memos',
      fallback: () => (this.parts.memos = []),
    });
    this.listen(
      `members/${actor.githubId}/memos`,
      (snapshot) =>
        (this.parts.privateMemos = mapDocs(snapshot, (id, data) =>
          readPrivateMemo(id, data, this.author),
        )),
      { part: 'memos', fallback: () => (this.parts.privateMemos = []) },
    );
    this.listen('projects', (snapshot) => (this.parts.projects = mapDocs(snapshot, readProject)), {
      part: 'projects',
      fallback: () => (this.parts.projects = []),
    });
    if (typeof window !== 'undefined') {
      const refresh = () => this.updateSync();
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

  subscribeSync(listener: (state: SyncState) => void): () => void {
    this.syncListeners.add(listener);
    listener(this.sync);
    return () => this.syncListeners.delete(listener);
  }

  subscribeHistory(
    { limit, since }: HistoryQuery,
    listener: (entries: HistoryEntry[]) => void,
  ): () => void {
    const history = collection(this.db, `${this.planPath}/history`);
    const entries = since
      ? query(history, where('at', '>=', since), orderBy('at', 'desc'), limitTo(limit))
      : query(history, orderBy('at', 'desc'), limitTo(limit));
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

  moveNote(from: string, to: string, text?: string): void {
    const before = this.plan?.dailyNotes[from];
    const moved = (text ?? before)?.trim();
    if (!moved || from === to || this.plan?.dailyNotes[to] !== undefined) return;
    const batch = writeBatch(this.db);
    // One entry for the whole move: the history reads it from the dates before and after.
    const historyId = this.record(batch, 'note', to, before ? 'update' : 'create', {
      before: before ? { date: from, text: before } : undefined,
      after: { date: to, text: moved },
    });
    batch.set(this.ref(`notes/${to}`), { text: moved, ...this.audit(historyId) });
    if (before !== undefined) batch.delete(this.ref(`notes/${from}`));
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
        // Merged: the day keeps the approval light and promotions of an imported forecast.
        else batch.set(ref, { value, ...this.audit(historyId) }, { merge: true });
      }
      this.commit(batch);
    }
  }

  importDailyValues(days: readonly DailyMetric[]): void {
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted.at(-1);
    if (!first || !last) return;
    const what = `${sorted.length} ${sorted.length === 1 ? 'giorno' : 'giorni'} di fatturato previsto, dal ${formatDateToIT(first.date)} al ${formatDateToIT(last.date)}`;
    const groups = chunk(sorted, CHUNK_SIZE - 1);
    groups.forEach((group, index) => {
      const batch = writeBatch(this.db);
      const part = groups.length > 1 ? ` (parte ${index + 1} di ${groups.length})` : '';
      const historyId = this.record(batch, 'metric', METRIC_ID, 'import', {
        summary: `${what}${part}`,
      });
      if (index === 0 && !this.parts.metricIds?.has(METRIC_ID)) {
        batch.set(this.ref(`metrics/${METRIC_ID}`), {
          ...metricContent(),
          ...this.audit(historyId),
        });
      }
      // Not merged: each day takes exactly what the forecast says, details included.
      for (const day of group) {
        batch.set(this.ref(`metrics/${METRIC_ID}/values/${day.date}`), {
          ...valueContent(day),
          ...this.audit(historyId),
        });
      }
      this.commit(batch);
    });
  }

  createMemo(content: MemoContent): string {
    const id = this.createId();
    if (this.refusedParts.has('memos')) return id;
    const memo = { ...content, position: endPosition(this.plan?.memos ?? []), author: this.author };
    const batch = writeBatch(this.db);
    if (memo.private) {
      batch.set(this.privateRef(id), memoContent(memo));
    } else {
      const data = memoContent(memo);
      const historyId = this.record(batch, 'memo', id, 'create', { after: data });
      batch.set(this.ref(`memos/${id}`), { ...data, ...this.audit(historyId) });
    }
    this.commit(batch);
    return id;
  }

  updateMemo(memoId: string, changes: MemoChanges, beforeId?: string | null): string {
    const memos = this.plan?.memos ?? [];
    const current = memos.find((memo) => memo.id === memoId);
    if (!current || this.refusedParts.has('memos')) return memoId;
    const moves =
      beforeId === undefined ? new Map<string, number>() : memoMoves(memos, memoId, beforeId);
    const position = moves.get(memoId);
    const next = {
      ...applyChanges<Memo>(current, changes),
      position: position ?? current.position,
    };
    const visibility = Boolean(next.private) !== Boolean(current.private);
    // Only the author makes a note private, or shared again.
    if (visibility && current.author?.id !== this.author.id) return memoId;
    // On the other side of the wall the note takes a new id. An old backup or the sample can bring
    // back a shared note with the old one, and no private note ever has it; a window left open on
    // the note elsewhere finds it gone, and saves nothing on the wrong side.
    const id = visibility ? this.createId() : memoId;

    const update: DocumentData = {};
    for (const field of Object.keys(changes) as (keyof MemoChanges)[]) {
      const value = changes[field];
      if (field !== 'private') update[field] = value === null ? deleteField() : value;
    }
    if (position !== undefined) update.position = position;
    const fields = Object.keys(update) as (keyof Memo)[];
    if (!visibility && fields.length === 0 && moves.size === 0) return memoId;

    const batch = writeBatch(this.db);
    let historyId: string | null = null;
    if (visibility && next.private) {
      // The others see the note leave, under the title they knew.
      historyId = this.record(batch, 'memo', memoId, 'update', {
        before: { private: false },
        after: { title: current.title, private: true },
      });
      batch.delete(this.ref(`memos/${memoId}`));
      batch.set(this.privateRef(id), memoContent(next));
    } else if (visibility) {
      // The others see it arrive with all its content.
      const data = memoContent(next);
      historyId = this.record(batch, 'memo', id, 'update', {
        before: { private: true },
        after: { ...data, private: false },
      });
      batch.delete(this.privateRef(memoId));
      batch.set(this.ref(`memos/${id}`), { ...data, ...this.audit(historyId) });
    } else if (current.private && fields.length > 0) {
      batch.update(this.privateRef(memoId), update);
    } else if (fields.length > 0) {
      historyId = this.record(batch, 'memo', memoId, 'update', {
        before: defined(Object.fromEntries(fields.map((field) => [field, current[field]]))),
        // The title is kept so that the history can name the note.
        after: defined({
          title: current.title,
          ...Object.fromEntries(fields.map((field) => [field, next[field]])),
        }),
      });
      batch.update(this.ref(`memos/${memoId}`), { ...update, ...this.audit(historyId) });
    }

    // The other notes change place only when the strip is numbered again.
    for (const [other, renumbered] of moves) {
      if (other === memoId) continue;
      if (memos.find((memo) => memo.id === other)?.private) {
        batch.update(this.privateRef(other), { position: renumbered });
      } else {
        // A private note is never named, not even by its id: the others read only that the order
        // changed.
        historyId ??= current.private
          ? this.record(batch, 'memo', 'strip', 'update', { summary: "l'ordine delle note libere" })
          : this.record(batch, 'memo', memoId, 'update', {
              before: { position: current.position },
              after: { title: current.title, position: next.position },
            });
        batch.update(this.ref(`memos/${other}`), {
          position: renumbered,
          ...this.audit(historyId),
        });
      }
    }
    this.commit(batch);
    return id;
  }

  deleteMemo(memoId: string): void {
    const before = this.plan?.memos.find((memo) => memo.id === memoId);
    // Unknown, it could be a private note on its way: nothing is written about it.
    if (!before) return;
    const batch = writeBatch(this.db);
    if (before.private) {
      batch.delete(this.privateRef(memoId));
    } else {
      this.record(batch, 'memo', memoId, 'delete', { before: memoContent(before) });
      batch.delete(this.ref(`memos/${memoId}`));
    }
    this.commit(batch);
  }

  moveMemo(memoId: string, beforeId: string | null): void {
    this.updateMemo(memoId, {}, beforeId);
  }

  createProject(content: ProjectContent): string {
    const id = this.createId();
    // The published rules do not know projects yet: the write would fail, and the plan says why.
    if (this.refusedParts.has('projects')) return id;
    const data = projectContent(content);
    const batch = writeBatch(this.db);
    const historyId = this.record(batch, 'project', id, 'create', { after: data });
    batch.set(this.ref(`projects/${id}`), { ...data, ...this.audit(historyId) });
    this.commit(batch);
    return id;
  }

  updateProject(projectId: string, changes: ProjectChanges): void {
    const current = this.plan?.projects.find((project) => project.id === projectId);
    const fields = Object.keys(changes) as (keyof ProjectChanges)[];
    // A project deleted meanwhile, by someone else, stays deleted.
    if (!current || fields.length === 0 || this.refusedParts.has('projects')) return;
    const next = applyChanges<Project>(current, changes);
    const update: DocumentData = {};
    for (const field of fields) {
      const value = changes[field];
      update[field] = value === null ? deleteField() : value;
    }
    const batch = writeBatch(this.db);
    const historyId = this.record(batch, 'project', projectId, 'update', {
      before: defined(Object.fromEntries(fields.map((field) => [field, current[field]]))),
      // The title is kept so that the history can name the project.
      after: defined({
        title: current.title,
        ...Object.fromEntries(fields.map((field) => [field, next[field]])),
      }),
    });
    batch.update(this.ref(`projects/${projectId}`), { ...update, ...this.audit(historyId) });
    this.commit(batch);
  }

  deleteProject(projectId: string): void {
    const before = this.plan?.projects.find((project) => project.id === projectId);
    // Already deleted by someone else: nothing to delete, nor to record.
    if (!before) return;
    const batch = writeBatch(this.db);
    this.record(batch, 'project', projectId, 'delete', { before: projectContent(before) });
    batch.delete(this.ref(`projects/${projectId}`));
    this.commit(batch);
  }

  replacePlan(plan: PlanSnapshot): void {
    // Authors never change: a note already in the plan keeps its own, and one without an author,
    // as in the local mode and the sample, becomes the importer's. Private notes are not part of
    // the plan: contentWrites leaves them out, and a restore keeps them.
    const authors = new Map(
      (this.plan?.memos ?? []).flatMap((memo) =>
        memo.private || !memo.author ? [] : [[memo.id, memo.author] as const],
      ),
    );
    const imported = {
      ...plan,
      memos: plan.memos.map((memo) => ({
        ...memo,
        author: authors.get(memo.id) ?? memo.author ?? this.author,
      })),
    };
    // A part the published rules refuse would make every batch fail: the rest goes in without it.
    const allowed = (path: string) =>
      [...this.refusedParts].every((part) => !path.startsWith(PART_PATHS[part]));
    const writes = contentWrites(imported).filter((write) => allowed(write.path));
    const keep = new Set(writes.map((write) => write.path));
    const deletions = this.plan
      ? contentPaths(this.plan).filter((path) => allowed(path) && !keep.has(path))
      : [];
    const operations = [
      ...deletions.map((path) => ({ path, data: null })),
      ...writes.map((write) => ({ path: write.path, data: write.data })),
    ];
    const groups = chunk(operations, CHUNK_SIZE);
    groups.forEach((group, index) => {
      const batch = writeBatch(this.db);
      const part = groups.length > 1 ? ` (parte ${index + 1} di ${groups.length})` : '';
      const historyId = this.record(batch, 'plan', 'main', 'import', {
        summary: `${importSummary(imported)}${part}`,
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

  /** A private note of the signed-in member. */
  private privateRef(memoId: string) {
    return this.ref(`members/${this.actor.githubId}/memos/${memoId}`);
  }

  /** The signed-in member, as the author of the notes they write. */
  private get author(): MemoAuthor {
    return { id: this.actor.githubId, login: this.actor.login };
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
    this.updateSync();
    batch.commit().then(
      () => {
        this.lastError = null;
        this.lastSyncedAt = this.now();
        this.pendingCommits -= 1;
        this.updateSync();
      },
      (error: unknown) => {
        this.lastError = describeFirestoreError(error);
        this.pendingCommits -= 1;
        this.updateSync();
      },
    );
  }

  private updateSync(): void {
    // Node has a navigator without onLine: only an explicit false means offline.
    const online = typeof navigator === 'undefined' || navigator.onLine !== false;
    const unavailable =
      this.refusedParts.size > 0 ? unavailableMessage([...this.refusedParts]) : this.unreadable;
    const error = this.lastError ?? unavailable;
    const status: SyncStatus = error
      ? 'error'
      : this.pendingCommits > 0
        ? online
          ? 'saving'
          : 'offline'
        : 'synced';
    const missing = [...this.refusedParts];
    const current = this.sync;
    if (
      current.status === status &&
      current.error === error &&
      current.lastSyncedAt?.getTime() === this.lastSyncedAt?.getTime() &&
      current.missing.join() === missing.join()
    )
      return;
    this.sync = { status, lastSyncedAt: this.lastSyncedAt, error, missing };
    for (const listener of this.syncListeners) listener(this.sync);
  }

  /**
   * Keeps a part of the plan up to date. A part with a fallback is not essential: when it cannot
   * be read, the plan opens without it, and its name says what is missing.
   */
  private listen(
    path: string,
    apply: (snapshot: QuerySnapshot) => void,
    optional?: { part: PlanPart; fallback: () => void },
  ): void {
    let first = true;
    const stop = onSnapshot(
      collection(this.db, `${this.planPath}/${path}`),
      // Changes of metadata too: they tell when the server has confirmed the cached copy.
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.metadata.fromCache) {
          this.lastSyncedAt = this.now();
          this.updateSync();
        }
        // A change of metadata alone leaves the plan as it is.
        if (!first && snapshot.docChanges().length === 0) return;
        first = false;
        apply(snapshot);
        this.emitIfComplete();
      },
      (error: FirestoreError) => {
        if (optional) {
          if (error.code === 'permission-denied') this.refusedParts.add(optional.part);
          else this.unreadable = describeFirestoreError(error);
          optional.fallback();
          this.updateSync();
          this.emitIfComplete();
          return;
        }
        this.lastError = describeFirestoreError(error);
        this.updateSync();
        this.failReady(new Error(this.lastError));
      },
    );
    this.stops.push(stop);
  }

  private emitIfComplete(): void {
    const { lanes, tasks, metricIds, values, notes, memos, privateMemos, projects } = this.parts;
    if (!lanes || !tasks || !metricIds || !values || !notes || !memos || !privateMemos || !projects)
      return;
    // Should a shared note ever have the id of a private one, the private note wins: what the
    // author writes there never reaches the shared one.
    const privateIds = new Set(privateMemos.map((memo) => memo.id));
    const shared = memos.filter((memo) => !privateIds.has(memo.id));
    this.plan = buildPlan({
      lanes,
      tasks,
      values,
      notes,
      memos: [...shared, ...privateMemos],
      projects,
    });
    this.markReady();
    for (const listener of this.planListeners) listener(this.plan);
  }
}

function readHistoryEntry(id: string, data: DocumentData): HistoryEntry | null {
  const { entity, entityId, action, actor, at } = data;
  if (!isHistoryEntity(entity) || typeof entityId !== 'string' || !isHistoryAction(action))
    return null;
  if (typeof actor !== 'object' || actor === null) return null;
  const who = actor as Record<string, unknown>;
  const entry: HistoryEntry = {
    id,
    entity,
    entityId,
    action,
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
