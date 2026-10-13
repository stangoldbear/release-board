import { describe, expect, it } from 'vitest';
import { endFromManDays, projectSpan, withEffectiveEnd, workBarsOf } from './projectSpan';
import type { Assignment, Project, Stakeholder } from './types';

const project: Project = {
  id: 'p1',
  title: 'Pagamenti in-app 2.0',
  startDate: '2026-11-02',
  colorId: 'purple',
  status: 'planned',
};

const people: Stakeholder[] = [
  { id: 'ba-1', name: 'BA #1', teamId: 'ba', absences: [], position: 0 },
  {
    id: 'server-1',
    name: 'Server #1',
    teamId: 'server',
    absences: [{ start: '2026-11-16', end: '2026-11-17' }],
    position: 0,
  },
];

const calendar = { stakeholders: people };

const assignment = (id: string, stakeholderId: string, startDate: string, manDays: number) =>
  ({ id, projectId: 'p1', stakeholderId, startDate, manDays }) as Assignment;

describe('the span of a project', () => {
  it('ends on its start without anything else, and counts working days of its own effort', () => {
    expect(projectSpan(project, [], calendar)).toMatchObject({
      start: '2026-11-02',
      end: '2026-11-02',
      work: null,
      gaps: [],
      totalManDays: 0,
      late: false,
    });
    // 2 November 2026 is a Monday: ten working days end on Friday the 13th.
    expect(endFromManDays('2026-11-02', 10, [])).toBe('2026-11-13');
    expect(projectSpan({ ...project, manDays: 10 }, [], calendar)).toMatchObject({
      end: '2026-11-13',
      totalManDays: 10,
    });
  });

  it('reaches the furthest of the planned end and the work of the team', () => {
    const bars = [
      assignment('a1', 'ba-1', '2026-11-02', 5),
      assignment('a2', 'server-1', '2026-11-09', 12),
    ];
    const span = projectSpan({ ...project, endDate: '2026-11-20' }, bars, calendar);
    // Server #1 is away on the 16th and 17th: twelve days from the 9th end on the 26th.
    expect(span.work).toEqual({ start: '2026-11-02', end: '2026-11-26' });
    expect(span.end).toBe('2026-11-26');
    expect(span.plannedEnd).toBe('2026-11-20');
    expect(span.totalManDays).toBe(17);
    expect(span.bars.map((bar) => bar.kind)).toEqual(['assignment', 'assignment']);
    // The project's own days do not count beside the work of the team.
    expect(projectSpan({ ...project, manDays: 40 }, bars, calendar).totalManDays).toBe(17);
    expect(projectSpan({ ...project, endDate: '2026-12-11' }, bars, calendar).end).toBe(
      '2026-12-11',
    );
  });

  it('finds the days without work between the bars, weekends alone excluded', () => {
    const bars = [
      assignment('a1', 'ba-1', '2026-11-02', 5), // Monday to Friday
      assignment('a2', 'server-1', '2026-11-11', 3), // Wednesday to Friday: Monday and Tuesday idle
    ];
    expect(projectSpan(project, bars, calendar).gaps).toEqual([
      { start: '2026-11-07', end: '2026-11-10' },
    ]);
    const adjacent = [
      assignment('a1', 'ba-1', '2026-11-02', 5),
      assignment('a2', 'server-1', '2026-11-09', 2),
    ];
    expect(projectSpan(project, adjacent, calendar).gaps).toEqual([]);
  });

  it('adds the contingency as a bar of the project and sees a deadline go by', () => {
    const late = {
      ...project,
      deadline: '2026-11-05',
      contingency: { startDate: '2026-11-09', manDays: 3 },
    };
    const span = projectSpan(late, [assignment('a1', 'ba-1', '2026-11-02', 5)], calendar);
    expect(workBarsOf(late, [], calendar)).toHaveLength(1);
    expect(span.bars.at(-1)).toMatchObject({ kind: 'contingency', id: 'p1', manDays: 3 });
    expect(span.end).toBe('2026-11-11');
    expect(span.totalManDays).toBe(8);
    expect(span.late).toBe(true);
    expect(withEffectiveEnd(late, span).endDate).toBe('2026-11-11');
  });
});

describe('the span of a project across a company closure', () => {
  it('skips the closed days as weekends, and finds no gap in them', () => {
    // Closed from Monday the 9th to Friday the 13th of November 2026.
    const closed = { stakeholders: people, closures: [{ start: '2026-11-09', end: '2026-11-13' }] };
    const bars = [assignment('a1', 'ba-1', '2026-11-02', 10)];
    const span = projectSpan(project, bars, closed);
    expect(span.work).toEqual({ start: '2026-11-02', end: '2026-11-20' });
    expect(span.gaps).toEqual([]);
    expect(endFromManDays('2026-11-02', 10, closed.closures)).toBe('2026-11-20');
  });
});
