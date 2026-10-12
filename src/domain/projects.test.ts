import { describe, expect, it } from 'vitest';
import { diffProject, parseProjectData, sortProjects } from './projects';
import type { Project } from './types';

const project: Project = {
  id: 'p1',
  title: 'App mobile 3.0',
  startDate: '2026-09-10',
  endDate: '2026-12-20',
  colorId: 'purple',
  status: 'in_progress',
  owner: 'Giulia',
};

describe('projects', () => {
  it('follow their start, then their end and title', () => {
    const later = { ...project, id: 'p2', startDate: '2026-10-01' };
    const shorter = { ...project, id: 'p3', endDate: '2026-11-01' };
    expect(sortProjects([later, project, shorter]).map((item) => item.id)).toEqual([
      'p3',
      'p1',
      'p2',
    ]);
  });

  it('save only what changed, removing blank owner and description', () => {
    expect(
      diffProject(project, {
        title: ' App mobile 3.0 ',
        startDate: '2026-09-10',
        endDate: '2027-01-31',
        colorId: 'purple',
        status: 'planned',
        owner: '  ',
        description: 'Nuovo carrello ',
      }),
    ).toEqual({
      endDate: '2027-01-31',
      status: 'planned',
      owner: null,
      description: 'Nuovo carrello',
    });
  });

  it('save the planned end, the effort, the deadline, the contingency and the arrangement', () => {
    const content = {
      title: 'App mobile 3.0',
      startDate: '2026-09-10',
      colorId: 'purple' as const,
      status: 'in_progress' as const,
      owner: 'Giulia',
      manDays: 20,
      deadline: '2026-12-01',
      contingency: { startDate: '2026-11-20', manDays: 3 },
      arrangement: 'parallel' as const,
    };
    expect(diffProject(project, content)).toEqual({
      endDate: null,
      manDays: 20,
      deadline: '2026-12-01',
      contingency: { startDate: '2026-11-20', manDays: 3 },
      arrangement: 'parallel',
    });
    expect(
      diffProject({ ...project, ...content }, { ...project, arrangement: 'standard' }),
    ).toEqual({
      manDays: null,
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
    expect(
      parseProjectData({ ...data, arrangement: 'standard', endDate: '2026-12-20' }),
    ).toMatchObject({ content: { endDate: '2026-12-20' } });
    expect(parseProjectData({ ...data, colorId: 'neon' }, true)).toMatchObject({
      content: { colorId: 'blue' },
    });
    expect(
      parseProjectData({
        ...data,
        endDate: '2026-09-01',
        manDays: 0,
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
        "la fine precede l'inizio",
        'giorni uomo non validi',
        'hard deadline non valida',
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
