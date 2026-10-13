import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  deleteField,
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

let entryCount = 0;
const newEntryId = () => `h-new-${++entryCount}`;

/** The writer's document, which names the history entry of a batch that deletes. */
function writerDoc(db: Firestore, identity: Identity) {
  return doc(db, `${PLAN}/writers/${identity.uid}`);
}

/**
 * A change without a document to carry its history entry, as a deletion or a change of a member:
 * the batch adds the entry and the writer's document that names it.
 */
function recordedChange(
  db: Firestore,
  identity: Identity,
  change: (batch: ReturnType<typeof writeBatch>) => void,
  [entity, entityId, action]: [string, string, string],
) {
  const historyId = newEntryId();
  const batch = writeBatch(db);
  change(batch);
  batch.set(
    doc(db, `${PLAN}/history/${historyId}`),
    historyEntry(identity, entity, entityId, action),
  );
  batch.set(writerDoc(db, identity), { historyId, at: serverTimestamp() });
  return batch.commit();
}

/** Deletes a document with its history entry, as the app does. */
function deleteRecorded(db: Firestore, identity: Identity, path: string, entity: string) {
  const id = path.split('/').at(-1) ?? '';
  return recordedChange(db, identity, (batch) => batch.delete(doc(db, path)), [
    entity,
    id,
    'delete',
  ]);
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
      avatarUrl: 'https://avatars.githubusercontent.com/u/1001?v=4',
      role: 'owner',
      addedBy: OWNER.uid,
      addedAt: serverTimestamp(),
    });
    batch.set(doc(owner, `${PLAN}/history/h1`), historyEntry(OWNER, 'plan', 'main', 'setup'));
    batch.set(writerDoc(owner, OWNER), { historyId: 'h1', at: serverTimestamp() });
    batch.set(doc(owner, `${PLAN}/lanes/lane-1`), {
      name: 'Frontend',
      position: 0,
      ...audit(OWNER, 'h1'),
    });
    await assertSucceeds(batch.commit());
  });

  /** The batch that creates a plan, under any id, as the app writes it for 'main'. */
  function createPlanBatch(db: Firestore, identity: Identity, planPath: string, withWriter = true) {
    const batch = writeBatch(db);
    batch.set(doc(db, planPath), {
      name: 'Piano',
      createdBy: identity.uid,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, `${planPath}/members/${identity.githubId}`), {
      login: identity.login,
      avatarUrl: '',
      role: 'owner',
      addedBy: identity.uid,
      addedAt: serverTimestamp(),
    });
    batch.set(doc(db, `${planPath}/history/h1`), historyEntry(identity, 'plan', 'x', 'setup'));
    if (withWriter) {
      batch.set(doc(db, `${planPath}/writers/${identity.uid}`), {
        historyId: 'h1',
        at: serverTimestamp(),
      });
    }
    return batch.commit();
  }

  it('refuses any plan but the one of the instance, and a plan without its history', async () => {
    // Anyone signed in could otherwise fill the database with plans of their own.
    await assertFails(createPlanBatch(stranger, STRANGER, 'plans/mine'));
    await assertFails(createPlanBatch(stranger, STRANGER, PLAN, false));
    await assertSucceeds(createPlanBatch(stranger, STRANGER, PLAN));
  });

  it('refuses a plan without its owner in the same batch', async () => {
    const batch = writeBatch(owner);
    batch.set(doc(owner, PLAN), {
      name: 'Piano',
      createdBy: OWNER.uid,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(owner, `${PLAN}/history/h1`), historyEntry(OWNER, 'plan', 'main', 'setup'));
    batch.set(writerDoc(owner, OWNER), { historyId: 'h1', at: serverTimestamp() });
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

  const strangerPath = `${PLAN}/members/${STRANGER.githubId}`;
  const membership = (by: Identity, avatarUrl = '') => ({
    login: STRANGER.login,
    avatarUrl,
    role: 'editor',
    addedBy: by.uid,
    addedAt: serverTimestamp(),
  });
  const invite = (db: Firestore, by: Identity, avatarUrl = '') =>
    recordedChange(db, by, (batch) => batch.set(doc(db, strangerPath), membership(by, avatarUrl)), [
      'member',
      STRANGER.githubId,
      'create',
    ]);
  const setRole = (db: Firestore, by: Identity, githubId: string, role: string) =>
    recordedChange(
      db,
      by,
      (batch) => batch.update(doc(db, `${PLAN}/members/${githubId}`), { role }),
      ['member', githubId, 'update'],
    );

  it('lets only the owner invite, change roles and remove members', async () => {
    await assertFails(invite(editor, EDITOR));
    await assertSucceeds(invite(owner, OWNER));
    await assertSucceeds(setRole(owner, OWNER, STRANGER.githubId, 'owner'));
    await assertFails(setRole(editor, EDITOR, STRANGER.githubId, 'editor'));
    await assertFails(deleteRecorded(editor, EDITOR, strangerPath, 'member'));
    await assertSucceeds(deleteRecorded(owner, OWNER, strangerPath, 'member'));
  });

  it('wants a history entry for every change of the members', async () => {
    await assertFails(setDoc(doc(owner, strangerPath), membership(OWNER)));
    await assertSucceeds(invite(owner, OWNER));
    await assertFails(updateDoc(doc(owner, strangerPath), { role: 'owner' }));
    await assertFails(deleteDoc(doc(owner, strangerPath)));
  });

  it('takes a picture only from GitHub', async () => {
    await assertFails(invite(owner, OWNER, 'https://example.com/tracker.png'));
    await assertFails(invite(owner, OWNER, 'https://avatars.githubusercontent.com.example.com/a'));
    await assertSucceeds(invite(owner, OWNER, 'https://avatars.githubusercontent.com/u/1003?v=4'));
  });

  it('never lets the owner touch their own membership', async () => {
    await assertFails(setRole(owner, OWNER, OWNER.githubId, 'editor'));
    await assertFails(deleteRecorded(owner, OWNER, `${PLAN}/members/${OWNER.githubId}`, 'member'));
  });

  it('lets members see each other and the plan name', async () => {
    const members = await assertSucceeds(getDocs(collection(editor, `${PLAN}/members`)));
    expect(members.size).toBe(2);
    await assertSucceeds(getDoc(doc(editor, PLAN)));
    const rename = (db: Firestore, identity: Identity) =>
      recordedChange(db, identity, (batch) => batch.update(doc(db, PLAN), { name: 'Altro' }), [
        'plan',
        'main',
        'update',
      ]);
    await assertFails(rename(editor, EDITOR));
    await assertFails(updateDoc(doc(owner, PLAN), { name: 'Altro' }));
    await assertSucceeds(rename(owner, OWNER));
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
    await assertFails(createTask(editor, EDITOR, 'bad-color', { ...TASK, colorId: 'neon' }));
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
    await assertSucceeds(deleteRecorded(editor, EDITOR, `${PLAN}/tasks/t1`, 'task'));
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

  it('accepts the approval light and promotions of a forecast day, and nothing else', async () => {
    const attempt = (data: Record<string, unknown>) => {
      const path = `${PLAN}/metrics/metric-1/values/2026-10-05`;
      const batch = writeBatch(editor);
      batch.set(doc(editor, path), { value: 3210123.45, ...data, ...audit(EDITOR, 'h6') });
      batch.set(
        doc(editor, `${PLAN}/history/h6`),
        historyEntry(EDITOR, 'metric', 'metric-1', 'import'),
      );
      return batch.commit();
    };
    await assertSucceeds(attempt({ approval: 'red', promoEu: 'Saldi', promoNonEu: 'Singles Day' }));
    await assertFails(attempt({ approval: 'yellow' }));
    await assertFails(attempt({ promoEu: '' }));
    await assertFails(attempt({ promoNonEu: 'x'.repeat(201) }));
    await assertFails(attempt({ note: 'campo sconosciuto' }));
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

describe('free notes', () => {
  beforeEach(seedPlan);

  const AUTHOR = { id: EDITOR.githubId, login: EDITOR.login };
  const OTHER_AUTHOR = { id: OWNER.githubId, login: OWNER.login };
  const MEMO = { title: 'Stima del fornitore', position: 1, author: AUTHOR };

  function writeMemo(
    db: Firestore,
    identity: Identity,
    data: Record<string, unknown>,
    id = 'm1',
    action = 'create',
  ) {
    const historyId = `h-${id}-${Math.random().toString(36).slice(2)}`;
    const batch = writeBatch(db);
    batch.set(doc(db, `${PLAN}/memos/${id}`), { ...data, ...audit(identity, historyId) });
    // An import is of the whole plan.
    const [entity, entityId] = action === 'import' ? ['plan', 'main'] : ['memo', id];
    batch.set(
      doc(db, `${PLAN}/history/${historyId}`),
      historyEntry(identity, entity, entityId, action),
    );
    return batch.commit();
  }

  function updateMemo(db: Firestore, identity: Identity, data: Record<string, unknown>, id = 'm1') {
    const historyId = `h-${id}-${Math.random().toString(36).slice(2)}`;
    const batch = writeBatch(db);
    batch.update(doc(db, `${PLAN}/memos/${id}`), { ...data, ...audit(identity, historyId) });
    batch.set(
      doc(db, `${PLAN}/history/${historyId}`),
      historyEntry(identity, 'memo', id, 'update'),
    );
    return batch.commit();
  }

  const privatePath = (identity: Identity, id = 'p1') =>
    `${PLAN}/members/${identity.githubId}/memos/${id}`;

  it('accepts a note with its author and history entry, with or without the optional fields', async () => {
    await assertSucceeds(writeMemo(editor, EDITOR, MEMO));
    await assertSucceeds(
      writeMemo(
        editor,
        EDITOR,
        { ...MEMO, body: 'Entro il 17', colorId: 'yellow', remindOn: '2026-07-17', position: 2.5 },
        'm2',
      ),
    );
    await assertSucceeds(getDocs(collection(editor, `${PLAN}/memos`)));
  });

  it('refuses a note without a history entry, and bad fields', async () => {
    await assertFails(setDoc(doc(editor, `${PLAN}/memos/m1`), { ...MEMO, ...audit(EDITOR, 'h9') }));
    await assertFails(writeMemo(editor, EDITOR, { ...MEMO, title: '' }));
    await assertFails(writeMemo(editor, EDITOR, { ...MEMO, title: 'x'.repeat(201) }));
    await assertFails(writeMemo(editor, EDITOR, { ...MEMO, body: '' }));
    await assertFails(writeMemo(editor, EDITOR, { ...MEMO, colorId: 'neon' }));
    await assertFails(writeMemo(editor, EDITOR, { ...MEMO, remindOn: '17/07/2026' }));
    await assertFails(writeMemo(editor, EDITOR, { ...MEMO, position: '1' }));
    await assertFails(writeMemo(editor, EDITOR, { ...MEMO, pinned: true }));
    await assertFails(writeMemo(editor, EDITOR, { ...MEMO, private: true }));
  });

  it('wants the writer as author, keeps it, and lets only an import keep other authors', async () => {
    const { author: _author, ...anonymous } = MEMO;
    await assertFails(writeMemo(editor, EDITOR, anonymous));
    await assertFails(writeMemo(editor, EDITOR, { ...MEMO, author: { id: '', login: 'x' } }));
    await assertFails(writeMemo(editor, EDITOR, { ...MEMO, author: { ...AUTHOR, role: 'owner' } }));
    // Nobody writes a note in someone else's name, nor with someone else's username.
    await assertFails(writeMemo(owner, OWNER, MEMO));
    await assertFails(
      writeMemo(editor, EDITOR, { ...MEMO, author: { id: EDITOR.githubId, login: OWNER.login } }),
    );
    // Only the owner restores a backup, which keeps the notes the editor wrote, and the history
    // says so; an import entry written before is not one of this change.
    await assertFails(writeMemo(editor, EDITOR, { ...MEMO, author: OTHER_AUTHOR }, 'm1', 'import'));
    await assertSucceeds(writeMemo(owner, OWNER, MEMO, 'm9', 'import'));
    const stale = writeBatch(owner);
    stale.set(
      doc(owner, `${PLAN}/history/old-import`),
      historyEntry(OWNER, 'plan', 'main', 'import'),
    );
    await assertSucceeds(stale.commit());
    await assertFails(
      setDoc(doc(owner, `${PLAN}/memos/m8`), { ...MEMO, ...audit(OWNER, 'old-import') }),
    );
    // An import of the daily values is not one of the plan: it keeps no authors.
    const values = writeBatch(owner);
    values.set(doc(owner, `${PLAN}/memos/m7`), { ...MEMO, ...audit(OWNER, 'values-import') });
    values.set(
      doc(owner, `${PLAN}/history/values-import`),
      historyEntry(OWNER, 'metric', 'metric-1', 'import'),
    );
    await assertFails(values.commit());
    await assertSucceeds(writeMemo(owner, OWNER, MEMO, 'm1', 'import'));
    // Every member changes a shared note, never its author.
    await assertSucceeds(updateMemo(owner, OWNER, { title: 'Stima rivista', position: 3 }));
    await assertFails(
      updateMemo(editor, EDITOR, { author: { id: OWNER.githubId, login: OWNER.login } }),
    );
  });

  it('renumbers several notes under one history entry, and keeps strangers out', async () => {
    const byOwner = { ...MEMO, author: { id: OWNER.githubId, login: OWNER.login } };
    await assertSucceeds(writeMemo(owner, OWNER, byOwner, 'm1'));
    await assertSucceeds(writeMemo(owner, OWNER, { ...byOwner, position: 2 }, 'm2'));
    const batch = writeBatch(editor);
    batch.update(doc(editor, `${PLAN}/memos/m1`), { position: 2, ...audit(EDITOR, 'move-1') });
    batch.update(doc(editor, `${PLAN}/memos/m2`), { position: 1, ...audit(EDITOR, 'move-1') });
    batch.set(doc(editor, `${PLAN}/history/move-1`), historyEntry(EDITOR, 'memo', 'm2', 'update'));
    await assertSucceeds(batch.commit());
    await assertFails(writeMemo(stranger, STRANGER, MEMO, 'm3'));
    await assertFails(getDocs(collection(stranger, `${PLAN}/memos`)));
    await assertSucceeds(deleteRecorded(editor, EDITOR, `${PLAN}/memos/m1`, 'memo'));
  });

  it('keeps private notes to their author, without history', async () => {
    const note = { title: 'Solo per me', position: 1.5, body: 'Testo', colorId: 'red' };
    await assertSucceeds(setDoc(doc(editor, privatePath(EDITOR)), note));
    await assertSucceeds(updateDoc(doc(editor, privatePath(EDITOR)), { remindOn: '2026-07-17' }));
    await assertSucceeds(getDocs(collection(editor, `${PLAN}/members/${EDITOR.githubId}/memos`)));
    // Nobody else reads, lists, writes or deletes them, the owner included.
    await assertFails(getDoc(doc(owner, privatePath(EDITOR))));
    await assertFails(getDocs(collection(owner, `${PLAN}/members/${EDITOR.githubId}/memos`)));
    await assertFails(setDoc(doc(owner, privatePath(EDITOR, 'p2')), note));
    await assertFails(updateDoc(doc(owner, privatePath(EDITOR)), { title: 'Letta' }));
    await assertFails(deleteDoc(doc(owner, privatePath(EDITOR))));
    // A stranger has no private notes in the plan, even under their own id.
    await assertFails(setDoc(doc(stranger, privatePath(STRANGER)), note));
    // The same content as a shared note, without author or audit.
    await assertFails(setDoc(doc(editor, privatePath(EDITOR, 'p3')), { ...note, author: AUTHOR }));
    await assertFails(
      setDoc(doc(editor, privatePath(EDITOR, 'p4')), { ...note, ...audit(EDITOR, 'h1') }),
    );
    await assertFails(setDoc(doc(editor, privatePath(EDITOR, 'p5')), { ...note, title: '' }));
    await assertSucceeds(deleteDoc(doc(editor, privatePath(EDITOR))));
  });

  it('moves a note between shared and private in one batch', async () => {
    await assertSucceeds(writeMemo(editor, EDITOR, MEMO, 'm1'));
    const hide = writeBatch(editor);
    hide.delete(doc(editor, `${PLAN}/memos/m1`));
    hide.set(doc(editor, privatePath(EDITOR, 'm1')), { title: MEMO.title, position: 1 });
    hide.set(doc(editor, `${PLAN}/history/hide-1`), historyEntry(EDITOR, 'memo', 'm1', 'update'));
    hide.set(writerDoc(editor, EDITOR), { historyId: 'hide-1', at: serverTimestamp() });
    await assertSucceeds(hide.commit());

    const share = writeBatch(editor);
    share.delete(doc(editor, privatePath(EDITOR, 'm1')));
    share.set(doc(editor, `${PLAN}/memos/m1`), { ...MEMO, ...audit(EDITOR, 'share-1') });
    share.set(doc(editor, `${PLAN}/history/share-1`), historyEntry(EDITOR, 'memo', 'm1', 'update'));
    await assertSucceeds(share.commit());
  });
});

describe('projects', () => {
  beforeEach(seedPlan);

  const PROJECT: Record<string, unknown> = {
    title: 'App mobile 3.0',
    startDate: '2026-09-10',
    deadline: '2026-12-20',
    colorId: 'purple',
    status: 'in_progress',
  };

  function writeProject(
    db: Firestore,
    identity: Identity,
    data: Record<string, unknown>,
    id = 'p1',
    update = false,
  ) {
    const historyId = `h-${id}-${Math.random().toString(36).slice(2)}`;
    const batch = writeBatch(db);
    const ref = doc(db, `${PLAN}/projects/${id}`);
    if (update) batch.update(ref, { ...data, ...audit(identity, historyId) });
    else batch.set(ref, { ...data, ...audit(identity, historyId) });
    batch.set(
      doc(db, `${PLAN}/history/${historyId}`),
      historyEntry(identity, 'project', id, update ? 'update' : 'create'),
    );
    return batch.commit();
  }

  it('accepts a project with its history entry, with or without owner and description', async () => {
    await assertSucceeds(writeProject(editor, EDITOR, PROJECT));
    await assertSucceeds(
      writeProject(
        owner,
        OWNER,
        { ...PROJECT, owner: 'Giulia', description: 'Nuovo carrello', status: 'idea' },
        'p2',
      ),
    );
    await assertSucceeds(writeProject(editor, EDITOR, { deadline: '2027-01-31' }, 'p2', true));
    await assertSucceeds(writeProject(editor, EDITOR, { position: 1.5 }, 'p2', true));
    await assertSucceeds(
      writeProject(editor, EDITOR, { deadline: '2027-01-15', remindDaysBefore: 7 }, 'p2', true),
    );
    await assertSucceeds(getDocs(collection(editor, `${PLAN}/projects`)));
    await assertSucceeds(deleteRecorded(editor, EDITOR, `${PLAN}/projects/p2`, 'project'));
  });

  it('refuses a project without a history entry, and bad fields', async () => {
    await assertFails(
      setDoc(doc(editor, `${PLAN}/projects/p1`), { ...PROJECT, ...audit(EDITOR, 'h9') }),
    );
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, title: '' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, position: 'prima' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, remindDaysBefore: 1.5 }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, remindDaysBefore: 400 }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, title: 'x'.repeat(201) }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, startDate: '10/09/2026' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, colorId: 'neon' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, status: 'blocked' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, owner: '' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, description: 'x'.repeat(5001) }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, progress: 50 }));
    // The planned end and the days of the project are gone since 0.16.
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, endDate: '2026-12-20' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, manDays: 20 }));
    // The deadline, the contingency and the arrangement of 0.11.
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, deadline: '01/12/2026' }));
    await assertFails(
      writeProject(editor, EDITOR, { ...PROJECT, contingency: { startDate: '2026-12-01' } }),
    );
    await assertFails(
      writeProject(editor, EDITOR, {
        ...PROJECT,
        contingency: { startDate: '2026-12-01', manDays: 3, owner: 'x' },
      }),
    );
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, arrangement: 'free' }));
  });

  it('accepts a project without a deadline, or with its deadline, contingency and arrangement', async () => {
    const { deadline: _deadline, ...withoutDeadline } = PROJECT;
    await assertSucceeds(writeProject(editor, EDITOR, withoutDeadline, 'p3'));
    await assertSucceeds(
      writeProject(
        editor,
        EDITOR,
        {
          ...PROJECT,
          deadline: '2026-12-01',
          contingency: { startDate: '2026-11-20', manDays: 3 },
          arrangement: 'manual',
        },
        'p4',
      ),
    );
  });

  it('keeps strangers and anonymous visitors out', async () => {
    await assertSucceeds(writeProject(editor, EDITOR, PROJECT));
    await assertFails(writeProject(stranger, STRANGER, PROJECT, 'p2'));
    await assertFails(getDocs(collection(stranger, `${PLAN}/projects`)));
    await assertFails(getDoc(doc(nobody, `${PLAN}/projects/p1`)));
    await assertFails(deleteDoc(doc(stranger, `${PLAN}/projects/p1`)));
  });
});

describe('notes of the projects', () => {
  beforeEach(seedPlan);

  const AUTHOR = { id: EDITOR.githubId, login: EDITOR.login };
  const NOTE: Record<string, unknown> = {
    projectId: 'p1',
    text: 'Stima: 15 giorni lato server',
    createdAt: '2026-10-06T09:00:00.000Z',
    author: AUTHOR,
  };

  function writeNote(
    db: Firestore,
    identity: Identity,
    data: Record<string, unknown>,
    id = 'n1',
    action = 'create',
  ) {
    const historyId = `h-${id}-${Math.random().toString(36).slice(2)}`;
    const batch = writeBatch(db);
    const ref = doc(db, `${PLAN}/projectNotes/${id}`);
    if (action === 'update') batch.update(ref, { ...data, ...audit(identity, historyId) });
    else batch.set(ref, { ...data, ...audit(identity, historyId) });
    const [entity, entityId] = action === 'import' ? ['plan', 'main'] : ['projectNote', id];
    batch.set(
      doc(db, `${PLAN}/history/${historyId}`),
      historyEntry(identity, entity, entityId, action),
    );
    return batch.commit();
  }

  it('accepts a note by its writer, with or without the optional fields', async () => {
    await assertSucceeds(writeNote(editor, EDITOR, NOTE));
    await assertSucceeds(
      writeNote(
        editor,
        EDITOR,
        {
          ...NOTE,
          status: 'open',
          dueOn: '2026-10-20',
          remind: true,
          owners: ['Giulia', 'Marco'],
          tags: ['stima'],
        },
        'n2',
      ),
    );
    await assertSucceeds(getDocs(collection(editor, `${PLAN}/projectNotes`)));
    await assertSucceeds(deleteRecorded(owner, OWNER, `${PLAN}/projectNotes/n2`, 'projectNote'));
  });

  it('refuses a note without a history entry, and bad fields', async () => {
    await assertFails(
      setDoc(doc(editor, `${PLAN}/projectNotes/n1`), { ...NOTE, ...audit(EDITOR, 'h9') }),
    );
    await assertFails(writeNote(editor, EDITOR, { ...NOTE, text: '' }));
    await assertFails(writeNote(editor, EDITOR, { ...NOTE, text: 'x'.repeat(2001) }));
    await assertFails(writeNote(editor, EDITOR, { ...NOTE, createdAt: '2026-10-06' }));
    await assertFails(writeNote(editor, EDITOR, { ...NOTE, status: 'maybe' }));
    await assertFails(writeNote(editor, EDITOR, { ...NOTE, dueOn: '20/10/2026' }));
    await assertFails(writeNote(editor, EDITOR, { ...NOTE, remind: true }));
    await assertFails(writeNote(editor, EDITOR, { ...NOTE, owners: 'Giulia' }));
    await assertFails(writeNote(editor, EDITOR, { ...NOTE, pinned: true }));
    const { author: _author, ...anonymous } = NOTE;
    await assertFails(writeNote(editor, EDITOR, anonymous));
  });

  it('wants the writer as author, keeps author, project and time, and lets an import keep other authors', async () => {
    await assertFails(writeNote(owner, OWNER, NOTE));
    await assertFails(
      writeNote(
        editor,
        EDITOR,
        { ...NOTE, author: { id: OWNER.githubId, login: OWNER.login } },
        'n1',
        'import',
      ),
    );
    await assertSucceeds(writeNote(owner, OWNER, NOTE, 'n1', 'import'));
    await assertSucceeds(
      writeNote(owner, OWNER, { text: 'Stima rivista', status: 'done' }, 'n1', 'update'),
    );
    await assertFails(
      writeNote(
        owner,
        OWNER,
        { author: { id: OWNER.githubId, login: OWNER.login } },
        'n1',
        'update',
      ),
    );
    await assertFails(writeNote(owner, OWNER, { projectId: 'p2' }, 'n1', 'update'));
    await assertFails(
      writeNote(owner, OWNER, { createdAt: '2026-10-07T09:00:00.000Z' }, 'n1', 'update'),
    );
  });

  it('keeps strangers and anonymous visitors out', async () => {
    await assertSucceeds(writeNote(editor, EDITOR, NOTE));
    await assertFails(writeNote(stranger, STRANGER, NOTE, 'n2'));
    await assertFails(getDocs(collection(stranger, `${PLAN}/projectNotes`)));
    await assertFails(getDoc(doc(nobody, `${PLAN}/projectNotes/n1`)));
    await assertFails(deleteDoc(doc(stranger, `${PLAN}/projectNotes/n1`)));
  });
});

describe('assignments', () => {
  beforeEach(seedPlan);

  const ASSIGNMENT: Record<string, unknown> = {
    projectId: 'p1',
    stakeholderId: 'server-1',
    startDate: '2026-12-15',
    manDays: 15,
  };

  function writeAssignment(
    db: Firestore,
    identity: Identity,
    data: Record<string, unknown>,
    id = 'a1',
    update = false,
  ) {
    const historyId = `h-${id}-${Math.random().toString(36).slice(2)}`;
    const batch = writeBatch(db);
    const ref = doc(db, `${PLAN}/assignments/${id}`);
    if (update) batch.update(ref, { ...data, ...audit(identity, historyId) });
    else batch.set(ref, { ...data, ...audit(identity, historyId) });
    batch.set(
      doc(db, `${PLAN}/history/${historyId}`),
      historyEntry(identity, 'assignment', id, update ? 'update' : 'create'),
    );
    return batch.commit();
  }

  it('accepts an assignment with its history entry, with or without a note, and its changes', async () => {
    await assertSucceeds(writeAssignment(editor, EDITOR, ASSIGNMENT));
    await assertSucceeds(
      writeAssignment(owner, OWNER, { ...ASSIGNMENT, manDays: 2.5, note: 'Collaudo' }, 'a2'),
    );
    await assertSucceeds(writeAssignment(editor, EDITOR, { startDate: '2027-01-11' }, 'a2', true));
    await assertSucceeds(getDocs(collection(editor, `${PLAN}/assignments`)));
    await assertSucceeds(deleteRecorded(editor, EDITOR, `${PLAN}/assignments/a2`, 'assignment'));
  });

  it('refuses bad efforts, dates, people and extra fields', async () => {
    await assertFails(
      setDoc(doc(editor, `${PLAN}/assignments/a1`), { ...ASSIGNMENT, ...audit(EDITOR, 'h9') }),
    );
    await assertFails(writeAssignment(editor, EDITOR, { ...ASSIGNMENT, manDays: 0 }));
    await assertFails(writeAssignment(editor, EDITOR, { ...ASSIGNMENT, manDays: 501 }));
    await assertFails(writeAssignment(editor, EDITOR, { ...ASSIGNMENT, manDays: '15' }));
    await assertFails(writeAssignment(editor, EDITOR, { ...ASSIGNMENT, startDate: '15/12/2026' }));
    await assertFails(writeAssignment(editor, EDITOR, { ...ASSIGNMENT, stakeholderId: 'bad id!' }));
    await assertFails(writeAssignment(editor, EDITOR, { ...ASSIGNMENT, note: '' }));
    await assertFails(writeAssignment(editor, EDITOR, { ...ASSIGNMENT, endDate: '2027-01-31' }));
  });

  it('keeps strangers and anonymous visitors out', async () => {
    await assertSucceeds(writeAssignment(editor, EDITOR, ASSIGNMENT));
    await assertFails(writeAssignment(stranger, STRANGER, ASSIGNMENT, 'a2'));
    await assertFails(getDocs(collection(stranger, `${PLAN}/assignments`)));
    await assertFails(getDoc(doc(nobody, `${PLAN}/assignments/a1`)));
    await assertFails(deleteDoc(doc(stranger, `${PLAN}/assignments/a1`)));
  });
});

describe('configuration of the roadmap', () => {
  beforeEach(seedPlan);

  const FIELD: Record<string, unknown> = {
    label: 'Jira epics',
    type: 'url',
    multiple: true,
    required: false,
    main: true,
    position: 2,
  };
  const TEAM: Record<string, unknown> = {
    name: 'QA',
    tag: 'QA',
    colorId: 'ice',
    phase: 'test',
    position: 3,
  };
  const PERSON: Record<string, unknown> = {
    name: 'QA #1',
    teamId: 'qa',
    absences: [],
    position: 0,
  };

  function writeConfig(
    db: Firestore,
    identity: Identity,
    path: 'projectFields' | 'teams' | 'stakeholders' | 'settings',
    id: string,
    data: Record<string, unknown>,
    action = 'create',
  ) {
    const entity = {
      projectFields: 'projectField',
      teams: 'team',
      stakeholders: 'stakeholder',
      settings: 'roadmapSettings',
    }[path];
    const historyId = `h-${id}-${Math.random().toString(36).slice(2)}`;
    const batch = writeBatch(db);
    batch.set(doc(db, `${PLAN}/${path}/${id}`), { ...data, ...audit(identity, historyId) });
    batch.set(doc(db, `${PLAN}/history/${historyId}`), historyEntry(identity, entity, id, action));
    return batch.commit();
  }

  it('accepts fields, teams and people with their history entries, and their replacement', async () => {
    await assertSucceeds(writeConfig(editor, EDITOR, 'projectFields', 'jiraEpics', FIELD));
    await assertSucceeds(
      writeConfig(editor, EDITOR, 'projectFields', 'impactedTeams', {
        ...FIELD,
        label: 'Team impattati',
        description: 'I team il cui lavoro serve.',
        type: 'choice',
        options: [
          { id: 'qa', label: 'QA' },
          { id: 'ba', label: 'BA' },
        ],
      }),
    );
    await assertSucceeds(
      writeConfig(owner, OWNER, 'projectFields', 'jiraEpics', { ...FIELD, main: false }, 'update'),
    );
    // A list of exclusive values that groups the projects, with colored values.
    await assertSucceeds(
      writeConfig(editor, EDITOR, 'projectFields', 'projectSize', {
        ...FIELD,
        label: 'Dimensione',
        type: 'choice',
        multiple: false,
        group: true,
        options: [
          { id: 'big', label: 'Big project', colorId: 'purple' },
          { id: 'small', label: 'Small project' },
        ],
      }),
    );
    await assertSucceeds(
      writeConfig(editor, EDITOR, 'projectFields', 'quickOne', { ...FIELD, quick: true }),
    );
    await assertFails(
      writeConfig(editor, EDITOR, 'projectFields', 'quickOne', { ...FIELD, quick: false }),
    );
    await assertSucceeds(writeConfig(editor, EDITOR, 'teams', 'qa', TEAM));
    await assertSucceeds(
      writeConfig(editor, EDITOR, 'teams', 'ba', {
        ...TEAM,
        name: 'BA',
        tag: 'BA',
        phase: 'analysis',
        formula: '0.12*(ServerSide+iOSDev+AndDev)',
      }),
    );
    await assertSucceeds(writeConfig(editor, EDITOR, 'stakeholders', 'qa-1', PERSON));
    await assertSucceeds(
      writeConfig(editor, EDITOR, 'stakeholders', 'qa-3', { ...PERSON, default: true }),
    );
    await assertSucceeds(
      writeConfig(editor, EDITOR, 'settings', 'roadmap', {
        contingencyFormula: '0.10*(ServerSide+iOSDev+AndDev)',
      }),
    );
    await assertSucceeds(writeConfig(editor, EDITOR, 'settings', 'roadmap', {}, 'update'));
    await assertSucceeds(
      writeConfig(
        editor,
        EDITOR,
        'settings',
        'roadmap',
        { projectColors: 'free', colorFieldId: 'size' },
        'update',
      ),
    );
    await assertSucceeds(
      writeConfig(
        editor,
        EDITOR,
        'settings',
        'roadmap',
        { closures: [{ start: '2026-08-10', end: '2026-08-21', reason: 'Chiusura estiva' }] },
        'update',
      ),
    );
    await assertSucceeds(
      writeConfig(editor, EDITOR, 'stakeholders', 'qa-2', {
        ...PERSON,
        name: 'QA #2',
        info: 'Part time',
        absences: [{ start: '2026-12-20', end: '2027-01-20', reason: 'Ferie' }],
      }),
    );
    await assertSucceeds(getDocs(collection(editor, `${PLAN}/projectFields`)));
    await assertSucceeds(getDocs(collection(editor, `${PLAN}/teams`)));
    await assertSucceeds(getDocs(collection(editor, `${PLAN}/stakeholders`)));
    await assertSucceeds(
      deleteRecorded(editor, EDITOR, `${PLAN}/stakeholders/qa-2`, 'stakeholder'),
    );
    await assertSucceeds(deleteRecorded(editor, EDITOR, `${PLAN}/teams/qa`, 'team'));
    await assertSucceeds(
      deleteRecorded(editor, EDITOR, `${PLAN}/projectFields/jiraEpics`, 'projectField'),
    );
  });

  it('refuses bad ids, a choice without values, values on a link, unknown types and colors', async () => {
    await assertFails(writeConfig(editor, EDITOR, 'projectFields', 'bad id!', FIELD));
    await assertFails(
      writeConfig(editor, EDITOR, 'projectFields', 'x', { ...FIELD, type: 'choice' }),
    );
    await assertFails(
      writeConfig(editor, EDITOR, 'projectFields', 'x', {
        ...FIELD,
        options: [{ id: 'a', label: 'A' }],
      }),
    );
    await assertFails(
      writeConfig(editor, EDITOR, 'projectFields', 'x', { ...FIELD, type: 'attachment' }),
    );
    await assertFails(writeConfig(editor, EDITOR, 'projectFields', 'x', { ...FIELD, label: '' }));
    await assertFails(
      writeConfig(editor, EDITOR, 'projectFields', 'x', { ...FIELD, multiple: 'yes' }),
    );
    await assertFails(
      writeConfig(editor, EDITOR, 'projectFields', 'x', { ...FIELD, position: '2' }),
    );
    // Only a list of exclusive values groups, and the flag is written only when true.
    const choice = {
      ...FIELD,
      type: 'choice',
      multiple: false,
      options: [{ id: 'a', label: 'A' }],
    };
    await assertFails(
      writeConfig(editor, EDITOR, 'projectFields', 'x', { ...choice, multiple: true, group: true }),
    );
    await assertFails(writeConfig(editor, EDITOR, 'projectFields', 'x', { ...FIELD, group: true }));
    await assertFails(
      writeConfig(editor, EDITOR, 'projectFields', 'x', { ...choice, group: false }),
    );
    await assertFails(
      writeConfig(editor, EDITOR, 'projectFields', 'x', { ...choice, group: 'yes' }),
    );
    await assertFails(writeConfig(editor, EDITOR, 'teams', 'qa', { ...TEAM, colorId: 'neon' }));
    await assertFails(writeConfig(editor, EDITOR, 'teams', 'qa', { ...TEAM, tag: '' }));
    await assertFails(writeConfig(editor, EDITOR, 'teams', 'bad id!', TEAM));
    // A phase among the three is required; a formula is text within its limit.
    const { phase: _phase, ...withoutPhase } = TEAM;
    await assertFails(writeConfig(editor, EDITOR, 'teams', 'qa', withoutPhase));
    await assertFails(writeConfig(editor, EDITOR, 'teams', 'qa', { ...TEAM, phase: 'buffer' }));
    await assertFails(writeConfig(editor, EDITOR, 'teams', 'qa', { ...TEAM, formula: 12 }));
    await assertFails(
      writeConfig(editor, EDITOR, 'teams', 'qa', { ...TEAM, formula: 'x'.repeat(201) }),
    );
    // The default flag is written only when true; the settings have one document and few keys.
    await assertFails(
      writeConfig(editor, EDITOR, 'stakeholders', 'qa-1', { ...PERSON, default: false }),
    );
    await assertFails(writeConfig(editor, EDITOR, 'settings', 'other', {}));
    await assertFails(
      writeConfig(editor, EDITOR, 'settings', 'roadmap', { contingencyFormula: 10 }),
    );
    await assertFails(writeConfig(editor, EDITOR, 'settings', 'roadmap', { colors: 'free' }));
    await assertFails(
      writeConfig(editor, EDITOR, 'settings', 'roadmap', { projectColors: 'rainbow' }),
    );
    await assertFails(
      writeConfig(editor, EDITOR, 'settings', 'roadmap', { closures: '2026-08-10' }),
    );
    await assertFails(
      writeConfig(editor, EDITOR, 'settings', 'roadmap', {
        closures: Array.from({ length: 101 }, () => ({ start: '2026-08-10', end: '2026-08-10' })),
      }),
    );
    await assertFails(
      writeConfig(editor, EDITOR, 'stakeholders', 'qa-1', { ...PERSON, teamId: '' }),
    );
    await assertFails(
      writeConfig(editor, EDITOR, 'stakeholders', 'qa-1', { ...PERSON, absences: 'x' }),
    );
    await assertFails(
      writeConfig(editor, EDITOR, 'stakeholders', 'qa-1', { ...PERSON, email: 'x' }),
    );
  });

  it('keeps strangers and anonymous visitors out', async () => {
    await assertSucceeds(writeConfig(editor, EDITOR, 'teams', 'qa', TEAM));
    await assertFails(writeConfig(stranger, STRANGER, 'teams', 'ba', TEAM));
    await assertFails(getDocs(collection(stranger, `${PLAN}/teams`)));
    await assertFails(getDoc(doc(nobody, `${PLAN}/teams/qa`)));
    await assertFails(deleteDoc(doc(stranger, `${PLAN}/teams/qa`)));
  });
});

describe('milestones', () => {
  beforeEach(seedPlan);

  const MILESTONE: Record<string, unknown> = {
    date: '2026-11-20',
    title: 'Demo al cliente',
    colorId: 'purple',
    projectId: 'p1',
  };

  function writeMilestone(
    db: Firestore,
    identity: Identity,
    data: Record<string, unknown>,
    id = 'm1',
    update = false,
  ) {
    const historyId = `h-${id}-${Math.random().toString(36).slice(2)}`;
    const batch = writeBatch(db);
    const ref = doc(db, `${PLAN}/milestones/${id}`);
    if (update) batch.update(ref, { ...data, ...audit(identity, historyId) });
    else batch.set(ref, { ...data, ...audit(identity, historyId) });
    batch.set(
      doc(db, `${PLAN}/history/${historyId}`),
      historyEntry(identity, 'milestone', id, update ? 'update' : 'create'),
    );
    return batch.commit();
  }

  it('accepts a note of a project or of none, with text and alert, and its history entry', async () => {
    await assertSucceeds(writeMilestone(editor, EDITOR, MILESTONE));
    await assertSucceeds(
      writeMilestone(
        owner,
        OWNER,
        { date: '2026-12-18', title: 'Code freeze', colorId: 'red', body: 'Fermi', remind: true },
        'm2',
      ),
    );
    await assertSucceeds(writeMilestone(editor, EDITOR, { date: '2026-12-19' }, 'm2', true));
    await assertSucceeds(getDocs(collection(editor, `${PLAN}/milestones`)));
    await assertSucceeds(deleteRecorded(editor, EDITOR, `${PLAN}/milestones/m2`, 'milestone'));
  });

  it('refuses a note without its history entry, or that is not one', async () => {
    await assertFails(
      setDoc(doc(editor, `${PLAN}/milestones/m3`), { ...MILESTONE, ...audit(EDITOR, 'h9') }),
    );
    await assertFails(writeMilestone(editor, EDITOR, { ...MILESTONE, title: '' }));
    await assertFails(writeMilestone(editor, EDITOR, { ...MILESTONE, date: '20/11/2026' }));
    await assertFails(writeMilestone(editor, EDITOR, { ...MILESTONE, colorId: 'rainbow' }));
    await assertFails(writeMilestone(editor, EDITOR, { ...MILESTONE, remind: false }));
    await assertFails(writeMilestone(editor, EDITOR, { ...MILESTONE, status: 'done' }));
  });

  it('keeps strangers and anonymous visitors out', async () => {
    await assertSucceeds(writeMilestone(editor, EDITOR, MILESTONE));
    await assertFails(writeMilestone(stranger, STRANGER, MILESTONE, 'm2'));
    await assertFails(getDocs(collection(stranger, `${PLAN}/milestones`)));
    await assertFails(getDoc(doc(nobody, `${PLAN}/milestones/m1`)));
    await assertFails(deleteDoc(doc(stranger, `${PLAN}/milestones/m1`)));
  });
});

describe('the history of every change', () => {
  beforeEach(seedPlan);

  it('wants a new entry: an entry written before records no change', async () => {
    // h0 is the entry of the plan's creation.
    await assertFails(setDoc(doc(editor, `${PLAN}/tasks/t2`), { ...TASK, ...audit(EDITOR, 'h0') }));
    const early = writeBatch(editor);
    early.set(doc(editor, `${PLAN}/history/early`), historyEntry(EDITOR, 'task', 't2'));
    await assertSucceeds(early.commit());
    await assertFails(
      setDoc(doc(editor, `${PLAN}/tasks/t2`), { ...TASK, ...audit(EDITOR, 'early') }),
    );
  });

  it('records every deletion, in the same batch, through the writer of the batch', async () => {
    const path = `${PLAN}/tasks/t1`;
    await assertFails(deleteDoc(doc(editor, path)));
    // The writer's document naming an entry that exists already.
    const reused = writeBatch(editor);
    reused.delete(doc(editor, path));
    reused.set(writerDoc(editor, EDITOR), { historyId: 'h0', at: serverTimestamp() });
    await assertFails(reused.commit());
    // A new entry, but no writer's document to name it.
    const unnamed = writeBatch(editor);
    unnamed.delete(doc(editor, path));
    unnamed.set(doc(editor, `${PLAN}/history/del-1`), historyEntry(EDITOR, 'task', 't1', 'delete'));
    await assertFails(unnamed.commit());
    // The writer's document of someone else, or of another time.
    const other = writeBatch(editor);
    other.delete(doc(editor, path));
    other.set(doc(editor, `${PLAN}/history/del-2`), historyEntry(EDITOR, 'task', 't1', 'delete'));
    other.set(writerDoc(editor, OWNER), { historyId: 'del-2', at: serverTimestamp() });
    await assertFails(other.commit());
    const stale = writeBatch(editor);
    stale.delete(doc(editor, path));
    stale.set(doc(editor, `${PLAN}/history/del-3`), historyEntry(EDITOR, 'task', 't1', 'delete'));
    stale.set(writerDoc(editor, EDITOR), {
      historyId: 'del-3',
      at: Timestamp.fromDate(new Date('2026-01-01')),
    });
    await assertFails(stale.commit());
    await assertSucceeds(deleteRecorded(editor, EDITOR, path, 'task'));
    // Nobody reads the writers' documents, nor deletes them.
    await assertFails(getDoc(writerDoc(editor, EDITOR)));
    await assertFails(deleteDoc(writerDoc(editor, EDITOR)));
  });

  it('deletes many documents under one entry, as a project with its work or a restore', async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      for (let index = 0; index < 60; index += 1) {
        await context
          .firestore()
          .doc(`${PLAN}/tasks/many-${index}`)
          .set({ ...TASK, ...audit(OWNER, 'h0'), updatedAt: new Date() });
      }
    });
    await assertSucceeds(
      recordedChange(
        owner,
        OWNER,
        (batch) => {
          for (let index = 0; index < 60; index += 1) {
            batch.delete(doc(owner, `${PLAN}/tasks/many-${index}`));
          }
        },
        ['plan', 'main', 'import'],
      ),
    );
  });

  it('wants the actor as the member is, and entries within their limits', async () => {
    const entry = (data: Record<string, unknown>) => {
      const batch = writeBatch(editor);
      batch.set(doc(editor, `${PLAN}/tasks/t2`), { ...TASK, ...audit(EDITOR, 'h-t2') });
      batch.set(doc(editor, `${PLAN}/history/h-t2`), {
        ...historyEntry(EDITOR, 'task', 't2'),
        ...data,
      });
      return batch.commit();
    };
    await assertFails(entry({ actor: { ...actor(EDITOR), login: OWNER.login } }));
    await assertFails(entry({ actor: { ...actor(EDITOR), role: 'owner' } }));
    await assertFails(entry({ entityId: '' }));
    await assertFails(entry({ entityId: 'x'.repeat(101) }));
    await assertFails(entry({ summary: 'x'.repeat(501) }));
    await assertFails(entry({ before: 'tutto' }));
    await assertFails(entry({ after: ['x'] }));
    await assertSucceeds(entry({ summary: 'Collaudo', before: {}, after: { title: 'Collaudo' } }));
  });

  it('leaves creating the plan and restoring it to the owner', async () => {
    const write = (db: Firestore, identity: Identity, entity: string, action: string) =>
      setDoc(
        doc(db, `${PLAN}/history/${newEntryId()}`),
        historyEntry(identity, entity, 'main', action),
      );
    await assertFails(write(editor, EDITOR, 'plan', 'setup'));
    await assertFails(write(editor, EDITOR, 'plan', 'import'));
    await assertSucceeds(write(owner, OWNER, 'plan', 'import'));
    // The forecast and the configuration keep no authors: every member imports them.
    await assertSucceeds(write(editor, EDITOR, 'metric', 'import'));
    await assertSucceeds(write(editor, EDITOR, 'roadmapSettings', 'import'));
  });
});

describe('the values the rules check', () => {
  beforeEach(seedPlan);

  it('takes only real months and days', async () => {
    await assertFails(createTask(editor, EDITOR, 'x1', { ...TASK, startDate: '2026-13-01' }));
    await assertFails(createTask(editor, EDITOR, 'x2', { ...TASK, endDate: '2026-09-45' }));
    await assertFails(createTask(editor, EDITOR, 'x3', { ...TASK, startDate: '2026-00-10' }));
    await assertSucceeds(createTask(editor, EDITOR, 'x4', { ...TASK, endDate: '2026-09-30' }));
  });

  it('takes lists of text only, within their limits', async () => {
    await assertFails(createTask(editor, EDITOR, 'x1', { ...TASK, deliverables: 'Revisione' }));
    await assertFails(createTask(editor, EDITOR, 'x2', { ...TASK, deliverables: [{ a: 1 }] }));
    await assertFails(
      createTask(editor, EDITOR, 'x3', { ...TASK, deliverables: ['x'.repeat(20001)] }),
    );
    await assertSucceeds(
      createTask(editor, EDITOR, 'x4', { ...TASK, deliverables: ['Revisione'] }),
    );
  });

  it('keeps the one metric of the plan', async () => {
    const write = (metricId: string) => {
      const batch = writeBatch(editor);
      batch.set(doc(editor, `${PLAN}/metrics/${metricId}/values/2026-09-10`), {
        value: 10,
        ...audit(EDITOR, `h-${metricId}`),
      });
      batch.set(
        doc(editor, `${PLAN}/history/h-${metricId}`),
        historyEntry(EDITOR, 'metric', metricId, 'update'),
      );
      return batch.commit();
    };
    await assertFails(write('metric-2'));
    await assertSucceeds(write('metric-1'));
  });
});

describe('the email domains the owner admits', () => {
  const OWNER_AT_WORK: Identity = { ...OWNER, email: 'Owner@Example.com', emailVerified: true };
  const EDITOR_AT_WORK: Identity = { ...EDITOR, email: 'editor@example.com', emailVerified: true };
  const EDITOR_AT_HOME: Identity = { ...EDITOR, email: 'editor@example.org', emailVerified: true };
  const EDITOR_UNVERIFIED: Identity = {
    ...EDITOR,
    email: 'editor@example.com',
    emailVerified: false,
  };

  beforeEach(seedPlan);

  function writeAccess(db: Firestore, identity: Identity, domains: unknown) {
    const historyId = newEntryId();
    const batch = writeBatch(db);
    batch.set(doc(db, `${PLAN}/settings/access`), { domains, ...audit(identity, historyId) });
    batch.set(
      doc(db, `${PLAN}/history/${historyId}`),
      historyEntry(identity, 'access', 'access', 'update'),
    );
    return batch.commit();
  }

  it('lets only the owner set them, never leaving themselves out', async () => {
    const ownerAtWork = clientAs(OWNER_AT_WORK);
    await assertFails(writeAccess(clientAs(EDITOR_AT_WORK), EDITOR_AT_WORK, ['example.com']));
    // The owner's own email must stay admitted, verified.
    await assertFails(writeAccess(ownerAtWork, OWNER_AT_WORK, ['example.org']));
    await assertFails(writeAccess(owner, OWNER, ['example.com']));
    await assertFails(writeAccess(ownerAtWork, OWNER_AT_WORK, ['Example.com']));
    await assertFails(writeAccess(ownerAtWork, OWNER_AT_WORK, []));
    await assertFails(writeAccess(ownerAtWork, OWNER_AT_WORK, 'example.com'));
    await assertSucceeds(writeAccess(ownerAtWork, OWNER_AT_WORK, ['example.com', 'example.org']));
  });

  it('keeps everyone else out, plan name included, once they are set', async () => {
    await assertSucceeds(getDocs(collection(clientAs(EDITOR_AT_HOME), `${PLAN}/tasks`)));
    await assertSucceeds(writeAccess(clientAs(OWNER_AT_WORK), OWNER_AT_WORK, ['example.com']));
    await assertSucceeds(getDocs(collection(clientAs(EDITOR_AT_WORK), `${PLAN}/tasks`)));
    await assertFails(getDocs(collection(clientAs(EDITOR_AT_HOME), `${PLAN}/tasks`)));
    await assertFails(getDocs(collection(clientAs(EDITOR_UNVERIFIED), `${PLAN}/tasks`)));
    // An address with two "@" is not of the domain that follows the first one.
    const twoAts: Identity = { ...EDITOR, email: 'x@example.com@example.org', emailVerified: true };
    await assertFails(getDocs(collection(clientAs(twoAts), `${PLAN}/tasks`)));
    await assertFails(getDocs(collection(editor, `${PLAN}/tasks`)));
    await assertFails(getDoc(doc(clientAs(EDITOR_AT_HOME), PLAN)));
    await assertFails(getDoc(doc(clientAs(EDITOR_AT_HOME), `${PLAN}/members/${EDITOR.githubId}`)));
    await assertFails(createTask(clientAs(EDITOR_AT_HOME), EDITOR_AT_HOME, 't2'));
    await assertSucceeds(createTask(clientAs(EDITOR_AT_WORK), EDITOR_AT_WORK, 't2'));
    // The owner turns the check off by deleting the list.
    await assertSucceeds(
      deleteRecorded(clientAs(OWNER_AT_WORK), OWNER_AT_WORK, `${PLAN}/settings/access`, 'access'),
    );
    await assertSucceeds(getDocs(collection(clientAs(EDITOR_AT_HOME), `${PLAN}/tasks`)));
  });
});

describe('projects of the versions before 0.16', () => {
  beforeEach(seedPlan);

  it('change only by dropping the planned end and the days of the project', async () => {
    await env.withSecurityRulesDisabled((context) =>
      context
        .firestore()
        .doc(`${PLAN}/projects/old`)
        .set({
          title: 'Vecchio',
          startDate: '2026-09-10',
          endDate: '2026-12-20',
          manDays: 20,
          colorId: 'purple',
          status: 'planned',
          ...audit(OWNER, 'h0'),
          updatedAt: new Date(),
        }),
    );
    const change = (data: Record<string, unknown>) => {
      const batch = writeBatch(editor);
      const historyId = newEntryId();
      batch.update(doc(editor, `${PLAN}/projects/old`), { ...data, ...audit(EDITOR, historyId) });
      batch.set(
        doc(editor, `${PLAN}/history/${historyId}`),
        historyEntry(EDITOR, 'project', 'old', 'update'),
      );
      return batch.commit();
    };
    await assertFails(change({ title: 'Nuovo' }));
    await assertSucceeds(
      change({ title: 'Nuovo', endDate: deleteField(), manDays: deleteField() }),
    );
  });
});
