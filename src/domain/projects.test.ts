import { describe, expect, it } from 'vitest';
import { diffProject, parseProjectData, sortProjects } from './projects';
import type { Project } from './types';

const project: Project = {
  id: 'p1',
  title: 'App mobile 3.0',
  startDate: '2026-09-10',
  colorId: 'purple',
  status: 'in_progress',
  owner: 'Giulia',
};

describe('projects', () => {
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
