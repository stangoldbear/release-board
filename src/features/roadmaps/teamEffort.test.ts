import { describe, expect, it } from 'vitest';
import { defaultRoadmapConfig } from '../../domain/roadmapConfig';
import type { Assignment } from '../../domain/types';
import {
  addRow,
  daysByTeam,
  initialRows,
  nextOfTeam,
  parseDays,
  peopleNotInRows,
  removeRow,
  resetRow,
  rowDays,
  toTeamRows,
  totalDays,
  typeDays,
} from './teamEffort';

const config = defaultRoadmapConfig();

describe('the table of the days of a project', () => {
  it('opens a new project with the default members in the order of the work, and the contingency last', () => {
    const rows = initialRows(null, [], config);
    expect(rows.map((row) => row.name)).toEqual([
      'BA #1',
      'Server #1',
      'iOS Dev #1',
      'Android Dev #1',
      'CONTENT #1',
      'QA #1',
      'Contingency',
    ]);
    // BA, QA and the contingency follow their formulas; the developers wait for their days.
    expect(rows.map((row) => row.auto)).toEqual([true, false, false, false, false, true, true]);
    expect(rows.every((row) => rowDays(row, rows, config) === null)).toBe(true);
  });

  it('fills the formulas from the days typed for the teams without one, until days are typed', () => {
    let rows = initialRows(null, [], config);
    rows = typeDays(rows, 'new:server-1', '12');
    rows = typeDays(rows, 'new:ios-1', '8');
    rows = typeDays(rows, 'new:android-1', '10');
    expect(daysByTeam(rows)).toEqual({ server: 12, ios: 8, android: 10, content: 0 });
    const days = Object.fromEntries(rows.map((row) => [row.name, rowDays(row, rows, config)]));
    expect(days).toMatchObject({ 'BA #1': 3.5, 'QA #1': 3.5, Contingency: 3, 'CONTENT #1': null });
    expect(totalDays(rows, config)).toBe(40);
    rows = typeDays(rows, 'new:ba-1', '5');
    expect(rowDays(rows[0]!, rows, config)).toBe(5);
    rows = resetRow(rows, 'new:ba-1');
    expect(rows[0]).toMatchObject({ auto: true, text: '' });
    expect(toTeamRows(rows, config)).toEqual({
      team: [
        { stakeholderId: 'ba-1', manDays: 3.5 },
        { stakeholderId: 'server-1', manDays: 12 },
        { stakeholderId: 'ios-1', manDays: 8 },
        { stakeholderId: 'android-1', manDays: 10 },
        { stakeholderId: 'qa-1', manDays: 3.5 },
      ],
      contingency: 3,
    });
  });

  it('reads days in half days within the limit', () => {
    expect(parseDays('3,5')).toBe(3.5);
    expect(parseDays(' 2.75 ')).toBe(3);
    expect(parseDays('0,2')).toBe(0.5);
    expect(parseDays('')).toBeNull();
    expect(parseDays('0')).toBeNull();
    expect(parseDays('501')).toBeNull();
    expect(parseDays('dodici')).toBeNull();
  });

  it('opens an existing project with its assignments, typed, and adds or removes people', () => {
    const assignments: Assignment[] = [
      { id: 'a1', projectId: 'p1', stakeholderId: 'ios-1', startDate: '2026-11-09', manDays: 8 },
      { id: 'a2', projectId: 'p1', stakeholderId: 'ba-1', startDate: '2026-11-02', manDays: 5 },
      { id: 'a3', projectId: 'p1', stakeholderId: 'ghost', startDate: '2026-11-02', manDays: 1 },
    ];
    let rows = initialRows(
      { contingency: { startDate: '2026-11-20', manDays: 2 } },
      assignments,
      config,
    );
    expect(rows.map((row) => [row.name, row.text, row.auto])).toEqual([
      ['BA #1', '5', false],
      ['iOS Dev #1', '8', false],
      ['Persona non in configurazione', '1', false],
      ['Contingency', '2', false],
    ]);
    // A project with its team and no contingency does not get one by itself.
    const bare = initialRows({}, assignments.slice(0, 1), config);
    expect(bare.at(-1)).toMatchObject({ kind: 'contingency', auto: false, text: '' });
    const server = config.teams.find((team) => team.id === 'server')!;
    expect(nextOfTeam(rows, server, config)?.name).toBe('Server #1');
    rows = addRow(rows, nextOfTeam(rows, server, config)!, config);
    expect(rows.map((row) => row.name)).toEqual([
      'BA #1',
      'Server #1',
      'iOS Dev #1',
      'Persona non in configurazione',
      'Contingency',
    ]);
    expect(nextOfTeam(rows, server, config)?.name).toBe('Server #2');
    expect(peopleNotInRows(rows, config).map((item) => item.name)).not.toContain('BA #1');
    rows = removeRow(rows, 'a3');
    expect(toTeamRows(rows, config)).toEqual({
      team: [
        { assignmentId: 'a2', stakeholderId: 'ba-1', manDays: 5 },
        { assignmentId: 'a1', stakeholderId: 'ios-1', manDays: 8 },
      ],
      contingency: 2,
    });
  });
});
