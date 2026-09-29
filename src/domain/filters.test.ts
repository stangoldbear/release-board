import { describe, expect, it } from 'vitest';
import { NO_FILTER, filterTasks, isFiltering } from './filters';
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

describe('filterTasks', () => {
  it('keeps everything without a filter', () => {
    expect(filterTasks(tasks, NO_FILTER)).toEqual(tasks);
    expect(isFiltering(NO_FILTER)).toBe(false);
    expect(isFiltering({ search: '  ', status: null })).toBe(false);
  });

  it('filters by status', () => {
    const filter = { search: '', status: 'in_progress' as const };
    expect(filterTasks(tasks, filter).map((item) => item.id)).toEqual(['1', '4']);
    expect(isFiltering(filter)).toBe(true);
  });

  it('finds text in title, assignee and description, ignoring case and accents', () => {
    const ids = (search: string) =>
      filterTasks(tasks, { search, status: null }).map((item) => item.id);
    expect(ids('CARRELLO')).toEqual(['1']);
    expect(ids('giulia')).toEqual(['1']);
    expect(ids('sicurezza')).toEqual(['2']);
    expect(ids('attivita')).toEqual(['3']);
    expect(ids('  collaudo ')).toEqual(['4']);
  });

  it('combines text and status', () => {
    expect(filterTasks(tasks, { search: 'carrello', status: 'review' })).toEqual([]);
  });
});
