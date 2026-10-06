import { describe, expect, it } from 'vitest';
import {
  NO_FILTER,
  filterMemos,
  filterProjects,
  filterTasks,
  highlightRanges,
  isNoteShown,
  isSearching,
  matchingNoteDays,
  searchResults,
  searchWords,
  stepResult,
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
  });

  it('filters by status', () => {
    const filter = { search: '', status: 'in_progress' as const };
    expect(filterTasks(tasks, filter).map((item) => item.id)).toEqual(['1', '4']);
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

describe('the words of a search', () => {
  const found = (search: string, mode: 'all' | 'any') =>
    filterTasks(tasks, { search, mode, status: null }).map((item) => item.id);

  it('finds the items with all the words, wherever they are, by default', () => {
    expect(found('carrello giulia', 'all')).toEqual(['1']);
    expect(filterTasks(tasks, { search: 'carrello giulia', status: null })).toHaveLength(1);
    expect(found('carrello collaudo', 'all')).toEqual([]);
  });

  it('finds the items with at least one word, if asked', () => {
    expect(found('carrello collaudo', 'any')).toEqual(['1', '4']);
    expect(found('  ', 'any')).toEqual(['1', '2', '3', '4']);
  });

  it('applies to notes, free notes and projects too', () => {
    const notes = { '2026-10-05': 'Congelamento del codice', '2026-10-06': 'Rilascio del codice' };
    expect(matchingNoteDays(notes, 'codice rilascio', 'all')).toEqual(new Set(['2026-10-06']));
    expect(matchingNoteDays(notes, 'congelamento rilascio', 'any')).toEqual(
      new Set(['2026-10-05', '2026-10-06']),
    );
    const memos = [{ id: 'a', title: 'Golive gennaio', position: 1 }];
    expect(filterMemos(memos, 'golive marzo', 'any')).toHaveLength(1);
    expect(filterMemos(memos, 'golive marzo', 'all')).toHaveLength(0);
    const projects = [
      {
        id: 'p',
        title: 'App mobile',
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        colorId: 'blue' as const,
        status: 'planned' as const,
        owner: 'Giulia',
      },
    ];
    expect(filterProjects(projects, 'app giulia', 'all')).toHaveLength(1);
    expect(filterProjects(projects, 'app marco', 'all')).toHaveLength(0);
  });

  it('are lowercase and without accents', () => {
    expect(searchWords('  Attività   RILASCIO ')).toEqual(['attivita', 'rilascio']);
    expect(searchWords('   ')).toEqual([]);
  });
});

describe('highlightRanges', () => {
  it('counts the characters after an emoji right', () => {
    const text = '🚀 app mobile';
    const ranges = highlightRanges(text, ['app']);
    expect(ranges.map(([start, end]) => text.slice(start, end))).toEqual(['app']);
    expect(highlightRanges('Release 🚀 rollout', ['rollout'])).toEqual([[11, 18]]);
  });

  it('finds every word, without regard to case and accents, in the original text', () => {
    const text = 'Attività di rilascio: ATTIVITÀ';
    const ranges = highlightRanges(text, searchWords('attivita'));
    expect(ranges.map(([start, end]) => text.slice(start, end))).toEqual(['Attività', 'ATTIVITÀ']);
  });

  it('keeps accents written apart, and merges words that overlap', () => {
    const text = 'Café aperto';
    expect(highlightRanges(text, ['cafe'])).toEqual([[0, 5]]);
    expect(highlightRanges('rilascio', ['ril', 'lasc'])).toEqual([[0, 6]]);
    expect(highlightRanges('rilascio', [])).toEqual([]);
  });
});

describe('searchResults', () => {
  it('lists free notes, then tasks and notes by date, then projects', () => {
    const results = searchResults({
      memos: [{ id: 'm', title: 'Golive', position: 1 }],
      tasks: [
        task({ id: 't2', title: 'Rilascio', startDate: '2026-10-09', endDate: '2026-10-10' }),
        task({ id: 't1', title: 'Collaudo\n2', startDate: '2026-10-02' }),
      ],
      notes: { '2026-10-05': 'Golive' },
      projects: [
        {
          id: 'p',
          title: 'App',
          startDate: '2026-10-01',
          endDate: '2026-12-31',
          colorId: 'blue',
          status: 'planned',
        },
      ],
    });
    expect(results.map((result) => `${result.kind}:${result.id}`)).toEqual([
      'memo:m',
      'task:t1',
      'note:2026-10-05',
      'task:t2',
      'project:p',
    ]);
    expect(results[1]).toMatchObject({ date: '2026-10-02', label: 'attività «Collaudo 2»' });
    expect(results[2]?.label).toBe('nota del giorno 05/10/2026');
    expect(results[3]?.endDate).toBe('2026-10-10');
  });
});

describe('stepResult', () => {
  it('goes to the next or previous result, round at the ends', () => {
    expect(stepResult(null, 3, 1)).toBe(0);
    expect(stepResult(null, 3, -1)).toBe(2);
    expect(stepResult(2, 3, 1)).toBe(0);
    expect(stepResult(0, 3, -1)).toBe(2);
    expect(stepResult(1, 3, 1)).toBe(2);
  });
});
