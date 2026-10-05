import { describe, expect, it } from 'vitest';
import type { HistoryEntry } from './history';
import { historyStats, niceCeiling, periodStart } from './historyStats';

const today = '2026-10-05';

function entry(id: string, at: string | null, login: string, entity: HistoryEntry['entity']) {
  return {
    id,
    entity,
    entityId: 'x',
    action: 'update',
    actor: { uid: login, githubId: '1', login },
    at: at ? new Date(at) : null,
  } satisfies HistoryEntry;
}

const entries: HistoryEntry[] = [
  entry('1', '2026-10-05T09:00:00', 'anna', 'task'),
  entry('2', '2026-10-05T10:00:00', 'luca', 'note'),
  entry('3', '2026-10-03T18:30:00', 'anna', 'value'),
  entry('4', '2026-10-03T08:00:00', 'anna', 'metric'),
  entry('5', '2026-09-01T08:00:00', 'luca', 'task'),
  entry('6', null, 'anna', 'task'),
];

describe('historyStats', () => {
  it('counts the changes of the period by day, author and kind', () => {
    const stats = historyStats(entries, periodStart('7', today), today);
    expect(stats.total).toBe(5);
    expect(stats.unit).toBe('day');
    expect(stats.buckets.map((bucket) => bucket.count)).toEqual([0, 0, 0, 0, 2, 0, 3]);
    expect(stats.buckets.at(-1)).toMatchObject({ start: today, byKind: { task: 2, note: 1 } });
    expect(stats.buckets[4]?.byKind).toEqual({ revenue: 2 });
    expect(stats.authors).toEqual([
      { login: 'anna', count: 4 },
      { login: 'luca', count: 1 },
    ]);
    expect(stats.kinds[0]).toEqual({ kind: 'task', count: 2 });
  });

  it('turns to weekly columns for long periods', () => {
    const stats = historyStats(entries, '2026-01-01', today);
    expect(stats.unit).toBe('week');
    expect(stats.buckets[0]?.start).toBe('2025-12-29');
    expect(stats.total).toBe(6);
  });
});

describe('periodStart', () => {
  it('counts today among the days of a period, and starts all of it at the oldest change', () => {
    expect(periodStart('7', today)).toBe('2026-09-29');
    expect(periodStart('all', today, '2026-06-01')).toBe('2026-06-01');
    expect(periodStart('all', today)).toBe(today);
  });
});

describe('niceCeiling', () => {
  it('rounds up to 1, 2 or 5 times a power of ten', () => {
    expect([0, 1, 3, 7, 10, 11, 49, 51, 180].map(niceCeiling)).toEqual([
      1, 1, 5, 10, 10, 20, 50, 100, 200,
    ]);
  });
});
