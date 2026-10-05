import { describe, expect, it } from 'vitest';
import { describeChange, describeHistoryEntry, fieldChanges } from './history';
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

describe('describeChange', () => {
  it('says what was done without who did it', () => {
    expect(describeChange(noteEntry({ after: { text: 'Rilascio' } }))).toBe(
      'ha modificato la nota del 07/10/2026',
    );
    expect(
      describeChange(noteEntry({ entity: 'metric', action: 'import', summary: '2 giorni' })),
    ).toBe('ha importato: 2 giorni');
  });
});

describe('fieldChanges', () => {
  const lanes = (id: string) => ({ 'lane-1': 'Frontend', 'lane-2': 'Backend' })[id];

  it('lists the fields of a task that changed, in words', () => {
    const entry = noteEntry({
      entity: 'task',
      before: { laneId: 'lane-1', endDate: '2026-10-08', status: 'planned' },
      after: { title: 'API', laneId: 'lane-2', endDate: '2026-10-09', status: 'in_progress' },
    });
    expect(fieldChanges(entry, lanes)).toEqual([
      { label: 'Corsia', before: 'Frontend', after: 'Backend' },
      { label: 'Fine', before: '08/10/2026', after: '09/10/2026' },
      { label: 'Stato', before: 'Pianificato', after: 'In corso' },
    ]);
  });

  it('shows the day of a moved note and the values saved by hand', () => {
    const move = noteEntry({
      before: { date: '2026-10-05', text: 'A' },
      after: { date: '2026-10-07', text: 'A' },
    });
    expect(fieldChanges(move, lanes)).toEqual([
      { label: 'Giorno', before: '05/10/2026', after: '07/10/2026' },
    ]);
    const values = noteEntry({
      entity: 'metric',
      after: { '2026-10-06': 1250.5, '2026-10-05': null },
      summary: '2 valori giornalieri',
    });
    expect(fieldChanges(values, lanes)).toEqual([
      { label: '05/10/2026', after: 'Rimosso' },
      { label: '06/10/2026', after: '1250,50' },
    ]);
  });
});
