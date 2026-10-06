import { describe, expect, it } from 'vitest';
import type { Project } from '../../domain/types';
import {
  barPlace,
  newProjectPeriod,
  projectPeriod,
  roadmapColumns,
  roadmapMetrics,
  roadmapRange,
  yearSpans,
} from './roadmapLayout';

const project = (startDate: string, endDate: string): Project => ({
  id: startDate,
  title: 'Progetto',
  startDate,
  endDate,
  colorId: 'blue',
  status: 'planned',
});

describe('roadmapRange', () => {
  it('goes from half a year before today to a year and a half after, in whole quarters', () => {
    expect(roadmapRange([], '2026-10-05', 'quarters')).toEqual({
      start: '2026-04-01',
      end: '2028-06-30',
    });
  });

  it('goes further when zoomed out to years', () => {
    expect(roadmapRange([], '2026-10-05', 'years')).toEqual({
      start: '2025-04-01',
      end: '2030-06-30',
    });
  });

  it('makes room around the projects that go further', () => {
    expect(
      roadmapRange(
        [project('2025-02-10', '2025-05-01'), project('2028-08-01', '2029-01-15')],
        '2026-10-05',
        'months',
      ),
    ).toEqual({ start: '2024-07-01', end: '2029-09-30' });
  });
});

describe('roadmapColumns', () => {
  const range = { start: '2026-07-01', end: '2026-12-31' };

  it('has a column per month, with past and current ones', () => {
    const columns = roadmapColumns(range, 'quarters', '2026-10-05');
    expect(columns.map((column) => column.label)).toEqual([
      'lug',
      'ago',
      'set',
      'ott',
      'nov',
      'dic',
    ]);
    expect(columns.map((column) => column.past)).toEqual([true, true, true, false, false, false]);
    expect(columns.find((column) => column.current)?.name).toBe('ott 2026');
    expect(columns.filter((column) => column.yearEnd).map((column) => column.label)).toEqual([
      'dic',
    ]);
    expect(columns[1]).toMatchObject({
      start: '2026-08-01',
      end: '2026-08-31',
      left: 93,
      width: 93,
    });
  });

  it('has a column per quarter when zoomed out to years', () => {
    const columns = roadmapColumns(range, 'years', '2026-10-05');
    expect(columns.map((column) => [column.label, column.name, column.width])).toEqual([
      ['T3', 'terzo trimestre 2026', 92],
      ['T4', 'quarto trimestre 2026', 92],
    ]);
  });
});

describe('yearSpans', () => {
  it('cuts the years to the range', () => {
    expect(yearSpans({ start: '2026-10-01', end: '2027-03-31' }, 1)).toEqual([
      { year: '2026', left: 0, width: 92 },
      { year: '2027', left: 92, width: 90 },
    ]);
  });
});

describe('projects on the roadmap', () => {
  it('place their bar from the first to the last day', () => {
    expect(
      barPlace(project('2026-07-03', '2026-07-12'), { start: '2026-07-01', end: '2026-12-31' }, 3),
    ).toEqual({
      left: 6,
      width: 30,
    });
  });

  it('say the months they span', () => {
    expect(projectPeriod(project('2026-09-10', '2026-12-20'))).toBe('set – dic 2026');
    expect(projectPeriod(project('2026-11-01', '2027-02-28'))).toBe('nov 2026 – feb 2027');
    expect(projectPeriod(project('2026-01-05', '2026-01-20'))).toBe('gen 2026');
  });

  it('start from the period clicked, or from today for three months', () => {
    expect(newProjectPeriod('2026-10-05')).toEqual({
      startDate: '2026-10-05',
      endDate: '2026-12-31',
    });
    expect(newProjectPeriod('2026-10-05', { start: '2027-01-01', end: '2027-03-31' })).toEqual({
      startDate: '2027-01-01',
      endDate: '2027-03-31',
    });
  });
});

describe('roadmapMetrics', () => {
  it('grows with the text, and brings the rows closer when compact or small', () => {
    expect(roadmapMetrics(1, false)).toEqual({ barHeight: 28, rowPadding: 8, labelWidth: 200 });
    expect(roadmapMetrics(1.5, false)).toMatchObject({ barHeight: 40, labelWidth: 300 });
    expect(roadmapMetrics(1, true).rowPadding).toBe(3);
    expect(roadmapMetrics(0.75, false)).toMatchObject({ barHeight: 22, rowPadding: 6 });
  });
});
