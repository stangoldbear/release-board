import { describe, expect, it } from 'vitest';
import { CONTINGENCY_SEGMENTS_MAX, diffProject, parseProjectData, sortProjects } from './projects';
import {
  changeContingency,
  contingencySegments,
  duplicateContingency,
  moveContingency,
  removeContingency,
  splitContingency,
} from './contingency';
import type { Project } from './types';

const project: Project = {
  id: 'p1',
  title: 'App mobile 3.0',
  startDate: '2026-09-10',
  colorId: 'purple',
  status: 'in_progress',
  owner: 'Giulia',
};

describe('splitting a block of contingency', () => {
  const item = {
    ...project,
    contingency: {
      startDate: '2026-11-02',
      manDays: 4,
      note: 'Riserva',
      segments: [{ id: 'later', startDate: '2026-12-01', manDays: 1 }],
    },
  };
  const parts = [
    { startDate: '2026-11-02', manDays: 2 },
    { startDate: '2026-11-04', manDays: 2 },
  ];

  it('puts the parts in place of the block, the first keeping its id and the note', () => {
    expect(splitContingency(item, item.id, parts, ['new'], false)).toEqual({
      startDate: '2026-11-02',
      manDays: 2,
      note: 'Riserva',
      segments: [
        { id: 'new', startDate: '2026-11-04', manDays: 2 },
        { id: 'later', startDate: '2026-12-01', manDays: 1 },
      ],
    });
    expect(splitContingency(item, item.id, parts, ['new'], true)?.segments?.[0]?.note).toBe(
      'Riserva',
    );
  });

  it('splits a later block too, and refuses too many blocks or a missing one', () => {
    expect(
      splitContingency(
        item,
        'later',
        [
          { startDate: '2026-12-01', manDays: 0.5 },
          { startDate: '2026-12-02', manDays: 0.5 },
        ],
        ['b'],
        true,
      )?.segments?.map((block) => block.id),
    ).toEqual(['later', 'b']);
    const many = Array.from({ length: CONTINGENCY_SEGMENTS_MAX + 1 }, (_, index) => ({
      startDate: '2026-11-02',
      manDays: 1 + index,
    }));
    expect(splitContingency(item, item.id, many, ['a', 'b', 'c', 'd', 'e'], true)).toBeNull();
    expect(splitContingency(item, 'missing', parts, ['new'], true)).toBeNull();
  });
});

describe('projects', () => {
  it('duplicates reserve work after its end and moves every segment with the project', () => {
    const item = { ...project, contingency: { startDate: '2026-11-06', manDays: 1, note: 'Keep' } };
    const reserve = duplicateContingency(item, item.id, 'reserve-2', [
      { start: '2026-11-09', end: '2026-11-09' },
    ]);
    expect(reserve?.segments).toEqual([
      { id: 'reserve-2', startDate: '2026-11-10', manDays: 1, note: 'Keep' },
    ]);
    expect(moveContingency(reserve!, 7, []).segments?.[0]).toMatchObject({
      startDate: '2026-11-17',
      note: 'Keep',
    });
    expect(item.contingency).not.toHaveProperty('segments');
    expect(removeContingency({ ...item, contingency: reserve! }, item.id)).toEqual({
      startDate: '2026-11-10',
      manDays: 1,
      note: 'Keep',
    });
    expect(changeContingency(item, item.id, { note: '' })).not.toHaveProperty('note');
  });

  it('preserves independent reserve segments and detects changes to their notes', () => {
    const contingency = {
      startDate: '2026-11-02',
      manDays: 2,
      note: 'First',
      segments: [{ id: 'reserve-2', startDate: '2026-11-09', manDays: 3, note: 'Second' }],
    };
    const item = { ...project, contingency };
    expect(parseProjectData(item)).toMatchObject({ content: { contingency } });
    expect(contingencySegments(item).map((segment) => segment.id)).toEqual(['p1', 'reserve-2']);
    const changed = changeContingency(item, 'reserve-2', { note: 'Updated' });
    expect(changed?.startDate).toBe(contingency.startDate);
    expect(changed?.segments?.[0]?.note).toBe('Updated');
    expect(contingency.segments[0]?.note).toBe('Second');
    expect(diffProject(item, { ...item, contingency: changed })).toEqual({ contingency: changed });
    for (const segments of [
      [contingency.segments[0], contingency.segments[0]],
      [{ ...contingency.segments[0], startDate: 'invalid' }],
      [{ ...contingency.segments[0], note: 'x'.repeat(501) }],
      [{ ...contingency.segments[0], id: project.id }],
      Array.from({ length: CONTINGENCY_SEGMENTS_MAX + 1 }, (_, index) => ({
        ...contingency.segments[0],
        id: `reserve-${index}`,
      })),
    ]) {
      expect(parseProjectData({ ...item, contingency: { ...contingency, segments } })).toEqual({
        problems: ['contingency non valida'],
      });
    }
  });

  it('follow their start, then their title', () => {
    const later = { ...project, id: 'p2', startDate: '2026-10-01' };
    const app = { ...project, id: 'p3', title: 'App' };
    expect(sortProjects([later, project, app]).map((item) => item.id)).toEqual(['p3', 'p1', 'p2']);
  });

  it('save only what changed, removing blank owner and description', () => {
    expect(
      diffProject(project, {
        title: ' App mobile 3.0 ',
        startDate: '2026-09-10',
        colorId: 'purple',
        status: 'planned',
        owner: '  ',
        description: 'Nuovo carrello ',
      }),
    ).toEqual({
      status: 'planned',
      owner: null,
      description: 'Nuovo carrello',
    });
  });

  it('save the deadline, the contingency and the arrangement', () => {
    const content = {
      title: 'App mobile 3.0',
      startDate: '2026-09-10',
      colorId: 'purple' as const,
      status: 'in_progress' as const,
      owner: 'Giulia',
      deadline: '2026-12-01',
      contingency: { startDate: '2026-11-20', manDays: 3 },
      arrangement: 'parallel' as const,
    };
    expect(diffProject(project, content)).toEqual({
      deadline: '2026-12-01',
      contingency: { startDate: '2026-11-20', manDays: 3 },
      arrangement: 'parallel',
    });
    expect(
      diffProject({ ...project, ...content }, { ...project, arrangement: 'standard' }),
    ).toEqual({
      deadline: null,
      contingency: null,
      arrangement: 'standard',
    });
  });

  it('are read from their data, with the problems in words', () => {
    const data = {
      title: 'App mobile 3.0',
      startDate: '2026-09-10',
      colorId: 'purple',
      status: 'planned',
      deadline: '2026-12-01',
      contingency: { startDate: '2026-11-20', manDays: 3 },
      arrangement: 'sequence',
      owner: '  ',
    };
    expect(parseProjectData(data)).toEqual({
      content: {
        title: 'App mobile 3.0',
        startDate: '2026-09-10',
        colorId: 'purple',
        status: 'planned',
        deadline: '2026-12-01',
        contingency: { startDate: '2026-11-20', manDays: 3 },
        arrangement: 'sequence',
      },
    });
    // The planned end and the days of the project of the versions before 0.16 are ignored, even
    // when they would not be valid.
    expect(
      parseProjectData({ ...data, endDate: '2026-09-01', manDays: 0, arrangement: 'standard' }),
    ).toEqual({
      content: {
        title: 'App mobile 3.0',
        startDate: '2026-09-10',
        colorId: 'purple',
        status: 'planned',
        deadline: '2026-12-01',
        contingency: { startDate: '2026-11-20', manDays: 3 },
      },
    });
    expect(parseProjectData({ ...data, colorId: 'neon' }, true)).toMatchObject({
      content: { colorId: 'blue' },
    });
    expect(
      parseProjectData({
        ...data,
        deadline: 'domani',
        contingency: { startDate: '2026-11-20' },
        arrangement: 'free',
        colorId: 'neon',
        status: 'done',
        owner: 'x'.repeat(101),
        fields: 'none',
      }),
    ).toEqual({
      problems: [
        'deadline non valida',
        'contingency non valida',
        'disposizione non valida',
        'colore non riconosciuto',
        'stato non valido',
        'responsabile non valido',
        'campi non validi',
      ],
    });
    expect(parseProjectData({ startDate: '2026-09-10', colorId: 'blue', status: 'idea' })).toEqual({
      problems: ['manca il titolo'],
    });
    expect(parseProjectData('nope')).toEqual({ problems: ['formato non valido'] });
  });
});
