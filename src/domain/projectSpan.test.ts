import { describe, expect, it } from 'vitest';
import { projectSpan, withEffectiveEnd, workBarsOf } from './projectSpan';
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
  it('counts split reserve segments and exposes their gap and notes', () => {
    const split = {
      ...project,
      contingency: {
        startDate: '2026-11-02',
        manDays: 2,
        segments: [
          { id: 'reserve-2', startDate: '2026-11-09', manDays: 3, note: 'After the pause' },
        ],
      },
    };
    const span = projectSpan(split, [], calendar);
    expect(span.end).toBe('2026-11-11');
    expect(span.totalManDays).toBe(5);
    expect(span.bars[1]).toMatchObject({ id: 'reserve-2', note: 'After the pause' });
    expect(span.gaps).toEqual([{ start: '2026-11-04', end: '2026-11-08' }]);
  });

  it('ends on its start without the work of a team', () => {
    expect(projectSpan(project, [], calendar)).toMatchObject({
      start: '2026-11-02',
      end: '2026-11-02',
      work: null,
      gaps: [],
      totalManDays: 0,
      late: false,
    });
  });

  it('ends with the work of the team, whatever an older version stored', () => {
    const bars = [
      assignment('a1', 'ba-1', '2026-11-02', 5),
      assignment('a2', 'server-1', '2026-11-09', 12),
    ];
    const span = projectSpan(project, bars, calendar);
    // Server #1 is away on the 16th and 17th: twelve days from the 9th end on the 26th.
    expect(span.work).toEqual({ start: '2026-11-02', end: '2026-11-26' });
    expect(span.end).toBe('2026-11-26');
    expect(span.totalManDays).toBe(17);
    expect(span.bars.map((bar) => bar.kind)).toEqual(['assignment', 'assignment']);
    // The planned end and the days of the project of the versions before 0.16 count no more.
    const old = { ...project, endDate: '2026-12-11', manDays: 40 } as Project;
    expect(projectSpan(old, bars, calendar)).toMatchObject({ end: '2026-11-26', totalManDays: 17 });
    expect(projectSpan(old, [], calendar)).toMatchObject({ end: '2026-11-02', totalManDays: 0 });
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
    expect(span.end).toBe('2026-11-20');
  });
});
