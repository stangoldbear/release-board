import { describe, expect, it } from 'vitest';
import type { ProjectWithEnd } from '../../domain/projects';
import { projectSpan } from '../../domain/projectSpan';
import type { Assignment, RoadmapConfig } from '../../domain/types';
import { peopleWorkOf } from './usePeopleWork';

const config: RoadmapConfig = {
  fields: [],
  teams: [
    {
      id: 'server',
      name: 'Server side',
      tag: 'ServerSide',
      colorId: 'yellow',
      phase: 'development',
      position: 1,
    },
    {
      id: 'ba',
      name: 'Business analysis',
      tag: 'BA',
      colorId: 'purple',
      phase: 'analysis',
      position: 0,
    },
  ],
  stakeholders: [
    { id: 's2', name: 'Server #2', teamId: 'server', absences: [], position: 1 },
    { id: 's1', name: 'Server #1', teamId: 'server', absences: [], position: 0 },
    { id: 'b1', name: 'BA #1', teamId: 'ba', absences: [], position: 0 },
    { id: 'x1', name: 'Senza team', teamId: 'gone', absences: [], position: 0 },
  ],
  projectColors: 'free',
};

const project = (id: string, colorId: ProjectWithEnd['colorId']): ProjectWithEnd => ({
  id,
  title: id,
  startDate: '2026-10-15',
  endDate: '2026-10-31',
  colorId,
  status: 'in_progress',
  arrangement: 'manual',
});

const assignments: Assignment[] = [
  // Thursday 15, Friday 16, Monday 19, Tuesday 20, Wednesday 21.
  { id: 'a1', projectId: 'app', stakeholderId: 's1', startDate: '2026-10-15', manDays: 5 },
  // Tuesday 20, Wednesday 21, Thursday 22: two days with the app.
  { id: 'l1', projectId: 'loyalty', stakeholderId: 's1', startDate: '2026-10-20', manDays: 3 },
  { id: 'l2', projectId: 'loyalty', stakeholderId: 'b1', startDate: '2026-10-26', manDays: 2 },
];

const app = project('app', 'blue');
const loyalty = project('loyalty', 'teal');
const spans = new Map(
  [app, loyalty].map((item) => [item.id, projectSpan(item, assignments, config)]),
);

describe('peopleWorkOf', () => {
  const work = peopleWorkOf([app, loyalty], [app], spans, config, '2026-10-21');

  it('lists the people by team, in the order of the settings, those without a team last', () => {
    expect(
      work.teams.map(({ team, people }) => [team?.id ?? null, people.map((row) => row.person.id)]),
    ).toEqual([
      ['ba', ['b1']],
      ['server', ['s1', 's2']],
      [null, ['x1']],
    ]);
  });

  it('draws the work on the projects shown, in the color of the project', () => {
    const server1 = work.teams[1]?.people[0];
    expect(server1?.bars.map((bar) => [bar.item.id, bar.colorId])).toEqual([['a1', 'blue']]);
  });

  it('counts the days with more than one project on every project, from today on', () => {
    const server1 = work.teams[1]?.people[0];
    expect(server1?.shared).toEqual(['2026-10-20', '2026-10-21']);
    expect(server1?.sharedAhead).toBe(1);
    expect(work).toMatchObject({ people: 4, atWorkToday: 1, overbooked: 1 });
  });
});
