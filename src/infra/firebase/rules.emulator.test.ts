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
    batch.set(doc(db, `${PLAN}/history/${historyId}`), historyEntry(identity, 'memo', id, action));
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
    await assertFails(writeMemo(editor, EDITOR, { ...MEMO, colorId: 'pink' }));
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
    // A backup restored by the owner keeps the notes the editor wrote, and the history says so.
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
    await assertSucceeds(deleteDoc(doc(editor, `${PLAN}/memos/m1`)));
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
    endDate: '2026-12-20',
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
    await assertSucceeds(writeProject(editor, EDITOR, { endDate: '2027-01-31' }, 'p2', true));
    await assertSucceeds(getDocs(collection(editor, `${PLAN}/projects`)));
    await assertSucceeds(deleteDoc(doc(editor, `${PLAN}/projects/p2`)));
  });

  it('refuses a project without a history entry, and bad fields', async () => {
    await assertFails(
      setDoc(doc(editor, `${PLAN}/projects/p1`), { ...PROJECT, ...audit(EDITOR, 'h9') }),
    );
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, title: '' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, title: 'x'.repeat(201) }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, endDate: '2026-09-01' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, startDate: '10/09/2026' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, colorId: 'pink' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, status: 'blocked' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, owner: '' }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, description: 'x'.repeat(5001) }));
    await assertFails(writeProject(editor, EDITOR, { ...PROJECT, progress: 50 }));
  });

  it('keeps strangers and anonymous visitors out', async () => {
    await assertSucceeds(writeProject(editor, EDITOR, PROJECT));
    await assertFails(writeProject(stranger, STRANGER, PROJECT, 'p2'));
    await assertFails(getDocs(collection(stranger, `${PLAN}/projects`)));
    await assertFails(getDoc(doc(nobody, `${PLAN}/projects/p1`)));
    await assertFails(deleteDoc(doc(stranger, `${PLAN}/projects/p1`)));
  });
});
