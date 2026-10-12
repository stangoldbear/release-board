import { describe, expect, it } from 'vitest';
import { defaultRoadmapConfig, projectColorField } from './roadmapConfig';
import {
  customOrder,
  followerOf,
  nextProjectPosition,
  projectMoves,
  renumberProjects,
  sortProjectsBy,
} from './projectOrder';
import type { Project } from './types';

const config = defaultRoadmapConfig();
const size = projectColorField(config)!;
const [small, medium, big] = size.options!.map((option) => option.id) as [string, string, string];

const project = (id: string, extra: Partial<Project> = {}): Project => ({
  id,
  title: id.toUpperCase(),
  startDate: '2026-11-02',
  colorId: 'blue',
  status: 'planned',
  ...extra,
});

const context = {
  today: '2026-10-12',
  endOf: (item: Project) => item.endDate ?? item.startDate,
  field: size,
};

describe('the order of the projects', () => {
  const projects = [
    project('c', { position: 3, startDate: '2026-09-01', deadline: '2026-10-01' }),
    project('a', { position: 1, startDate: '2026-12-01', status: 'completed' }),
    project('n', { startDate: '2026-10-01', deadline: '2026-11-15', fields: { [size.id]: [big] } }),
    project('b', {
      position: 2,
      startDate: '2026-11-01',
      deadline: '2026-10-20',
      fields: { [size.id]: [small] },
    }),
  ];

  it('is the one the members gave, with the projects without a position last by start', () => {
    expect(customOrder(projects).map((item) => item.id)).toEqual(['a', 'b', 'c', 'n']);
    expect(sortProjectsBy(projects, 'custom', context).map((item) => item.id)).toEqual([
      'a',
      'b',
      'c',
      'n',
    ]);
  });

  it('follows a criterion, with the custom order for the ties', () => {
    const ids = (sort: Parameters<typeof sortProjectsBy>[1]) =>
      sortProjectsBy(projects, sort, context).map((item) => item.id);
    expect(ids('start')).toEqual(['c', 'n', 'b', 'a']);
    expect(ids('end')).toEqual(['c', 'n', 'b', 'a']);
    // Deadlines to come from the nearest, then no deadline, then the past ones.
    expect(ids('deadline')).toEqual(['b', 'n', 'a', 'c']);
    expect(ids('field')).toEqual(['b', 'n', 'a', 'c']);
    expect(ids('status')).toEqual(['b', 'c', 'n', 'a']);
    expect(ids('title')).toEqual(['a', 'b', 'c', 'n']);
    expect(sortProjectsBy(projects, 'field', { ...context, field: null }).map((p) => p.id)).toEqual(
      ['a', 'b', 'c', 'n'],
    );
  });

  it('moves a project between two others with one position, or renumbers them all', () => {
    expect(projectMoves(projects, 'c', 'b')).toEqual(new Map([['c', 1.5]]));
    expect(projectMoves(projects, 'a', null)).toEqual(
      new Map([
        ['b', 1],
        ['c', 2],
        ['n', 3],
        ['a', 4],
      ]),
    );
    // Before a project without a position: everything is numbered again.
    expect(projectMoves(projects, 'a', 'n')).toEqual(
      new Map([
        ['b', 1],
        ['c', 2],
        ['a', 3],
        ['n', 4],
      ]),
    );
    expect(projectMoves(projects, 'a', 'a')).toEqual(new Map());
    expect(projectMoves(projects, 'ghost', null)).toEqual(new Map());
    expect(projectMoves(projects, 'a', 'b')).toEqual(new Map());
  });

  it('numbers a visible order and places a new project after every other', () => {
    expect(renumberProjects([projects[2]!, projects[0]!, projects[1]!])).toEqual(
      new Map([
        ['n', 1],
        ['c', 2],
        ['a', 3],
      ]),
    );
    expect(nextProjectPosition(projects)).toBe(4);
    expect(nextProjectPosition([])).toBe(1);
    expect(followerOf(customOrder(projects), 'c', 0)).toBe('a');
    expect(followerOf(customOrder(projects), 'c', 2)).toBe('n');
    expect(followerOf(customOrder(projects), 'c', 3)).toBeNull();
  });

  it('keeps the medium size between the others', () => {
    const sized = [
      project('x', { fields: { [size.id]: [medium] } }),
      project('y', { fields: { [size.id]: [big] } }),
      project('z'),
    ];
    expect(sortProjectsBy(sized, 'field', context).map((item) => item.id)).toEqual(['x', 'y', 'z']);
  });
});
