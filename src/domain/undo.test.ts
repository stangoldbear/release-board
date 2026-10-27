import { describe, expect, it } from 'vitest';
import type { HistoryEntry } from './history';
import {
  UNDO_BYTES_MAX,
  UNDO_DOCUMENTS_MAX,
  fitsInHistory,
  inverseChange,
  isUndoablePath,
  parseUndoRecord,
  sameContent,
  undoBlocker,
  undoDocuments,
  undoStacks,
  withoutAudit,
} from './undo';
import type { DocumentWrite, UndoDocument } from './undo';

const ME = '1001';
const OTHER = '1002';

function entry(id: string, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id,
    entity: 'task',
    entityId: 't1',
    action: 'update',
    actor: { uid: `uid-${ME}`, githubId: ME, login: 'me' },
    at: null,
    undo: { documents: [{ path: 'tasks/t1', before: { title: 'A' }, after: { title: 'B' } }] },
    ...overrides,
  };
}

/** Entries from the oldest, as a list newest first like the history reads them. */
const newestFirst = (...entries: HistoryEntry[]) => [...entries].reverse();

describe('the documents a change writes', () => {
  const stored: Record<string, Record<string, unknown>> = {
    'tasks/t1': { title: 'A', laneId: 'l1', description: 'old' },
    'metrics/default/values/2026-10-01': { value: 5, approval: 'green' },
  };
  const current = (path: string) => stored[path] ?? null;

  it('are kept before and after, without the audit fields and the bookkeeping of the rules', () => {
    const writes: DocumentWrite[] = [
      {
        kind: 'update',
        path: 'tasks/t1',
        data: { title: 'B', updatedBy: 'uid' },
        removed: ['description'],
      },
      { kind: 'set', path: 'tasks/t2', data: { title: 'New', lastHistoryId: 'h1' } },
      { kind: 'set', path: 'writers/uid', data: { historyId: 'h1' } },
    ];
    expect(undoDocuments(writes, current)).toEqual([
      {
        path: 'tasks/t1',
        before: { title: 'A', laneId: 'l1', description: 'old' },
        after: { title: 'B', laneId: 'l1' },
      },
      { path: 'tasks/t2', before: null, after: { title: 'New' } },
    ]);
  });

  it('follow a merge, and a deletion', () => {
    const writes: DocumentWrite[] = [
      {
        kind: 'set',
        path: 'metrics/default/values/2026-10-01',
        data: { value: 7 },
        merge: true,
      },
      { kind: 'delete', path: 'tasks/t1' },
    ];
    expect(undoDocuments(writes, current)).toEqual([
      {
        path: 'metrics/default/values/2026-10-01',
        before: { value: 5, approval: 'green' },
        after: { value: 7, approval: 'green' },
      },
      { path: 'tasks/t1', before: stored['tasks/t1'], after: null },
    ]);
  });

  it('leave out what did not change, and make nothing to undo when nothing did', () => {
    const same: DocumentWrite = {
      kind: 'update',
      path: 'tasks/t1',
      data: { title: 'A' },
      removed: [],
    };
    expect(undoDocuments([same], current)).toBeNull();
  });

  it('make a change that touches a member, a private note or the email domains not undoable', () => {
    for (const path of ['members/1001', 'members/1001/memos/m1', 'settings/access']) {
      expect(isUndoablePath(path)).toBe(false);
      expect(undoDocuments([{ kind: 'delete', path }], current)).toBeNull();
    }
    expect(isUndoablePath('settings/roadmap')).toBe(true);
    expect(isUndoablePath('contactNotes/n1')).toBe(true);
  });

  it('are too many beyond one batch', () => {
    const writes: DocumentWrite[] = Array.from({ length: UNDO_DOCUMENTS_MAX + 1 }, (_, index) => ({
      kind: 'set',
      path: `tasks/n${index}`,
      data: { title: 'x' },
    }));
    expect(undoDocuments(writes, current)).toBeNull();
    expect(undoDocuments(writes.slice(1), current)).toHaveLength(UNDO_DOCUMENTS_MAX);
  });

  it('fit in a history entry up to a size', () => {
    const big = (size: number): UndoDocument[] => [
      { path: 'memos/m1', before: null, after: { body: 'é'.repeat(size) } },
    ];
    expect(fitsInHistory(big(1000))).toBe(true);
    // Accents take two bytes: the size is counted as stored.
    expect(fitsInHistory(big(UNDO_BYTES_MAX / 2))).toBe(false);
  });

  it('compare by content, whatever the order of the keys', () => {
    expect(sameContent({ a: 1, b: [{ c: 2, d: 3 }] }, { b: [{ d: 3, c: 2 }], a: 1 })).toBe(true);
    expect(sameContent({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(sameContent([1, 2], [2, 1])).toBe(false);
    expect(sameContent(null, null)).toBe(true);
    expect(withoutAudit({ title: 'A', updatedAt: 1, updatedBy: 'u', lastHistoryId: 'h' })).toEqual({
      title: 'A',
    });
  });
});

describe('the stacks of a member', () => {
  it('undo from the latest change back, and redo what was undone', () => {
    const [a, b] = [entry('a'), entry('b')];
    expect(undoStacks(newestFirst(a, b), ME)).toEqual({ undo: [a, b], redo: [] });
    const undoB = entry('u1', { undo: { reverts: 'b' } });
    const undoA = entry('u2', { undo: { reverts: 'a' } });
    expect(undoStacks(newestFirst(a, b, undoB, undoA), ME)).toEqual({ undo: [], redo: [b, a] });
    const redoA = entry('r1', { undo: { reapplies: 'a' } });
    expect(undoStacks(newestFirst(a, b, undoB, undoA, redoA), ME)).toEqual({
      undo: [a],
      redo: [b],
    });
  });

  it('forget the redo with a new change, and everything with one that cannot be undone', () => {
    const [a, b, c] = [entry('a'), entry('b'), entry('c')];
    const undoB = entry('u1', { undo: { reverts: 'b' } });
    expect(undoStacks(newestFirst(a, b, undoB, c), ME)).toEqual({ undo: [a, c], redo: [] });
    const imported = entry('i', { action: 'import', undo: undefined });
    expect(undoStacks(newestFirst(a, b, imported, c), ME)).toEqual({ undo: [c], redo: [] });
  });

  it('hold only the changes of the member', () => {
    const mine = entry('a');
    const theirs = entry('b', { actor: { uid: 'x', githubId: OTHER, login: 'other' } });
    expect(undoStacks(newestFirst(mine, theirs), ME)).toEqual({ undo: [mine], redo: [] });
  });

  it('start again after an undo of something out of reach', () => {
    const lost = entry('u1', { undo: { reverts: 'gone' } });
    const after = entry('b');
    expect(undoStacks(newestFirst(entry('a'), lost, after), ME)).toEqual({
      undo: [after],
      redo: [],
    });
  });
});

describe('the change that undoes another', () => {
  it('deletes what was added and adds back what was deleted', () => {
    const content = { title: 'Rilascio', laneId: 'l1' };
    expect(inverseChange(entry('a', { action: 'create', after: content }))).toEqual({
      action: 'delete',
      before: content,
      after: undefined,
    });
    expect(inverseChange(entry('a', { action: 'delete', before: content }))).toEqual({
      action: 'create',
      before: undefined,
      after: content,
    });
  });

  it('turns the fields of an update back, keeping what names the thing', () => {
    expect(
      inverseChange(
        entry('a', { before: { status: 'todo' }, after: { title: 'Rilascio', status: 'done' } }),
      ),
    ).toEqual({
      action: 'update',
      before: { status: 'done' },
      after: { title: 'Rilascio', status: 'todo' },
    });
    // A field that was empty before: the undo empties it again.
    expect(
      inverseChange(entry('a', { before: {}, after: { title: 'Rilascio', description: 'x' } })),
    ).toEqual({ action: 'update', before: { description: 'x' }, after: { title: 'Rilascio' } });
    // The name itself changed.
    expect(inverseChange(entry('a', { before: { name: 'QA' }, after: { name: 'Test' } }))).toEqual({
      action: 'update',
      before: { name: 'Test' },
      after: { name: 'QA' },
    });
  });
});

describe('what keeps a change from being undone', () => {
  const documents: UndoDocument[] = [
    { path: 'projectNotes/n1', before: { text: 'a', author: { id: OTHER } }, after: null },
    { path: 'projects/p1', before: { title: 'P' }, after: { title: 'Q' } },
  ];

  it('is a change made since by someone else', () => {
    const now: Record<string, Record<string, unknown>> = { 'projects/p1': { title: 'R' } };
    expect(undoBlocker(documents, 'undo', (path) => now[path] ?? null, ME)).toMatch(
      /qualcuno ha cambiato/,
    );
  });

  it('is a note that would come back in the name of another member', () => {
    const now: Record<string, Record<string, unknown>> = { 'projects/p1': { title: 'Q' } };
    expect(undoBlocker(documents, 'undo', (path) => now[path] ?? null, ME)).toMatch(/altro membro/);
    expect(undoBlocker(documents, 'undo', (path) => now[path] ?? null, OTHER)).toBeNull();
  });

  it('is checked the other way round for a redo', () => {
    const now: Record<string, Record<string, unknown>> = {
      'projects/p1': { title: 'P' },
      'projectNotes/n1': { text: 'a', author: { id: OTHER } },
    };
    expect(undoBlocker(documents, 'redo', (path) => now[path] ?? null, ME)).toBeNull();
  });
});

describe('the undo record read back', () => {
  it('keeps the documents of the plan and the entries pointed to', () => {
    const documents = [{ path: 'tasks/t1', before: null, after: { title: 'A' } }];
    expect(parseUndoRecord({ documents })).toEqual({ documents });
    expect(parseUndoRecord({ reverts: 'h1' })).toEqual({ reverts: 'h1' });
    expect(parseUndoRecord({ reapplies: 'h1' })).toEqual({ reapplies: 'h1' });
  });

  it('drops a record that does not fit', () => {
    expect(parseUndoRecord(undefined)).toBeUndefined();
    expect(parseUndoRecord({})).toBeUndefined();
    expect(parseUndoRecord({ documents: [{ path: 'members/1', before: null, after: null }] })).toBe(
      undefined,
    );
    expect(parseUndoRecord({ documents: [{ path: 'tasks/t1', before: 3, after: null }] })).toBe(
      undefined,
    );
  });
});
