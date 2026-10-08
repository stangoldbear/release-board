import { describe, expect, it } from 'vitest';
import { newProjectPeriod, projectPeriod, roadmapMetrics, roadmapRange } from './roadmapLayout';

const project = (startDate: string, endDate: string) => ({ startDate, endDate });

describe('roadmapRange', () => {
  const view = { start: '2026-07-06', end: '2027-04-04' };

  it('is the range of the view, in whole weeks, when the projects fit in it', () => {
    expect(roadmapRange(view, [project('2026-10-01', '2026-12-31')])).toEqual(view);
    expect(roadmapRange({ start: '2026-07-08', end: '2027-04-01' }, [])).toEqual({
      start: '2026-07-06',
      end: '2027-04-04',
    });
  });

  it('makes a month of room around the projects that go further', () => {
    expect(
      roadmapRange(view, [
        project('2025-02-10', '2025-05-01'),
        project('2028-08-01', '2029-01-15'),
      ]),
    ).toEqual({ start: '2025-01-06', end: '2029-02-18' });
  });
});

describe('projectPeriod', () => {
  it('names the months of a project, with the years once each', () => {
    expect(projectPeriod(project('2026-11-02', '2027-02-28'))).toBe('nov 2026 – feb 2027');
    expect(projectPeriod(project('2026-09-01', '2026-12-31'))).toBe('set – dic 2026');
    expect(projectPeriod(project('2026-01-05', '2026-01-30'))).toBe('gen 2026');
  });

  it('gives a new project about three months from its day', () => {
    expect(newProjectPeriod('2026-10-05')).toEqual({
      startDate: '2026-10-05',
      endDate: '2026-12-31',
    });
  });
});

describe('roadmapMetrics', () => {
  it('takes the width of the days from the calendar and grows with the text', () => {
    expect(roadmapMetrics(56, 1, false).dayWidth).toBe(56);
    expect(roadmapMetrics(28, 1, false).dayWidth).toBe(28);
    expect(roadmapMetrics(12, 1, false).dayWidth).toBe(12);
    const normal = roadmapMetrics(56, 1, false);
    const bigger = roadmapMetrics(56, 1.5, false);
    expect(bigger.barHeight).toBeGreaterThan(normal.barHeight);
    expect(bigger.assignmentHeight).toBeGreaterThan(normal.assignmentHeight);
    expect(bigger.labelWidth).toBe(390);
    expect(roadmapMetrics(56, 1, true).rowPadding).toBeLessThan(normal.rowPadding);
  });

  it('gives the column of the projects more room when it shows more than the titles', () => {
    expect(roadmapMetrics(56, 1, false, 'titles').labelWidth).toBe(220);
    expect(roadmapMetrics(56, 1, false, 'main').labelWidth).toBe(260);
    expect(roadmapMetrics(56, 1, false, 'team').labelWidth).toBe(260);
    // Two lines of description, one in compact mode: the window has the whole text.
    expect(roadmapMetrics(56, 1, false).descriptionLines).toBe(2);
    expect(roadmapMetrics(56, 1, true).descriptionLines).toBe(1);
  });
});
