import { describe, expect, it } from 'vitest';
import { buildColumns, columnTone, monthSpans } from './timelineLayout';

describe('buildColumns', () => {
  const range = { start: '2026-09-28', end: '2026-10-04' };

  it('marks past days, today, holidays and the end of a month', () => {
    const columns = buildColumns(range, 'month', true, '2026-10-01');
    expect(columns.map((column) => column.past)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(columns.find((column) => column.isToday)?.start).toBe('2026-10-01');
    expect(columns.filter((column) => column.monthEnd).map((column) => column.start)).toEqual([
      '2026-09-30',
    ]);
    // 4 October 2026: a Sunday, and San Francesco.
    expect(columns[6]).toMatchObject({ red: true, holidays: ["San Francesco d'Assisi"] });
  });

  it('greys past days before anything else, and leaves the week of today as it is', () => {
    const [past, , , today] = buildColumns(range, 'month', true, '2026-10-01');
    expect(columnTone(past!)).toBe('bg-past text-fg-muted');
    expect(columnTone(today!)).toBe('bg-accent-soft text-link');
    const [week] = buildColumns(range, 'quarter', true, '2026-10-01');
    expect(week).toMatchObject({ start: '2026-09-28', end: '2026-10-04', past: false });
  });
});

describe('monthSpans', () => {
  it('cuts the months to the range and places them in pixels', () => {
    expect(monthSpans({ start: '2026-09-28', end: '2026-11-01' }, 10)).toEqual([
      { month: '2026-09-01', days: { start: '2026-09-28', end: '2026-09-30' }, left: 0, width: 30 },
      {
        month: '2026-10-01',
        days: { start: '2026-10-01', end: '2026-10-31' },
        left: 30,
        width: 310,
      },
      {
        month: '2026-11-01',
        days: { start: '2026-11-01', end: '2026-11-01' },
        left: 340,
        width: 10,
      },
    ]);
  });
});
