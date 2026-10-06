import { describe, expect, it } from 'vitest';
import { TEXT_SCALES } from '../../shared/ui/textScale';
import {
  buildColumns,
  columnTone,
  monthSpans,
  timelineMetrics,
  stackingOrder,
} from './timelineLayout';

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

describe('timelineMetrics', () => {
  it('keeps the sizes of the normal text: two lines in a bar, one when zoomed out', () => {
    expect(timelineMetrics('month', 1, false)).toMatchObject({
      dayWidth: 56,
      barHeight: 46,
      labelWidth: 96,
      barLines: 2,
      noteHeight: 64,
      noteLines: 3,
    });
    expect(timelineMetrics('quarter', 1, false)).toMatchObject({ barHeight: 28, barLines: 1 });
    // Two months: days half as wide as in a month, bars as tall.
    expect(timelineMetrics('bimester', 1, false)).toMatchObject({
      dayWidth: 28,
      barHeight: 46,
      barLines: 2,
    });
  });

  it('makes bars and notes one line tall when the titles are on one line', () => {
    expect(timelineMetrics('month', 1, false, true)).toMatchObject({
      dayWidth: 56,
      barHeight: 28,
      barLines: 1,
      noteHeight: 34,
      noteLines: 1,
    });
    expect(timelineMetrics('detail', 1.5, true, true).barLines).toBe(1);
  });

  it('draws the bars that start closer to today over the others', () => {
    expect(stackingOrder('2026-10-06', '2026-10-06')).toBe(400);
    expect(stackingOrder('2026-10-06', '2026-10-16')).toBe(390);
    expect(stackingOrder('2026-10-06', '2026-09-26')).toBe(390);
    expect(stackingOrder('2026-10-06', '2028-01-01')).toBe(10);
  });

  it('grows bars, names and notes with the text, never the days', () => {
    for (const scale of TEXT_SCALES) {
      const metrics = timelineMetrics('detail', scale, false);
      expect(metrics.dayWidth).toBe(112);
      expect(metrics.labelWidth).toBe(Math.round(96 * scale));
      // The same two lines fit at every size.
      expect(metrics.barLines).toBe(2);
    }
  });

  it('fits a third line in compact mode, with less space around the bars', () => {
    for (const scale of TEXT_SCALES) {
      const compact = timelineMetrics('month', scale, true);
      expect(compact.barLines).toBe(3);
      expect(compact.noteLines).toBe(4);
      expect(compact.lanePadding).toBeLessThan(timelineMetrics('month', scale, false).lanePadding);
    }
  });
});

describe('timelineMetrics below the normal size', () => {
  it('brings the bars closer, and keeps the lines that fit', () => {
    const small = timelineMetrics('month', 0.75, false);
    const normal = timelineMetrics('month', 1, false);
    expect(small.barHeight).toBeLessThan(normal.barHeight);
    expect(small.trackGap).toBeLessThan(normal.trackGap);
    expect(small.lanePadding).toBeLessThan(normal.lanePadding);
    expect(small.labelWidth).toBe(72);
    expect(small.barLines).toBe(2);
  });
});
