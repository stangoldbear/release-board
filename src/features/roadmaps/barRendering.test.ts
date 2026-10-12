import { describe, expect, it } from 'vitest';
import { projectSpan } from '../../domain/projectSpan';
import { defaultRoadmapConfig } from '../../domain/roadmapConfig';
import type { Assignment, Project } from '../../domain/types';
import {
  fadedParts,
  formatManDays,
  phaseSegmentsOf,
  projectBarHeight,
  workItemsOf,
} from './barRendering';

const config = defaultRoadmapConfig();
const project: Project = {
  id: 'p1',
  title: 'Prova',
  startDate: '2026-11-02',
  endDate: '2026-12-11',
  colorId: 'blue',
  status: 'planned',
  deadline: '2026-11-27',
  contingency: { startDate: '2026-11-30', manDays: 2 },
};
const assignments: Assignment[] = [
  { id: 'a-ios', projectId: 'p1', stakeholderId: 'ios-1', startDate: '2026-11-09', manDays: 8 },
  { id: 'a-ba', projectId: 'p1', stakeholderId: 'ba-1', startDate: '2026-11-02', manDays: 4 },
  {
    id: 'a-server',
    projectId: 'p1',
    stakeholderId: 'server-1',
    startDate: '2026-11-09',
    manDays: 12,
  },
  { id: 'a-qa', projectId: 'p1', stakeholderId: 'qa-1', startDate: '2026-11-25', manDays: 3 },
  { id: 'a-ghost', projectId: 'p1', stakeholderId: 'nobody', startDate: '2026-11-09', manDays: 1 },
];
const span = projectSpan(project, assignments, config.stakeholders);

describe('the bars of the work of a project', () => {
  it('are in the order of the work, with the contingency last and the unknown person before it', () => {
    const items = workItemsOf(project, span, config);
    expect(items.map((item) => item.name)).toEqual([
      'BA #1',
      'Server #1',
      'iOS Dev #1',
      'QA #1',
      'Persona non in configurazione',
      'Contingency',
    ]);
    expect(items.map((item) => item.phase)).toEqual([
      'analysis',
      'development',
      'development',
      'test',
      'development',
      'contingency',
    ]);
    expect(items[0]).toMatchObject({
      kind: 'assignment',
      tag: 'BA',
      colorId: 'purple',
      late: false,
    });
    expect(items.at(-1)).toMatchObject({
      kind: 'contingency',
      id: 'p1',
      tag: 'CONT',
      colorId: null,
      startDate: '2026-11-30',
      late: true,
    });
    // QA works the 25th, 26th and 27th: just in time; the contingency is past the deadline.
    expect(items.map((item) => item.late)).toEqual([false, false, false, false, false, true]);
  });

  it('fade the days before the first bar, the gaps and the days after the last bar', () => {
    expect(fadedParts(span)).toEqual([
      // Friday the 6th, between the analysis and the development, with its weekend.
      { start: '2026-11-06', end: '2026-11-08' },
      // The 1st of December is worked by the contingency; the planned end is the 11th.
      { start: '2026-12-02', end: '2026-12-11' },
    ]);
    const late = projectSpan(
      { ...project, startDate: '2026-10-26', contingency: undefined },
      assignments.filter((item) => item.id !== 'a-qa'),
      config.stakeholders,
    );
    expect(fadedParts(late)).toEqual([
      { start: '2026-10-26', end: '2026-11-01' },
      { start: '2026-11-06', end: '2026-11-08' },
      { start: '2026-11-25', end: '2026-12-11' },
    ]);
    const bare = projectSpan({ ...project, contingency: undefined }, [], config.stakeholders);
    expect(fadedParts(bare)).toEqual([]);
  });

  it('merge the bars of a phase into one segment, in the order of the phases', () => {
    const segments = phaseSegmentsOf(workItemsOf(project, span, config));
    expect(
      segments.map((segment) => [segment.label, segment.start, segment.end, segment.manDays]),
    ).toEqual([
      ['Analisi', '2026-11-02', '2026-11-05', 4],
      ['Sviluppo', '2026-11-09', '2026-11-24', 21],
      ['Test', '2026-11-25', '2026-11-27', 3],
      ['Contingency', '2026-11-30', '2026-12-01', 2],
    ]);
    expect(segments[1]!.items.map((item) => item.name)).toEqual([
      'Server #1',
      'iOS Dev #1',
      'Persona non in configurazione',
    ]);
    expect(segments.map((segment) => segment.late)).toEqual([false, false, false, true]);
  });

  it('give the bar its height from the rendering and the bars', () => {
    expect(projectBarHeight('rows', 28, 8, 5)).toBe(28);
    expect(projectBarHeight('lanes', 28, 8, 0)).toBe(28);
    expect(projectBarHeight('lanes', 28, 8, 5)).toBe(28 + 5 * 10 + 2);
    expect(projectBarHeight('phases', 28, 8, 5)).toBe(28 + 16 + 4);
  });

  it('write the days as the bars show them', () => {
    expect(formatManDays(1)).toBe('1 g');
    expect(formatManDays(12)).toBe('12 gg');
    expect(formatManDays(3.5)).toBe('3,5 gg');
  });
});
