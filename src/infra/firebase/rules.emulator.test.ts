import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  EDITOR,
  OWNER,
  STRANGER,
  clientAs,
  deleteClients,
  setupRulesEnvironment,
} from './emulatorTest';
import type { Identity } from './emulatorTest';

const PLAN = 'plans/main';

let env: RulesTestEnvironment;
let owner: Firestore;
let editor: Firestore;
let stranger: Firestore;
let nobody: Firestore;

function actor(identity: Identity) {
  return { uid: identity.uid, githubId: identity.githubId, login: identity.login };
}

function audit(identity: Identity, historyId: string) {
  return { updatedAt: serverTimestamp(), updatedBy: identity.uid, lastHistoryId: historyId };
}

function historyEntry(identity: Identity, entity: string, entityId: string, action = 'create') {
  return { entity, entityId, action, actor: actor(identity), at: serverTimestamp() };
}

const TASK: Record<string, unknown> = {
  laneId: 'lane-1',
  title: 'Collaudo',
  startDate: '2026-09-10',
  endDate: '2026-09-12',
  colorId: 'ice',
  borderStyle: 'dashed',
  status: 'planned',
};

/** Seeds a plan owned by OWNER, with EDITOR as a member, bypassing the rules. */
async function seedPlan() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(PLAN).set({ name: 'Piano', createdBy: OWNER.uid, createdAt: new Date() });
    await db.doc(`${PLAN}/members/${OWNER.githubId}`).set({
      login: OWNER.login,
      avatarUrl: '',
      role: 'owner',
      addedBy: OWNER.uid,
      addedAt: new Date(),
    });
    await db.doc(`${PLAN}/members/${EDITOR.githubId}`).set({
      login: EDITOR.login,
      avatarUrl: '',
      role: 'editor',
      addedBy: OWNER.uid,
      addedAt: new Date(),
    });
    await db.doc(`${PLAN}/history/h0`).set({
      entity: 'plan',
      entityId: 'main',
      action: 'setup',
      actor: actor(OWNER),
      at: new Date(),
    });
    await db.doc(`${PLAN}/tasks/t1`).set({ ...TASK, ...audit(OWNER, 'h0'), updatedAt: new Date() });
  });
}

/** Writes a task and its history entry in one batch, as the rules expect. */
function createTask(db: Firestore, identity: Identity, taskId: string, task = TASK) {
  const historyId = `h-${taskId}`;
  const batch = writeBatch(db);
  batch.set(doc(db, `${PLAN}/tasks/${taskId}`), { ...task, ...audit(identity, historyId) });
  batch.set(doc(db, `${PLAN}/history/${historyId}`), historyEntry(identity, 'task', taskId));
  return batch.commit();
}

beforeAll(async () => {
  env = await setupRulesEnvironment();
  owner = clientAs(OWNER);
  editor = clientAs(EDITOR);
  stranger = clientAs(STRANGER);
  nobody = clientAs(null);
});

beforeEach(() => env.clearFirestore());

afterAll(async () => {
  await deleteClients();
  await env.cleanup();
});

describe('creating the plan', () => {
  it('lets the first user create the plan, become its owner and log it, in one batch', async () => {
    const batch = writeBatch(owner);
    batch.set(doc(owner, PLAN), {
      name: 'Piano rilasci',
      createdBy: OWNER.uid,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(owner, `${PLAN}/members/${OWNER.githubId}`), {
      login: OWNER.login,
      avatarUrl: 'https://example.com/a.png',
      role: 'owner',
      addedBy: OWNER.uid,
      addedAt: serverTimestamp(),
    });
    batch.set(doc(owner, `${PLAN}/history/h1`), historyEntry(OWNER, 'plan', 'main', 'setup'));
    batch.set(doc(owner, `${PLAN}/lanes/lane-1`), {
      name: 'Frontend',
      position: 0,
      ...audit(OWNER, 'h1'),
    });
    await assertSucceeds(batch.commit());
  });

  it('refuses a plan without its owner in the same batch', async () => {
    const batch = writeBatch(owner);
    batch.set(doc(owner, PLAN), {
      name: 'Piano',
      createdBy: OWNER.uid,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(owner, `${PLAN}/history/h1`), historyEntry(OWNER, 'plan', 'main', 'setup'));
    await assertFails(batch.commit());
  });

  it('refuses anyone who makes themselves owner of an existing plan', async () => {
    await seedPlan();
    await assertFails(
      setDoc(doc(stranger, `${PLAN}/members/${STRANGER.githubId}`), {
        login: STRANGER.login,
        avatarUrl: '',
        role: 'owner',
        addedBy: STRANGER.uid,
        addedAt: serverTimestamp(),
      }),
    );
  });

  it('tells any signed-in user whether the plan exists, and nothing more', async () => {
    await seedPlan();
    await assertSucceeds(getDoc(doc(stranger, PLAN)));
    await assertSucceeds(getDoc(doc(stranger, `${PLAN}/members/${STRANGER.githubId}`)));
    await assertFails(getDoc(doc(stranger, `${PLAN}/members/${OWNER.githubId}`)));
    await assertFails(getDocs(collection(stranger, `${PLAN}/tasks`)));
    await assertFails(getDoc(doc(nobody, PLAN)));
  });
});

describe('members', () => {
  beforeEach(seedPlan);

  it('lets only the owner invite, change roles and remove members', async () => {
    const invite = (db: Firestore, by: Identity) =>
      setDoc(doc(db, `${PLAN}/members/${STRANGER.githubId}`), {
        login: STRANGER.login,
        avatarUrl: '',
        role: 'editor',
        addedBy: by.uid,
        addedAt: serverTimestamp(),
      });
    await assertFails(invite(editor, EDITOR));
    await assertSucceeds(invite(owner, OWNER));
    await assertSucceeds(
      updateDoc(doc(owner, `${PLAN}/members/${STRANGER.githubId}`), { role: 'owner' }),
    );
    await assertFails(
      updateDoc(doc(editor, `${PLAN}/members/${STRANGER.githubId}`), { role: 'editor' }),
    );
    await assertFails(deleteDoc(doc(editor, `${PLAN}/members/${STRANGER.githubId}`)));
    await assertSucceeds(deleteDoc(doc(owner, `${PLAN}/members/${STRANGER.githubId}`)));
  });

  it('never lets the owner touch their own membership', async () => {
    await assertFails(
      updateDoc(doc(owner, `${PLAN}/members/${OWNER.githubId}`), { role: 'editor' }),
    );
    await assertFails(deleteDoc(doc(owner, `${PLAN}/members/${OWNER.githubId}`)));
  });

  it('lets members see each other and the plan name', async () => {
    const members = await assertSucceeds(getDocs(collection(editor, `${PLAN}/members`)));
    expect(members.size).toBe(2);
    await assertSucceeds(getDoc(doc(editor, PLAN)));
    await assertFails(updateDoc(doc(editor, PLAN), { name: 'Altro' }));
    await assertSucceeds(updateDoc(doc(owner, PLAN), { name: 'Altro' }));
  });
});

describe('tasks', () => {
  beforeEach(seedPlan);

  it('accepts a valid task written with its history entry', async () => {
    await assertSucceeds(createTask(editor, EDITOR, 't2'));
    await assertSucceeds(
      createTask(editor, EDITOR, 't3', {
        ...TASK,
        assignee: 'Giulia',
        description: 'Note',
        deliverables: ['Revisione'],
      }),
    );
  });

  it('refuses a task without a history entry in the batch', async () => {
    await assertFails(
      setDoc(doc(editor, `${PLAN}/tasks/t2`), { ...TASK, ...audit(EDITOR, 'missing') }),
    );
  });

  it('refuses a task that lies about who or when', async () => {
    const batch = writeBatch(editor);
    batch.set(doc(editor, `${PLAN}/tasks/t2`), { ...TASK, ...audit(OWNER, 'h-t2') });
    batch.set(doc(editor, `${PLAN}/history/h-t2`), historyEntry(EDITOR, 'task', 't2'));
    await assertFails(batch.commit());

    const stale = writeBatch(editor);
    stale.set(doc(editor, `${PLAN}/tasks/t2`), {
      ...TASK,
      ...audit(EDITOR, 'h-t2'),
      updatedAt: Timestamp.fromDate(new Date('2026-01-01')),
    });
    stale.set(doc(editor, `${PLAN}/history/h-t2`), historyEntry(EDITOR, 'task', 't2'));
    await assertFails(stale.commit());
  });

  it('validates the task fields', async () => {
    await assertFails(createTask(editor, EDITOR, 'bad-status', { ...TASK, status: 'done' }));
    await assertFails(createTask(editor, EDITOR, 'bad-dates', { ...TASK, endDate: '2026-09-01' }));
    await assertFails(createTask(editor, EDITOR, 'bad-color', { ...TASK, colorId: 'pink' }));
    await assertFails(createTask(editor, EDITOR, 'extra', { ...TASK, owner: 'x' }));
    await assertFails(createTask(editor, EDITOR, 'empty', { ...TASK, title: '' }));
  });

  it('accepts an update only with a new history entry', async () => {
    const batch = writeBatch(editor);
    batch.update(doc(editor, `${PLAN}/tasks/t1`), {
      title: 'Collaudo esteso',
      ...audit(EDITOR, 'h2'),
    });
    batch.set(doc(editor, `${PLAN}/history/h2`), historyEntry(EDITOR, 'task', 't1', 'update'));
    await assertSucceeds(batch.commit());

    // The previous entry exists already: pointing to it again is not a record of this change.
    await assertFails(
      updateDoc(doc(editor, `${PLAN}/tasks/t1`), { title: 'Altro', ...audit(EDITOR, 'h2') }),
    );
  });

  it('keeps strangers and anonymous visitors out', async () => {
    await assertFails(createTask(stranger, STRANGER, 't2'));
    await assertFails(getDocs(collection(stranger, `${PLAN}/tasks`)));
    await assertFails(deleteDoc(doc(stranger, `${PLAN}/tasks/t1`)));
    await assertFails(getDocs(collection(nobody, `${PLAN}/tasks`)));
    await assertSucceeds(deleteDoc(doc(editor, `${PLAN}/tasks/t1`)));
  });
});

describe('values, notes and history', () => {
  beforeEach(seedPlan);

  it('accepts numeric values on real dates and text notes', async () => {
    const batch = writeBatch(editor);
    batch.set(doc(editor, `${PLAN}/metrics/metric-1`), {
      label: 'Fatturato',
      unit: '€',
      decimals: 0,
      position: 0,
      visible: true,
      ...audit(EDITOR, 'h3'),
    });
    batch.set(doc(editor, `${PLAN}/metrics/metric-1/values/2026-09-10`), {
      value: 1250.5,
      ...audit(EDITOR, 'h3'),
    });
    batch.set(doc(editor, `${PLAN}/notes/2026-09-15`), {
      text: 'Code freeze',
      ...audit(EDITOR, 'h3'),
    });
    batch.set(
      doc(editor, `${PLAN}/history/h3`),
      historyEntry(EDITOR, 'metric', 'metric-1', 'import'),
    );
    await assertSucceeds(batch.commit());
  });

  it('refuses bad dates, non-numeric values and blank notes', async () => {
    const attempt = (path: string, data: Record<string, unknown>) => {
      const batch = writeBatch(editor);
      batch.set(doc(editor, path), { ...data, ...audit(EDITOR, 'h4') });
      batch.set(doc(editor, `${PLAN}/history/h4`), historyEntry(EDITOR, 'value', path, 'update'));
      return batch.commit();
    };
    await assertFails(attempt(`${PLAN}/metrics/metric-1/values/10-09-2026`, { value: 1 }));
    await assertFails(attempt(`${PLAN}/metrics/metric-1/values/2026-09-10`, { value: '1.250' }));
    await assertFails(attempt(`${PLAN}/notes/2026-09-15`, { text: '' }));
  });

  it('never lets history entries change or disappear', async () => {
    await assertFails(updateDoc(doc(owner, `${PLAN}/history/h0`), { action: 'update' }));
    await assertFails(deleteDoc(doc(owner, `${PLAN}/history/h0`)));
    await assertFails(
      setDoc(doc(editor, `${PLAN}/history/h5`), historyEntry(OWNER, 'task', 't1', 'update')),
    );
    await assertSucceeds(getDocs(collection(editor, `${PLAN}/history`)));
  });

  it('accepts an import of many documents that share one history entry', async () => {
    const batch = writeBatch(owner);
    batch.set(doc(owner, `${PLAN}/history/import-1`), {
      ...historyEntry(OWNER, 'plan', 'main', 'import'),
      summary: 'Importati 150 documenti',
    });
    for (let index = 0; index < 3; index += 1) {
      batch.set(doc(owner, `${PLAN}/lanes/lane-${index}`), {
        name: `Corsia ${index}`,
        position: index,
        ...audit(OWNER, 'import-1'),
      });
    }
    for (let index = 0; index < 120; index += 1) {
      batch.set(doc(owner, `${PLAN}/tasks/import-${index}`), {
        ...TASK,
        ...audit(OWNER, 'import-1'),
      });
    }
    for (let day = 1; day <= 27; day += 1) {
      const date = `2026-09-${String(day).padStart(2, '0')}`;
      batch.set(doc(owner, `${PLAN}/metrics/metric-1/values/${date}`), {
        value: day * 1000,
        ...audit(OWNER, 'import-1'),
      });
    }
    await assertSucceeds(batch.commit());
  });
});
