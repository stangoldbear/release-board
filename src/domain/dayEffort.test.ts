import { describe, expect, it } from 'vitest';
import { barEffortOn, formatTeamEffort, teamEffortOn, totalEffort } from './dayEffort';
import { projectSpan } from './projectSpan';
import type { Assignment, Project, Stakeholder, Team } from './types';

const team = (id: string, tag: string, position: number): Team => ({
  id,
  name: tag,
  tag,
  colorId: 'blue',
  phase: 'development',
  position,
});
// The order of the settings, not of the ids: the footer follows it.
const teams = [team('server', 'SSide', 1), team('ba', 'BA', 0), team('qa', 'QA', 2)];
const person = (id: string, teamId: string): Stakeholder => ({
  id,
  name: id,
  teamId,
  absences: [],
  position: 0,
});
const stakeholders = [person('anna', 'ba'), person('bruno', 'server'), person('carla', 'server')];
const config = { teams, stakeholders };

const project = (id: string, startDate: string): Project => ({
  id,
  title: id,
  startDate,
  colorId: 'blue',
  status: 'planned',
});
const work = (
  id: string,
  projectId: string,
  stakeholderId: string,
  startDate: string,
  manDays: number,
): Assignment => ({ id, projectId, stakeholderId, startDate, manDays });

// Monday the 12th of October 2026, and the days after it.
const assignments = [
  work('a1', 'p1', 'anna', '2026-10-12', 2),
  work('a2', 'p1', 'bruno', '2026-10-12', 5),
  work('a3', 'p2', 'carla', '2026-10-13', 1.5),
  work('a4', 'p2', 'gone', '2026-10-12', 5),
];
const bars = [project('p1', '2026-10-12'), project('p2', '2026-10-12')].flatMap(
  (item) =>
    projectSpan({ ...item, contingency: { startDate: '2026-10-12', manDays: 3 } }, assignments, {
      stakeholders,
    }).bars,
);

describe('the effort of the teams on a day', () => {
  it('adds the days of the people of every team across the projects, in the order of the teams', () => {
    const tuesday = teamEffortOn('2026-10-13', bars, config);
    expect(tuesday.map(({ team: { tag }, manDays }) => [tag, manDays])).toEqual([
      ['BA', 1],
      ['SSide', 2],
      ['QA', 0],
    ]);
    expect(formatTeamEffort(tuesday)).toBe('BA:1, SSide:2, QA:0');
    expect(totalEffort(tuesday)).toBe(3);
  });

  it('counts half a day on the last day of an effort that ends with a half', () => {
    const wednesday = teamEffortOn('2026-10-14', bars, config);
    expect(formatTeamEffort(wednesday)).toBe('BA:0, SSide:1,5, QA:0');
  });

  it('counts nothing on a weekend, and leaves out the contingency and the people without a team', () => {
    expect(totalEffort(teamEffortOn('2026-10-17', bars, config))).toBe(0);
    // Monday: Anna and Bruno only; the contingency and the person gone are not anyone's.
    expect(totalEffort(teamEffortOn('2026-10-12', bars, config))).toBe(2);
  });

  it('gives a bar a whole day on its working days, a half at the end of half days', () => {
    const schedule = {
      start: '2026-10-12',
      end: '2026-10-13',
      workDays: ['2026-10-12', '2026-10-13'],
      absences: [],
      truncated: false,
    };
    expect(barEffortOn({ manDays: 1.5, schedule }, '2026-10-12')).toBe(1);
    expect(barEffortOn({ manDays: 1.5, schedule }, '2026-10-13')).toBe(0.5);
    expect(barEffortOn({ manDays: 2, schedule }, '2026-10-13')).toBe(1);
    expect(barEffortOn({ manDays: 2, schedule }, '2026-10-14')).toBe(0);
  });
});
