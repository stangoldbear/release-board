import { describe, expect, it } from 'vitest';
import {
  NO_FILTER,
  filterMemos,
  filterTasks,
  isFiltering,
  isNoteShown,
  isSearching,
  matchingNoteDays,
} from './filters';
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

describe('the search in notes', () => {
  it('shows every note without a search, and the found ones with it', () => {
    expect(isNoteShown(null, '2026-10-05')).toBe(true);
    expect(isNoteShown(new Set(['2026-10-05']), '2026-10-05')).toBe(true);
    expect(isNoteShown(new Set(), '2026-10-05')).toBe(false);
  });

  it('finds the days whose note has the text, and nothing without a search', () => {
    const notes = { '2026-10-05': 'Congelamento del codice', '2026-10-06': 'Rilascio' };
    expect(matchingNoteDays(notes, '')).toBeNull();
    expect(matchingNoteDays(notes, 'codice')).toEqual(new Set(['2026-10-05']));
    expect(matchingNoteDays(notes, 'nulla')).toEqual(new Set());
  });

  it('finds free notes by title, text and author', () => {
    const memos = [
      { id: 'a', title: 'App mobile: rilascio a gennaio', position: 1 },
      {
        id: 'b',
        title: 'Fornitore',
        body: 'Stima entro il 17 luglio',
        position: 2,
        author: { id: '1002', login: 'editor' },
      },
    ];
    expect(filterMemos(memos, 'RILASCIO').map((memo) => memo.id)).toEqual(['a']);
    expect(filterMemos(memos, 'luglio').map((memo) => memo.id)).toEqual(['b']);
    expect(filterMemos(memos, 'editor').map((memo) => memo.id)).toEqual(['b']);
    expect(filterMemos(memos, '  ')).toEqual(memos);
  });

  it('counts as searching only with some text', () => {
    expect(isSearching({ search: ' ', status: 'review' })).toBe(false);
    expect(isSearching({ search: 'x', status: null })).toBe(true);
  });
});
