import { addDaysIso, diffDays, formatDateToISO, startOfWeek } from '../utils/dateUtils';
import { historyKind } from './history';
import type { HistoryEntry, HistoryKind } from './history';
import { rangeColumns } from './schedule';
import type { DateRange } from './schedule';

/** How far back the history page looks. */
export type HistoryPeriod = '7' | '30' | '90' | 'all';

export const HISTORY_PERIOD_LABELS: Record<HistoryPeriod, string> = {
  '7': 'Ultimi 7 giorni',
  '30': 'Ultimi 30 giorni',
  '90': 'Ultimi 90 giorni',
  all: 'Tutto',
};

/** Up to this many days the chart has a column per day; beyond, a column per week. */
const MAX_DAY_COLUMNS = 92;

/** The day of a change, in local time. One the server has not confirmed yet counts as today. */
export function entryDay(entry: HistoryEntry, today: string): string {
  return entry.at ? formatDateToISO(entry.at) : today;
}

/** The first day of a period: for all of it, the day of the oldest change loaded. */
export function periodStart(period: HistoryPeriod, today: string, oldest?: string): string {
  return period === 'all' ? (oldest ?? today) : addDaysIso(today, 1 - Number(period));
}

export interface HistoryBucket extends DateRange {
  count: number;
  byKind: Partial<Record<HistoryKind, number>>;
}

export interface HistoryStats {
  total: number;
  /** One column per day, or per week for long periods, from the first day to today. */
  unit: 'day' | 'week';
  buckets: HistoryBucket[];
  /** Most active first. */
  authors: { login: string; count: number }[];
  kinds: { kind: HistoryKind; count: number }[];
}

function byCount<K>(counts: Map<K, number>): [K, number][] {
  return [...counts].sort((a, b) => b[1] - a[1]);
}

/** Counts of the changes from `start` to today: per day or week, per author, per kind. */
export function historyStats(
  entries: readonly HistoryEntry[],
  start: string,
  today: string,
): HistoryStats {
  const unit = diffDays(start, today) < MAX_DAY_COLUMNS ? 'day' : 'week';
  const first = unit === 'week' ? startOfWeek(start) : start;
  const size = unit === 'week' ? 7 : 1;
  const buckets: HistoryBucket[] = rangeColumns({ start: first, end: today }, unit).map(
    (column) => ({ ...column, count: 0, byKind: {} }),
  );
  const authors = new Map<string, number>();
  const kinds = new Map<HistoryKind, number>();
  let total = 0;

  for (const entry of entries) {
    const day = entryDay(entry, today);
    if (day < start || day > today) continue;
    const bucket = buckets[Math.floor(diffDays(first, day) / size)];
    if (!bucket) continue;
    const kind = historyKind(entry);
    total += 1;
    bucket.count += 1;
    bucket.byKind[kind] = (bucket.byKind[kind] ?? 0) + 1;
    const login = entry.actor.login || 'Qualcuno';
    authors.set(login, (authors.get(login) ?? 0) + 1);
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
  }

  return {
    total,
    unit,
    buckets,
    authors: byCount(authors).map(([login, count]) => ({ login, count })),
    kinds: byCount(kinds).map(([kind, count]) => ({ kind, count })),
  };
}

/** A round top for a count axis: 1, 2, 5, 10, 20, 50… at least as large as the value. */
export function niceCeiling(value: number): number {
  if (value <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((factor) => factor * magnitude >= value) ?? 10;
  return step * magnitude;
}
