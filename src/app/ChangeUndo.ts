import type { HistoryEntry } from '../domain/history';

/** Done, or why not: the change stays as it is. */
export type UndoOutcome = { done: true } | { done: false; reason: string };

/**
 * Undoes and redoes the changes recorded in the history since the 0.22, which keep what they
 * wrote. Each undo or redo is a change of its own, recorded as the change the other way round.
 */
export interface ChangeUndo {
  undoChange(entry: HistoryEntry): UndoOutcome;
  redoChange(entry: HistoryEntry): UndoOutcome;
}
