import { describe, expect, it } from 'vitest';
import { projectSpan } from '../../domain/projectSpan';
import { defaultRoadmapConfig } from '../../domain/roadmapConfig';
import type { Assignment, Project } from '../../domain/types';
import {
  fadedParts,
  formatManDays,
  laneLayout,
  projectRowGeometry,
  teamsOf,
  workItemsOf,
} from './barRendering';
import { roadmapMetrics } from './roadmapLayout';

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

  it('give every row of the titles alone the same tight height, bars or not', () => {
    const metrics = roadmapMetrics(56, 1, false);
    const none = projectRowGeometry('titles', 0, metrics);
    const four = projectRowGeometry('titles', 4, metrics);
    expect(none).toMatchObject({ titleHeight: 24, lanes: null, barHeight: 32, rowHeight: 38 });
    expect(four).toMatchObject({ barHeight: 32, rowHeight: 38 });
    expect(four.lanes).toEqual({ height: 1, gap: 2, labeled: false });
  });

  it('give the main information a lane a line of text tall for each bar, with its name', () => {
    const metrics = roadmapMetrics(56, 1, false);
    expect(metrics.laneHeight).toBeGreaterThanOrEqual(10);
    const one = projectRowGeometry('main', 1, metrics);
    const four = projectRowGeometry('main', 4, metrics);
    expect(one.lanes).toEqual({ height: 16, gap: 2, labeled: true });
    expect(four.lanes).toEqual(one.lanes);
    expect(one.barHeight).toBe(24 + 16 + 2);
    expect(four.barHeight).toBe(24 + 4 * 16 + 3 * 2 + 2);
    expect(four.rowHeight).toBe(four.barHeight + 2 * 3);
    // Without work, the two lines of the column set the height.
    expect(projectRowGeometry('main', 0, metrics)).toMatchObject({ lanes: null, rowHeight: 48 });
    // Even the smallest text keeps the lanes at least 10 pixels tall.
    expect(roadmapMetrics(56, 0.75, true).laneHeight).toBeGreaterThanOrEqual(10);
  });

  it('leave the bar alone at the Team level, where the people have rows', () => {
    const geometry = projectRowGeometry('team', 4, roadmapMetrics(56, 1, false));
    // The column has the title alone: the people are listed in their rows.
    expect(geometry).toMatchObject({ titleHeight: 24, lanes: null, barHeight: 24, rowHeight: 26 });
  });

  it('share the band among the lanes, thinner with more of them', () => {
    expect(laneLayout(16, 1)).toEqual({ height: 16, gap: 2 });
    expect(laneLayout(16, 3)).toEqual({ height: 4, gap: 2 });
    expect(laneLayout(16, 8)).toEqual({ height: 1, gap: 1 });
    expect(laneLayout(6, 4)).toEqual({ height: 1, gap: 2 });
  });

  it('name the teams at work once each, in the order of the work', () => {
    const items = workItemsOf(
      project,
      projectSpan(project, assignments, config.stakeholders),
      config,
    );
    expect(teamsOf(items).map((team) => team.tag)).toEqual(['BA', 'ServerSide', 'iOSDev', 'QA']);
  });

  it('write the days as the bars show them', () => {
    expect(formatManDays(1)).toBe('1 g');
    expect(formatManDays(12)).toBe('12 gg');
    expect(formatManDays(3.5)).toBe('3,5 gg');
  });
});
