import { FieldValue, deleteField, writeBatch } from 'firebase/firestore';
import type { DocumentData, DocumentReference, Firestore, WriteBatch } from 'firebase/firestore';
import { AUDIT_FIELDS, isBookkeepingPath } from '../../domain/undo';
import type { DocumentWrite, UndoRecord } from '../../domain/undo';

type Write =
  | { kind: 'set'; ref: DocumentReference; data: DocumentData; merge: boolean }
  | { kind: 'update'; ref: DocumentReference; data: DocumentData }
  | { kind: 'delete'; ref: DocumentReference };

/**
 * The writes of one change to the plan, kept until it is committed, so that its history entry can
 * keep what the change wrote and undo it. The same calls as a Firestore batch.
 */
export class PlanBatch {
  private readonly writes: Write[] = [];
  /**
   * The history entry of the change: `undo` when it undoes or redoes another one, or whether it
   * keeps the documents the change writes, to undo it.
   */
  entry: {
    ref: DocumentReference;
    data: DocumentData;
    undo?: UndoRecord;
    keepsDocuments: boolean;
  } | null = null;

  set(ref: DocumentReference, data: DocumentData, options?: { merge: boolean }): this {
    this.writes.push({ kind: 'set', ref, data, merge: options?.merge ?? false });
    return this;
  }

  update(ref: DocumentReference, data: DocumentData): this {
    this.writes.push({ kind: 'update', ref, data });
    return this;
  }

  delete(ref: DocumentReference): this {
    this.writes.push({ kind: 'delete', ref });
    return this;
  }

  /**
   * The writes by their path in the plan, as the undo reads them, without the bookkeeping of the
   * rules; null when one is outside the plan or holds a value computed by the server other than
   * the audit fields.
   */
  undoWrites(planPath: string): DocumentWrite[] | null {
    const writes: DocumentWrite[] = [];
    for (const write of this.writes) {
      const prefix = `${planPath}/`;
      if (!write.ref.path.startsWith(prefix)) return null;
      const path = write.ref.path.slice(prefix.length);
      // Written with every deletion and never undone: its time comes from the server.
      if (isBookkeepingPath(path)) continue;
      if (write.kind === 'delete') {
        writes.push({ kind: 'delete', path });
        continue;
      }
      const data: DocumentData = {};
      const removed: string[] = [];
      for (const [key, value] of Object.entries(write.data) as [string, unknown][]) {
        if (AUDIT_FIELDS.includes(key)) continue;
        if (value instanceof FieldValue) {
          if (write.kind !== 'update' || !value.isEqual(deleteField())) return null;
          removed.push(key);
        } else {
          data[key] = value;
        }
      }
      writes.push(
        write.kind === 'set'
          ? { kind: 'set', path, data, merge: write.merge }
          : { kind: 'update', path, data, removed },
      );
    }
    return writes;
  }

  /** The Firestore batch of the change, its entry with `undo` when there is one. */
  toWriteBatch(db: Firestore, undo: UndoRecord | undefined): WriteBatch {
    const batch = writeBatch(db);
    if (this.entry)
      batch.set(this.entry.ref, undo ? { ...this.entry.data, undo } : this.entry.data);
    for (const write of this.writes) {
      if (write.kind === 'delete') batch.delete(write.ref);
      else if (write.kind === 'update') batch.update(write.ref, write.data);
      else if (write.merge) batch.set(write.ref, write.data, { merge: true });
      else batch.set(write.ref, write.data);
    }
    return batch;
  }
}
