import { describe, expect, it } from 'vitest';
import { diffProject, sortProjects } from './projects';
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
});
