import { describe, expect, it } from 'vitest';
import { describeHistoryEntry } from './history';
import type { HistoryEntry } from './history';

const actor = { uid: 'uid-1', githubId: '1', login: 'anna' };

function noteEntry(changes: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 'h-1',
    entity: 'note',
    entityId: '2026-10-07',
    action: 'update',
    actor,
    at: null,
    ...changes,
  };
}

describe('describeHistoryEntry', () => {
  it('tells a moved note by its days before and after', () => {
    const entry = noteEntry({
      before: { date: '2026-10-05', text: 'Code freeze' },
      after: { date: '2026-10-07', text: 'Code freeze' },
    });
    expect(describeHistoryEntry(entry)).toBe(
      'anna ha spostato la nota dal 05/10/2026 al 07/10/2026',
    );
  });

  it('names the day of a note that stays where it is', () => {
    expect(describeHistoryEntry(noteEntry({ after: { text: 'Rilascio' } }))).toBe(
      'anna ha modificato la nota del 07/10/2026',
    );
    expect(
      describeHistoryEntry(
        noteEntry({ action: 'create', after: { date: '2026-10-07', text: 'Rilascio' } }),
      ),
    ).toBe('anna ha aggiunto la nota del 07/10/2026');
  });
});
