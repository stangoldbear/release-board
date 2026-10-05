import { describe, expect, it } from 'vitest';
import {
  applyMemoChanges,
  diffMemo,
  dueMemos,
  endPosition,
  followerAt,
  memoMoves,
  memoSuggestions,
  memosInScope,
  readSeenReminders,
  rememberReminders,
  sortMemos,
  splitMemoTitle,
  withMilestone,
} from './memos';
import { addMemo, createEmptyPlan, isPlanEmpty, moveMemo, removeMemo, updateMemo } from './plan';
import type { Memo } from './types';

const memo = (id: string, position: number, extra: Partial<Memo> = {}): Memo => ({
  id,
  title: `Nota ${id}`,
  position,
  ...extra,
});

const strip = [memo('a', 1), memo('b', 2), memo('c', 3), memo('d', 4)];

const order = (memos: readonly Memo[]) => sortMemos(memos).map((item) => item.id);

describe('the order of the strip', () => {
  it('follows the position, then the id', () => {
    expect(order([memo('b', 2), memo('z', 1), memo('a', 2)])).toEqual(['z', 'a', 'b']);
  });

  it('adds new notes after the last one', () => {
    expect(endPosition([])).toBe(1);
    expect(endPosition([memo('a', 2.5), memo('b', 1)])).toBe(3.5);
  });
});

describe('memoMoves', () => {
  it('moves only the note, halfway between its new neighbours', () => {
    expect(memoMoves(strip, 'd', 'b')).toEqual(new Map([['d', 1.5]]));
    expect(memoMoves(strip, 'a', null)).toEqual(new Map([['a', 5]]));
    expect(memoMoves(strip, 'c', 'a')).toEqual(new Map([['c', 0]]));
  });

  it('does nothing in place, or when a note is missing', () => {
    expect(memoMoves(strip, 'b', 'c')).toEqual(new Map());
    expect(memoMoves(strip, 'd', null)).toEqual(new Map());
    expect(memoMoves(strip, 'b', 'b')).toEqual(new Map());
    expect(memoMoves(strip, 'missing', 'a')).toEqual(new Map());
    expect(memoMoves(strip, 'b', 'missing')).toEqual(new Map());
  });

  it('numbers every note again when there is no room left between two', () => {
    const tight = [memo('a', 1), memo('b', 1 + Number.EPSILON), memo('c', 3)];
    expect(memoMoves(tight, 'c', 'b')).toEqual(
      new Map([
        ['c', 2],
        ['b', 3],
      ]),
    );
  });

  it('numbers the shared notes without gaps where private notes sit', () => {
    // A private note tied with a shared one leaves no room before it.
    const strip = [
      memo('s1', 1),
      memo('p1', 2, { private: true }),
      memo('s2', 2),
      memo('s3', 3),
      memo('p2', 9, { private: true }),
      memo('p3', 10, { private: true }),
    ];
    expect(memoMoves(strip, 's3', 's2')).toEqual(
      new Map([
        ['p1', 1.5],
        ['s3', 2],
        ['s2', 3],
        ['p2', 3 + 1 / 3],
        ['p3', 3 + 2 / 3],
      ]),
    );
  });

  it('moves a note that keeps its number while the others make room', () => {
    // Two notes added at the same moment share a position.
    const tied = [memo('c', 1), memo('x', 1), memo('b', 2), memo('a', 3)];
    const moves = memoMoves(tied, 'b', 'x');
    expect(moves.has('b')).toBe(false);
    const plan = moveMemo({ ...createEmptyPlan(), memos: tied }, 'b', 'x');
    expect(order(plan.memos)).toEqual(['c', 'b', 'x', 'a']);
  });

  it('keeps any order through many moves', () => {
    let plan = { ...createEmptyPlan(), memos: strip };
    for (let step = 0; step < 80; step += 1) {
      const id = step % 2 ? 'a' : 'd';
      plan = moveMemo(plan, id, followerAt(plan.memos, id, 1));
    }
    expect(order(plan.memos)).toHaveLength(4);
    expect(new Set(plan.memos.map((item) => item.position)).size).toBe(4);
  });
});

describe('followerAt', () => {
  it('names the note that follows once the move is done, counting the others', () => {
    expect(followerAt(strip, 'd', 1)).toBe('b');
    expect(followerAt(strip, 'a', 0)).toBe('b');
    expect(followerAt(strip, 'a', 3)).toBeNull();
    expect(followerAt(strip, 'a', -1)).toBe('b');
  });

  it('works on part of the strip: the neighbour is the same in the whole strip', () => {
    const part = [strip[0]!, strip[2]!];
    const target = followerAt(part, 'c', 0);
    expect(target).toBe('a');
    expect(order(moveMemo({ ...createEmptyPlan(), memos: strip }, 'c', target).memos)).toEqual([
      'c',
      'a',
      'b',
      'd',
    ]);
  });
});

describe('memosInScope', () => {
  const me = { id: '1', login: 'io' };
  const other = { id: '2', login: 'altro' };
  const memos = [
    memo('mine', 1, { author: me }),
    memo('theirs', 2, { author: other }),
    memo('secret', 3, { author: me, private: true }),
    memo('nobody', 4),
  ];

  it("shows the user's own notes, private ones included, or all of them", () => {
    expect(memosInScope(memos, 'mine', '1').map((item) => item.id)).toEqual(['mine', 'secret']);
    expect(memosInScope(memos, 'all', '1')).toEqual(memos);
  });
});

describe('changes to a note', () => {
  const full = memo('a', 1, { body: 'Testo', colorId: 'red', remindOn: '2026-07-17' });

  it('makes a note private, and shared again', () => {
    expect(
      diffMemo(full, {
        title: 'Nota a',
        body: 'Testo',
        colorId: 'red',
        remindOn: '2026-07-17',
        private: true,
      }),
    ).toEqual({
      private: true,
    });
    const secret = { ...full, private: true as const };
    expect(
      diffMemo(secret, { title: 'Nota a', body: 'Testo', colorId: 'red', remindOn: '2026-07-17' }),
    ).toEqual({
      private: null,
    });
  });

  it('lists the fields that changed, with null for the ones removed', () => {
    expect(diffMemo(full, { title: ' Nota a ', body: 'Testo', colorId: 'red' })).toEqual({
      remindOn: null,
    });
    expect(diffMemo(full, { title: 'Altra', body: '   ', remindOn: '2026-07-18' })).toEqual({
      title: 'Altra',
      body: null,
      colorId: null,
      remindOn: '2026-07-18',
    });
  });

  it('applies them, removing the fields set to null', () => {
    expect(applyMemoChanges(full, { body: null, colorId: 'blue', title: 'Nuovo' })).toEqual({
      id: 'a',
      title: 'Nuovo',
      colorId: 'blue',
      remindOn: '2026-07-17',
      position: 1,
    });
  });
});

describe('reminders already shown', () => {
  it('adds the reminders shown and forgets deleted notes', () => {
    const existing = [memo('a', 1, { remindOn: '2026-10-05' }), memo('b', 2)];
    expect(
      rememberReminders({ b: '2026-10-01', gone: '2026-10-02' }, [existing[0]!], existing),
    ).toEqual({
      a: '2026-10-05',
      b: '2026-10-01',
    });
  });

  it('reads what a browser saved, skipping what is not a day', () => {
    expect(readSeenReminders({ a: '2026-10-05', b: 3 })).toEqual({ a: '2026-10-05' });
    expect(readSeenReminders(['2026-10-05'])).toBeNull();
    expect(readSeenReminders(null)).toBeNull();
  });
});

describe('dueMemos', () => {
  const memos = [
    memo('past', 1, { remindOn: '2026-10-01' }),
    memo('today', 2, { remindOn: '2026-10-05' }),
    memo('later', 3, { remindOn: '2026-10-06' }),
    memo('none', 4),
  ];

  it('finds the reminders of today and of the days before', () => {
    expect(dueMemos(memos, '2026-10-05', {}).map((item) => item.id)).toEqual(['past', 'today']);
  });

  it('skips what this browser has shown, until the reminder moves to another day', () => {
    expect(dueMemos(memos, '2026-10-05', { past: '2026-10-01' }).map((item) => item.id)).toEqual([
      'today',
    ]);
    expect(dueMemos(memos, '2026-10-05', { past: '2026-09-01' }).map((item) => item.id)).toEqual([
      'past',
      'today',
    ]);
  });
});

describe('notes in the plan', () => {
  it('adds, changes and removes notes, keeping the strip in order', () => {
    let plan = addMemo(createEmptyPlan(), memo('b', 2));
    expect(isPlanEmpty(plan)).toBe(false);
    plan = addMemo(plan, memo('a', 1));
    expect(order(plan.memos)).toEqual(['a', 'b']);
    expect(plan.memos.map((item) => item.id)).toEqual(['a', 'b']);
    plan = moveMemo(plan, 'a', null);
    plan = updateMemo(plan, 'a', { body: 'Corpo' });
    expect(plan.memos.map((item) => item.id)).toEqual(['b', 'a']);
    expect(plan.memos[1]).toMatchObject({ body: 'Corpo' });
    plan = removeMemo(plan, 'b');
    expect(plan.memos.map((item) => item.id)).toEqual(['a']);
    expect(updateMemo(plan, 'gone', { title: 'x' })).toEqual(plan);
  });
});

describe('titles of the form "lead: rest"', () => {
  it('splits at the first colon followed by a space, with text on both sides', () => {
    expect(splitMemoTitle('PROGETTO ALFA: Golive Gennaio')).toEqual({
      lead: 'PROGETTO ALFA:',
      rest: 'Golive Gennaio',
    });
    expect(splitMemoTitle('Ore 10:30: riunione')).toEqual({ lead: 'Ore 10:30:', rest: 'riunione' });
    for (const title of [
      'App mobile, rilascio a gennaio',
      ': senza capo',
      'Senza coda:',
      'Deploy alle 14:00',
      'Vedi https://example.com/piano',
      'Riunione 10:30 col team',
    ]) {
      expect(splitMemoTitle(title)).toEqual({ lead: null, rest: title });
    }
  });

  it('suggests the go-live of this month and the next four, then the usual milestones', () => {
    expect(memoSuggestions('2026-10-05')).toEqual([
      'Golive Ottobre',
      'Golive Novembre',
      'Golive Dicembre',
      'Golive Gennaio',
      'Golive Febbraio',
      'Code Freeze',
      'Rollout 100%',
    ]);
  });

  it('puts a milestone after the colon, in place of another milestone only', () => {
    expect(withMilestone('App mobile', 'Golive Gennaio')).toBe('App mobile: Golive Gennaio');
    expect(withMilestone('App mobile:', 'Golive Gennaio')).toBe('App mobile: Golive Gennaio');
    expect(withMilestone('App mobile: Golive Gennaio', 'Code Freeze')).toBe(
      'App mobile: Code Freeze',
    );
    // A milestone of a month no longer suggested is still a milestone.
    expect(withMilestone('App mobile: golive luglio', 'Code Freeze')).toBe(
      'App mobile: Code Freeze',
    );
    expect(withMilestone('Fornitore: stima entro il 20', 'Code Freeze')).toBe(
      'Fornitore: stima entro il 20 · Code Freeze',
    );
    expect(withMilestone('Fornitore: stima · Golive Ottobre', 'Golive Novembre')).toBe(
      'Fornitore: stima · Golive Novembre',
    );
    expect(withMilestone('Riunione 10:30 col team', 'Code Freeze')).toBe(
      'Riunione 10:30 col team: Code Freeze',
    );
    expect(withMilestone('  ', 'Rollout 100%')).toBe('Rollout 100%');
    expect(withMilestone('x'.repeat(199), 'Golive')).toHaveLength(200);
  });
});
