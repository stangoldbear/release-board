import type { HistoryEntry } from '../domain/history';

/** Reads the change log of the plan, most recent first. */
export interface HistoryReader {
  subscribeHistory(limit: number, listener: (entries: HistoryEntry[]) => void): () => void;
}
