import { describe, expect, it } from 'vitest';
import { countByStatus } from './stats';
import type { TaskItem } from './types';

function task(overrides: Partial<TaskItem> & Pick<TaskItem, 'id' | 'title'>): TaskItem {
  return {
    laneId: 'lane-1',
    startDate: '2026-09-01',
    endDate: '2026-09-01',
    colorId: 'yellow',
    borderStyle: 'dashed',
    status: 'planned',
    ...overrides,
  };
}

const tasks: TaskItem[] = [
  task({ id: '1', title: 'Nuovo carrello', status: 'in_progress', assignee: 'Giulia' }),
  task({ id: '2', title: 'API ordini', status: 'review', description: 'Verifica della sicurezza' }),
  task({ id: '3', title: 'Attività di rilascio', status: 'blocked' }),
  task({ id: '4', title: 'Collaudo', status: 'in_progress' }),
];

describe('countByStatus', () => {
  it('counts every status, including the ones without tasks', () => {
    expect(countByStatus(tasks)).toEqual({
      planned: 0,
      in_progress: 2,
      review: 1,
      completed: 0,
      blocked: 1,
    });
  });
});
