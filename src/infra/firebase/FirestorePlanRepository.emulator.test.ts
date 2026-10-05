import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, getDocs } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { SyncStatus } from '../../app/PlanRepository';
import { describeHistoryEntry } from '../../domain/history';
import type { HistoryEntry } from '../../domain/history';
import { createEmptyPlan } from '../../domain/plan';
import { buildSamplePlan } from '../../domain/sample';
import type { PlanSnapshot, TaskItem } from '../../domain/types';
import { FirestoreMembersRepository } from './FirestoreMembersRepository';
import { FirestorePlanRepository } from './FirestorePlanRepository';
import {
  EDITOR,
  OWNER,
  STRANGER,
  clientAs,
  deleteClients,
  setupRulesEnvironment,
} from './emulatorTest';
import type { Identity } from './emulatorTest';
import { PLAN_ID } from './planDocs';
import { checkAccess, createPlan } from './setup';

let env: RulesTestEnvironment;
let ownerDb: Firestore;
let editorDb: Firestore;
let nextId = 0;
const createId = () => `id-${++nextId}`;

const sample = buildSamplePlan(2026, 8);
const repositories: FirestorePlanRepository[] = [];

function actorOf(identity: Identity) {
  return { uid: identity.uid, githubId: identity.githubId, login: identity.login };
}

function repositoryFor(db: Firestore, identity: Identity) {
  const repository = new FirestorePlanRepository({
    db,
    planId: PLAN_ID,
    actor: actorOf(identity),
    createId,
  });
  repositories.push(repository);
  return repository;
}

/** True once every part of the plan matches the sample. */
function matchesSample(plan: PlanSnapshot): boolean {
  return (
    plan.lanes.length === sample.lanes.length &&
    plan.tasks.length === sample.tasks.length &&
    plan.metrics.length === sample.metrics.length &&
    Object.keys(plan.dailyNotes).length === Object.keys(sample.dailyNotes).length
  );
}

/** Resolves with the first plan the repository delivers that satisfies the condition. */
function planWhere(
  repository: FirestorePlanRepository,
  condition: (plan: PlanSnapshot) => boolean,
): Promise<PlanSnapshot> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The plan never matched.')), 10_000);
    // The listener may run synchronously, before `subscribe` has returned the stop function.
    const subscription: { stop?: () => void } = {};
    let settled = false;
    subscription.stop = repository.subscribe((plan) => {
      if (settled || !condition(plan)) return;
      settled = true;
      clearTimeout(timer);
      subscription.stop?.();
      resolve(plan);
    });
    if (settled) subscription.stop();
  });
}

/** Resolves once nothing is left to send, or once sending has failed. */
function whenSynced(repository: FirestorePlanRepository): Promise<void> {
  return new Promise((resolve) => {
    const subscription: { stop?: () => void } = {};
    let done = false;
    subscription.stop = repository.subscribeStatus((status) => {
      if ((status !== 'synced' && status !== 'error') || done) return;
      done = true;
      subscription.stop?.();
      resolve();
    });
    if (done) subscription.stop();
  });
}

function statusesUntilSynced(repository: FirestorePlanRepository): Promise<SyncStatus[]> {
  return new Promise((resolve) => {
    const seen: SyncStatus[] = [];
    const stop = repository.subscribeStatus((status) => {
      seen.push(status);
      if (status === 'synced' && seen.length > 1) {
        stop();
        resolve(seen);
      }
    });
  });
}

/** The plan with the owner and an editor, as members would find it. */
async function bootstrap(): Promise<FirestorePlanRepository> {
  await createPlan(ownerDb, PLAN_ID, actorOf(OWNER), 'Piano rilasci', '', createId);
  await env.withSecurityRulesDisabled((context) =>
    context.firestore().doc(`plans/${PLAN_ID}/members/${EDITOR.githubId}`).set({
      login: EDITOR.login,
      avatarUrl: '',
      role: 'editor',
      addedBy: OWNER.uid,
      addedAt: new Date(),
    }),
  );
  const repository = repositoryFor(ownerDb, OWNER);
  await repository.whenReady();
  return repository;
}

beforeAll(async () => {
  env = await setupRulesEnvironment();
});

// Fresh clients for every test: the cache of a client would otherwise outlive clearFirestore.
beforeEach(async () => {
  await env.clearFirestore();
  ownerDb = clientAs(OWNER);
  editorDb = clientAs(EDITOR);
});

afterEach(async () => {
  // Writes still in flight would land after the next clearFirestore.
  await Promise.all(repositories.map(whenSynced));
  for (const repository of repositories.splice(0)) repository.dispose();
  await deleteClients();
});

afterAll(() => env.cleanup());

describe('access and setup', () => {
  it('tells a new instance, a stranger and a member apart', async () => {
    await expect(checkAccess(ownerDb, PLAN_ID, OWNER.githubId)).resolves.toEqual({
      kind: 'no-plan',
    });
    await createPlan(
      ownerDb,
      PLAN_ID,
      actorOf(OWNER),
      ' Piano rilasci ',
      'https://example.com/a.png',
      createId,
    );
    await expect(checkAccess(ownerDb, PLAN_ID, OWNER.githubId)).resolves.toEqual({
      kind: 'member',
      planName: 'Piano rilasci',
      role: 'owner',
      login: OWNER.login,
      avatarUrl: 'https://example.com/a.png',
    });
    await expect(checkAccess(clientAs(STRANGER), PLAN_ID, STRANGER.githubId)).resolves.toEqual({
      kind: 'not-member',
      planName: 'Piano rilasci',
    });
  });

  it('starts from an empty plan and imports the initial content in batches', async () => {
    const repository = await bootstrap();
    const initial = await planWhere(repository, () => true);
    expect(initial).toEqual({ lanes: [], tasks: [], metrics: [], dailyNotes: {} });

    repository.replacePlan(createEmptyPlan());
    const empty = await planWhere(repository, (plan) => plan.lanes.length === 3);
    expect(empty.lanes.map((lane) => lane.name)).toEqual(['Frontend', 'Backend', 'Contenuti']);

    repository.replacePlan(sample);
    const imported = await planWhere(repository, matchesSample);
    expect(imported.lanes).toEqual(sample.lanes);
    expect(imported.metrics).toEqual(sample.metrics);
    expect(imported.dailyNotes).toEqual(sample.dailyNotes);
    expect(new Set(imported.tasks.map((task) => task.id))).toEqual(
      new Set(sample.tasks.map((task) => task.id)),
    );
  });
});

describe('changes', () => {
  let repository: FirestorePlanRepository;

  beforeEach(async () => {
    repository = await bootstrap();
    repository.replacePlan(sample);
    await planWhere(repository, matchesSample);
    await whenSynced(repository);
  });

  it('creates, updates and deletes tasks, and another member sees it live', async () => {
    const other = repositoryFor(editorDb, EDITOR);
    await other.whenReady();

    const id = repository.createTask({
      laneId: 'lane-1',
      title: 'Nuova attività',
      startDate: '2026-09-20',
      endDate: '2026-09-21',
      colorId: 'green',
      borderStyle: 'solid',
      status: 'planned',
      assignee: '',
      deliverables: [],
    });
    const created = await planWhere(other, (plan) => plan.tasks.some((task) => task.id === id));
    const task = created.tasks.find((item) => item.id === id) as TaskItem;
    expect(task).toEqual({
      id,
      laneId: 'lane-1',
      title: 'Nuova attività',
      startDate: '2026-09-20',
      endDate: '2026-09-21',
      colorId: 'green',
      borderStyle: 'solid',
      status: 'planned',
    });

    other.updateTask(id, { title: 'Rinominata', assignee: 'Giulia', endDate: '2026-09-25' });
    const updated = await planWhere(repository, (plan) =>
      plan.tasks.some((item) => item.id === id && item.title === 'Rinominata'),
    );
    expect(updated.tasks.find((item) => item.id === id)).toMatchObject({
      assignee: 'Giulia',
      endDate: '2026-09-25',
      startDate: '2026-09-20',
    });

    repository.updateTask(id, { assignee: '' });
    const cleared = await planWhere(other, (plan) =>
      plan.tasks.some((item) => item.id === id && item.assignee === undefined),
    );
    expect(cleared.tasks.find((item) => item.id === id)?.assignee).toBeUndefined();

    repository.deleteTask(id);
    await planWhere(other, (plan) => !plan.tasks.some((item) => item.id === id));
  });

  it('sets notes and values, and removes them when cleared', async () => {
    repository.setNote('2026-09-03', '  Kickoff  ');
    const withNote = await planWhere(
      repository,
      (plan) => plan.dailyNotes['2026-09-03'] === 'Kickoff',
    );
    expect(Object.keys(withNote.dailyNotes)).toHaveLength(3);

    repository.setNote('2026-09-03', '');
    await planWhere(repository, (plan) => !('2026-09-03' in plan.dailyNotes));

    repository.setMetricValues([
      { date: '2026-09-05', value: 1250.5 },
      { date: '2026-09-01', value: null },
    ]);
    const values = await planWhere(
      repository,
      (plan) =>
        plan.metrics.some((metric) => metric.date === '2026-09-05') &&
        !plan.metrics.some((metric) => metric.date === '2026-09-01'),
    );
    expect(values.metrics.find((metric) => metric.date === '2026-09-05')?.value).toBe(1250.5);
    expect(values.metrics.length).toBe(sample.metrics.length);
  });

  it('imports forecast days, keeps their details on a manual edit, replaces them on a new import', async () => {
    const dayOf = (plan: PlanSnapshot, date: string) =>
      plan.metrics.find((metric) => metric.date === date);
    repository.importDailyValues([
      { date: '2026-10-06', value: 2100000, approval: 'green' },
      { date: '2026-10-05', value: 3210123.45, approval: 'red', promoEu: 'Saldi' },
    ]);
    const imported = await planWhere(repository, (plan) => dayOf(plan, '2026-10-06') !== undefined);
    expect(dayOf(imported, '2026-10-05')).toEqual({
      date: '2026-10-05',
      value: 3210123.45,
      approval: 'red',
      promoEu: 'Saldi',
    });

    repository.setMetricValues([{ date: '2026-10-05', value: 1 }]);
    const edited = await planWhere(repository, (plan) => dayOf(plan, '2026-10-05')?.value === 1);
    expect(dayOf(edited, '2026-10-05')).toMatchObject({ approval: 'red', promoEu: 'Saldi' });

    repository.importDailyValues([{ date: '2026-10-05', value: 2 }]);
    const replaced = await planWhere(repository, (plan) => dayOf(plan, '2026-10-05')?.value === 2);
    expect(dayOf(replaced, '2026-10-05')).toEqual({ date: '2026-10-05', value: 2 });

    await whenSynced(repository);
    const entries = await new Promise<HistoryEntry[]>((resolve) => {
      const stop = repository.subscribeHistory({ limit: 50 }, (items) => {
        if (items.length >= 5 && items.every((item) => item.at !== null)) {
          stop();
          resolve(items);
        }
      });
    });
    expect(describeHistoryEntry(entries.at(-3) as HistoryEntry)).toMatch(
      /ha importato: 2 giorni di fatturato previsto, dal 05\/10\/2026 al 06\/10\/2026$/,
    );
  });

  it('moves a note in one change, and leaves a day that has a note alone', async () => {
    const [from, taken] = Object.keys(sample.dailyNotes).sort() as [string, string];
    const text = sample.dailyNotes[from];
    const to = '2026-09-25';
    expect(sample.dailyNotes[to]).toBeUndefined();

    repository.moveNote(from, to);
    const moved = await planWhere(
      repository,
      (plan) => plan.dailyNotes[to] === text && !(from in plan.dailyNotes),
    );
    expect(Object.keys(moved.dailyNotes)).toHaveLength(Object.keys(sample.dailyNotes).length);

    repository.moveNote(to, taken);
    // A text for a day without a note becomes a new note on the other day.
    const created = '2026-09-27';
    expect(sample.dailyNotes['2026-09-26']).toBeUndefined();
    repository.moveNote('2026-09-26', created, 'Rilascio');
    await whenSynced(repository);
    const entries = await new Promise<HistoryEntry[]>((resolve) => {
      const stop = repository.subscribeHistory({ limit: 50 }, (items) => {
        if (items.length === 4 && items.every((item) => item.at !== null)) {
          stop();
          resolve(items);
        }
      });
    });
    expect(entries[1]).toMatchObject({
      entity: 'note',
      entityId: to,
      action: 'update',
      before: { date: from, text },
      after: { date: to, text },
    });
    expect(describeHistoryEntry(entries[1] as HistoryEntry)).toMatch(/ha spostato la nota dal/);
    expect(entries[0]).toMatchObject({
      entity: 'note',
      entityId: created,
      action: 'create',
      after: { date: created, text: 'Rilascio' },
    });
    expect(entries[0]?.before).toBeUndefined();

    const notes = await getDocs(collection(ownerDb, `plans/${PLAN_ID}/notes`));
    expect(notes.docs.map((item) => item.id).sort()).toEqual([taken, to, created].sort());
    expect(notes.docs.find((item) => item.id === taken)?.data().text).toBe(
      sample.dailyNotes[taken],
    );
  });

  it('reports saving and synced, and records every change in the history', async () => {
    const statuses = statusesUntilSynced(repository);
    repository.setNote('2026-09-10', 'Rilascio');
    expect(await statuses).toEqual(['synced', 'saving', 'synced']);

    const entries = await new Promise<HistoryEntry[]>((resolve) => {
      const stop = repository.subscribeHistory({ limit: 50 }, (items) => {
        if (items.length === 3 && items.every((item) => item.at !== null)) {
          stop();
          resolve(items);
        }
      });
    });
    expect(entries.map((entry) => entry.action)).toEqual(['create', 'import', 'setup']);
    expect(entries[0]).toMatchObject({
      entity: 'note',
      entityId: '2026-09-10',
      actor: actorOf(OWNER),
      after: { text: 'Rilascio' },
    });
    expect(entries[1]?.summary).toMatch(/3 corsie, 11 attività/);

    const history = await getDocs(collection(ownerDb, `plans/${PLAN_ID}/history`));
    expect(
      history.docs
        .map(
          (item) =>
            `${item.data().action as string}:${item.data().entity as string}:${item.data().entityId as string}`,
        )
        .sort(),
    ).toEqual(['create:note:2026-09-10', 'import:plan:main', 'setup:plan:main']);

    // A start in time keeps only the later changes.
    const since = (date: Date) =>
      new Promise<HistoryEntry[]>((resolve) => {
        const stop = repository.subscribeHistory({ limit: 50, since: date }, (items) => {
          stop();
          resolve(items);
        });
      });
    expect(await since(new Date(Date.now() + 60 * 60 * 1000))).toEqual([]);
    expect(await since(new Date(Date.now() - 60 * 60 * 1000))).toHaveLength(3);
  });

  it('turns a refused change into an error status', async () => {
    const stranger = repositoryFor(clientAs(STRANGER), STRANGER);
    await expect(stranger.whenReady()).rejects.toThrow(/rifiutata|piano/);
  });
});

describe('members', () => {
  it('lets the owner invite, change roles and remove, and reports unknown or repeated users', async () => {
    await bootstrap();
    const known = [{ id: '1003', login: 'stranger', avatarUrl: 'https://example.com/s.png' }];
    const members = new FirestoreMembersRepository({
      db: ownerDb,
      planId: PLAN_ID,
      actor: actorOf(OWNER),
      createId,
      lookupUser: (login) => Promise.resolve(known.find((user) => user.login === login) ?? null),
    });
    const lists: string[][] = [];
    const stop = members.subscribe((list) =>
      lists.push(list.map((member) => `${member.login}:${member.role}`)),
    );
    const settled = () => new Promise((resolve) => setTimeout(resolve, 300));
    await settled();

    await expect(members.invite('nobody')).resolves.toBe('not-found');
    await expect(members.invite('stranger')).resolves.toBe('added');
    await settled();
    await expect(members.invite('stranger')).resolves.toBe('already-member');
    await members.setRole('1003', 'owner');
    await members.remove(EDITOR.githubId);
    await settled();
    stop();
    expect(lists.at(-1)).toEqual(['owner:owner', 'stranger:owner']);

    const asEditor = new FirestoreMembersRepository({
      db: editorDb,
      planId: PLAN_ID,
      actor: actorOf(EDITOR),
      createId,
      lookupUser: () => Promise.resolve(known[0] ?? null),
    });
    await expect(asEditor.remove('1003')).rejects.toThrow();
  });
});
