import type { HistoryAction, HistoryEntry } from './history';

// Undo and redo of one's own changes (0.22). Every change written since the 0.22 keeps in its
// history entry the documents it wrote, as they were before and after: undoing it writes them back
// as they were before, redoing it as they were after. An undo or a redo is a change like the others,
// recorded as the inverse change, that points to the entry it undoes or does again. The stacks of a
// member are read from the history, so they last across reloads and devices.

type Data = Record<string, unknown>;

/** A document a change wrote, by its path in the plan: null when it did not exist, or no more. */
export interface UndoDocument {
  path: string;
  before: Data | null;
  after: Data | null;
}

/** What a history entry keeps to undo its change, or which entry an undo or a redo is about. */
export interface UndoRecord {
  /** The documents of a change that can be undone. */
  documents?: UndoDocument[];
  /** This entry undoes that one. */
  reverts?: string;
  /** This entry does again that one, undone before. */
  reapplies?: string;
}

/** A write of a batch, as the undo reads it: no audit fields, the removed fields by name. */
export type DocumentWrite =
  | { kind: 'set'; path: string; data: Data; merge?: boolean }
  | { kind: 'update'; path: string; data: Data; removed: readonly string[] }
  | { kind: 'delete'; path: string };

/** Most documents an entry keeps, as one batch writes them; the security rules say the same. */
export const UNDO_DOCUMENTS_MAX = 500;

/**
 * Most bytes the documents of an entry take: a Firestore document holds at most 1 MiB, and the
 * entry also keeps the fields before and after for the history page.
 */
export const UNDO_BYTES_MAX = 600_000;

/** How many recent entries of the plan the stacks are read from: older ones are out of reach. */
export const UNDO_WINDOW = 200;

/** Who, when and which entry: fields that every write carries and that the undo writes anew. */
export const AUDIT_FIELDS: readonly string[] = ['updatedAt', 'updatedBy', 'lastHistoryId'];

// The collections of the plan whose changes can be undone. The members, the email domains, the
// name of the plan and the private notes never are: they belong to the owner, or to one member.
const UNDOABLE = [
  /^lanes\/[^/]+$/,
  /^tasks\/[^/]+$/,
  /^metrics\/[^/]+$/,
  /^metrics\/[^/]+\/values\/[^/]+$/,
  /^notes\/[^/]+$/,
  /^memos\/[^/]+$/,
  /^projects\/[^/]+$/,
  /^projectNotes\/[^/]+$/,
  /^assignments\/[^/]+$/,
  /^milestones\/[^/]+$/,
  /^projectFields\/[^/]+$/,
  /^teams\/[^/]+$/,
  /^stakeholders\/[^/]+$/,
  /^settings\/roadmap$/,
  /^contacts\/[^/]+$/,
  /^contactNotes\/[^/]+$/,
];

/** Bookkeeping of the rules, written with a change and never undone. */
const BOOKKEEPING = /^writers\/[^/]+$/;

export function isBookkeepingPath(path: string): boolean {
  return BOOKKEEPING.test(path);
}

export function isUndoablePath(path: string): boolean {
  return UNDOABLE.some((pattern) => pattern.test(path));
}

function isData(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A document without the fields that say who wrote it and when. */
export function withoutAudit(data: Data): Data {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !AUDIT_FIELDS.includes(key)));
}

/** A set with merge: the maps of the new data go into those of the old one. */
function merged(before: Data, data: Data): Data {
  const next: Data = { ...before };
  for (const [key, value] of Object.entries(data)) {
    const old = next[key];
    next[key] = isData(old) && isData(value) ? merged(old, value) : value;
  }
  return next;
}

/** Equal content, whatever the order of the keys. */
export function sameContent(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => sameContent(item, b[index]))
    );
  }
  if (!isData(a) || !isData(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => key in b && sameContent(a[key], b[key]))
  );
}

/**
 * The documents a batch writes, before and after, from what they hold now; null when the batch
 * touches a document that is never undone, so that the change is not undoable at all.
 */
export function undoDocuments(
  writes: readonly DocumentWrite[],
  current: (path: string) => Data | null,
): UndoDocument[] | null {
  const documents = new Map<string, UndoDocument>();
  for (const write of writes) {
    if (isBookkeepingPath(write.path)) continue;
    if (!isUndoablePath(write.path)) return null;
    const document = documents.get(write.path) ?? {
      path: write.path,
      before: current(write.path),
      after: current(write.path),
    };
    const state = document.after;
    if (write.kind === 'delete') {
      document.after = null;
    } else if (write.kind === 'set') {
      const data = withoutAudit(write.data);
      document.after = write.merge && state ? merged(state, data) : data;
    } else {
      // An update of a document that is not there fails: the batch would not be written either.
      if (!state) return null;
      const next = merged({}, state);
      for (const [key, value] of Object.entries(withoutAudit(write.data))) next[key] = value;
      for (const key of write.removed) delete next[key];
      document.after = next;
    }
    documents.set(write.path, document);
  }
  const changed = [...documents.values()].filter(
    (document) => !sameContent(document.before, document.after),
  );
  return changed.length > 0 && changed.length <= UNDO_DOCUMENTS_MAX ? changed : null;
}

/** Whether the documents fit in a history entry, with room for the rest of it. */
export function fitsInHistory(documents: readonly UndoDocument[]): boolean {
  return new TextEncoder().encode(JSON.stringify(documents)).length <= UNDO_BYTES_MAX;
}

/** The change of an entry can be undone: it kept its documents. */
export function isUndoable(entry: HistoryEntry): boolean {
  return Boolean(entry.undo?.documents && entry.undo.documents.length > 0);
}

/** The changes a member can undo and redo, the next one last. */
export interface UndoStacks {
  undo: HistoryEntry[];
  redo: HistoryEntry[];
}

/**
 * The stacks of a member, from the recent entries of the plan, most recent first. A change of
 * theirs that cannot be undone (made before the 0.22, an import, a member) empties both stacks,
 * as a new change empties the redo one: the stacks only reach back to it.
 */
export function undoStacks(entries: readonly HistoryEntry[], githubId: string): UndoStacks {
  let undo: HistoryEntry[] = [];
  let redo: HistoryEntry[] = [];
  const mine = entries.filter((entry) => entry.actor.githubId === githubId).reverse();
  for (const entry of mine) {
    const { reverts, reapplies } = entry.undo ?? {};
    if (reverts !== undefined || reapplies !== undefined) {
      const [from, to] = reverts !== undefined ? [undo, redo] : [redo, undo];
      const top = from.at(-1);
      if (top && top.id === (reverts ?? reapplies)) {
        from.pop();
        to.push(top);
      } else {
        // An undo of something out of reach: the stacks start again after it.
        undo = [];
        redo = [];
      }
    } else if (isUndoable(entry)) {
      undo.push(entry);
      redo = [];
    } else {
      undo = [];
      redo = [];
    }
  }
  return { undo, redo };
}

/** Words that name the changed thing in `after` only, as the history page reads them. */
const NAMING = ['title', 'name', 'label', 'text', 'login'];

const INVERSE_ACTIONS: Partial<Record<HistoryAction, HistoryAction>> = {
  create: 'delete',
  delete: 'create',
  update: 'update',
};

/** What the history records for the undo of an entry: the same change, the other way round. */
export function inverseChange(entry: HistoryEntry): {
  action: HistoryAction;
  before?: Data;
  after?: Data;
} {
  const action = INVERSE_ACTIONS[entry.action] ?? entry.action;
  if (entry.action !== 'update') {
    return { action, before: entry.after, after: entry.before };
  }
  // An update keeps in `before` what changed, and in `after` the same fields with the names.
  const before = entry.before ?? {};
  const after = entry.after ?? {};
  const changed = [
    ...new Set([
      ...Object.keys(before),
      ...Object.keys(after).filter((key) => !NAMING.includes(key)),
    ]),
  ];
  const pick = (from: Data, keys: readonly string[]) =>
    Object.fromEntries(
      keys.filter((key) => from[key] !== undefined).map((key) => [key, from[key]]),
    );
  const names = Object.keys(after).filter((key) => !changed.includes(key));
  return {
    action,
    before: pick(after, changed),
    after: { ...pick(after, names), ...pick(before, changed) },
  };
}

/** Why a change cannot be undone, or done again, now; null when it can. */
export function undoBlocker(
  documents: readonly UndoDocument[],
  direction: 'undo' | 'redo',
  current: (path: string) => Data | null,
  githubId: string,
): string | null {
  const [expected, target] = direction === 'undo' ? ['after', 'before'] : ['before', 'after'];
  const changed = documents.some(
    (document) => !sameContent(current(document.path), document[expected as 'after' | 'before']),
  );
  if (changed) {
    return direction === 'undo'
      ? 'Dopo questa modifica qualcuno ha cambiato le stesse cose: annullarla cancellerebbe il suo lavoro.'
      : 'Dopo l’annullamento qualcuno ha cambiato le stesse cose: ripeterla cancellerebbe il suo lavoro.';
  }
  // A note comes back only by its author: the rules never let anyone write in someone else's name.
  const foreign = documents.some((document) => {
    const content = document[target as 'after' | 'before'];
    const author = content?.author;
    return (
      current(document.path) === null &&
      isData(author) &&
      typeof author.id === 'string' &&
      author.id !== githubId
    );
  });
  if (foreign) {
    return 'Riporterebbe una nota scritta da un altro membro, che solo lui può scrivere di nuovo.';
  }
  return null;
}

/** The undo record of a history entry, as read back; undefined when it is missing or unknown. */
export function parseUndoRecord(value: unknown): UndoRecord | undefined {
  if (!isData(value)) return undefined;
  const record: UndoRecord = {};
  if (typeof value.reverts === 'string') record.reverts = value.reverts;
  if (typeof value.reapplies === 'string') record.reapplies = value.reapplies;
  if (Array.isArray(value.documents)) {
    const documents: UndoDocument[] = [];
    for (const item of value.documents) {
      if (!isData(item) || typeof item.path !== 'string' || !isUndoablePath(item.path)) {
        return undefined;
      }
      const { before, after } = item;
      if ((before !== null && !isData(before)) || (after !== null && !isData(after))) {
        return undefined;
      }
      documents.push({ path: item.path, before, after });
    }
    record.documents = documents;
  }
  return Object.keys(record).length > 0 ? record : undefined;
}
