import { useEffect, useState } from 'react';
import type { HistoryEntry } from '../domain/history';
import type { HistoryReader } from './HistoryReader';

/** The most recent change to the plan, kept up to date; null until it arrives, or without history. */
export function useLastChange(history: HistoryReader | null): HistoryEntry | null {
  const [last, setLast] = useState<HistoryEntry | null>(null);
  useEffect(() => {
    if (!history) return;
    return history.subscribeHistory({ limit: 1 }, (entries) => setLast(entries[0] ?? null));
  }, [history]);
  return last;
}
