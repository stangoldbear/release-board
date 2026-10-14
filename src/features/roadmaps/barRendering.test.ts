import { describe, expect, it } from 'vitest';
import { projectSpan } from '../../domain/projectSpan';
import { defaultRoadmapConfig } from '../../domain/roadmapConfig';
import type { Assignment, Project } from '../../domain/types';
import {
  fadedParts,
  formatManDays,
  laneLayout,
  peopleRows,
  projectRowGeometry,
  workItemsOf,
} from './barRendering';
import { roadmapMetrics } from './roadmapLayout';

const config = defaultRoadmapConfig();
const project: Project = {
  id: 'p1',
  title: 'Prova',
  startDate: '2026-11-02',
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
const span = projectSpan(project, assignments, config);

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

  it('fade the days before the first bar and the gaps; the project ends with its work', () => {
    expect(fadedParts(span)).toEqual([
      // Friday the 6th, between the analysis and the development, with its weekend.
      { start: '2026-11-06', end: '2026-11-08' },
    ]);
    expect(span.end).toBe('2026-12-01');
    const late = projectSpan(
      { ...project, startDate: '2026-10-26', contingency: undefined },
      assignments.filter((item) => item.id !== 'a-qa'),
      config,
    );
    expect(fadedParts(late)).toEqual([
      { start: '2026-10-26', end: '2026-11-01' },
      { start: '2026-11-06', end: '2026-11-08' },
    ]);
    const bare = projectSpan({ ...project, contingency: undefined }, [], config);
    expect(fadedParts(bare)).toEqual([]);
  });

  it('give every row of the titles alone the same tight height, bars or not', () => {
    const metrics = roadmapMetrics(56, 1, 'large');
    const none = projectRowGeometry('titles', 0, metrics);
    const four = projectRowGeometry('titles', 4, metrics);
    expect(none).toMatchObject({ titleHeight: 24, lanes: null, barHeight: 32, rowHeight: 38 });
    expect(four).toMatchObject({ barHeight: 32, rowHeight: 38 });
    expect(four.lanes).toEqual({ height: 1, gap: 2 });
  });

  it('leave the bar alone where the people have rows, at the main information and Team', () => {
    const metrics = roadmapMetrics(56, 1, 'large');
    for (const level of ['main', 'team'] as const) {
      // The column has the title alone: the people are listed in their rows.
      expect(projectRowGeometry(level, 4, metrics)).toMatchObject({
        titleHeight: 24,
        lanes: null,
        barHeight: 24,
        rowHeight: 26,
      });
    }
  });

  it('give the people thin rows at the main information and roomy labeled ones at Team', () => {
    const metrics = roadmapMetrics(56, 1, 'large');
    expect(peopleRows('titles', metrics)).toBeNull();
    expect(peopleRows('main', metrics)).toEqual({
      rowHeight: 16,
      barHeight: 14,
      labeled: false,
      thin: false,
    });
    const team = peopleRows('team', metrics);
    expect(team).toEqual({ rowHeight: 26, barHeight: 20, labeled: true, thin: false });
    expect(team!.rowHeight).toBeGreaterThan(peopleRows('main', metrics)!.rowHeight);
  });

  it('keep the Team level roomy at «Compatta», where the main information is thin', () => {
    const metrics = roadmapMetrics(56, 1, 'compact');
    expect(peopleRows('main', metrics)).toMatchObject({ rowHeight: 8, thin: true, labeled: false });
    // A row of 24 pixels, the least target of WCAG 2.2, at the standard and compact densities.
    expect(peopleRows('team', metrics)).toEqual({
      rowHeight: 24,
      barHeight: 18,
      labeled: true,
      thin: false,
    });
  });

  it('share the band among the lanes, thinner with more of them', () => {
    expect(laneLayout(16, 1)).toEqual({ height: 16, gap: 2 });
    expect(laneLayout(16, 3)).toEqual({ height: 4, gap: 2 });
    expect(laneLayout(16, 8)).toEqual({ height: 1, gap: 1 });
    expect(laneLayout(6, 4)).toEqual({ height: 1, gap: 2 });
  });

  it('write the days as the bars show them', () => {
    expect(formatManDays(1)).toBe('1 g');
    expect(formatManDays(12)).toBe('12 gg');
    expect(formatManDays(3.5)).toBe('3,5 gg');
  });
});
