import type { HistoryEntry } from '../domain/history';

export interface HistoryQuery {
  /** At most this many entries, the most recent ones. */
  limit: number;
  /** Only the changes made from this moment on. */
  since?: Date;
}

/** Reads the change log of the plan, most recent first, and keeps it up to date. */
export interface HistoryReader {
  subscribeHistory(query: HistoryQuery, listener: (entries: HistoryEntry[]) => void): () => void;
}
