import { describe, expect, it } from 'vitest';
import {
  describeChange,
  describeHistoryEntry,
  fieldChanges,
  isHistoryAction,
  isHistoryEntity,
} from './history';
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

describe('free notes in the history', () => {
  const memoEntry = (changes: Partial<HistoryEntry>): HistoryEntry =>
    noteEntry({ entity: 'memo', entityId: 'memo-1', ...changes });

  it('names the note, and tells a move from a change', () => {
    expect(
      describeChange(memoEntry({ action: 'create', after: { title: 'Stima', position: 1 } })),
    ).toBe('ha aggiunto la nota libera «Stima»');
    expect(
      describeChange(
        memoEntry({ before: { position: 1 }, after: { title: 'Stima', position: 2.5 } }),
      ),
    ).toBe('ha spostato la nota libera «Stima»');
    expect(
      describeChange(memoEntry({ before: { body: 'Entro il 17' }, after: { title: 'Stima' } })),
    ).toBe('ha modificato la nota libera «Stima»');
  });

  it('lists what changed: text, color and reminder, but not the place', () => {
    const entry = memoEntry({
      before: { body: 'Entro il 17', colorId: 'red', remindOn: '2026-07-17' },
      after: { title: 'Stima', colorId: 'blue', remindOn: '2026-07-20' },
    });
    expect(fieldChanges(entry, () => undefined)).toEqual([
      { label: 'Testo', before: 'Entro il 17' },
      { label: 'Colore', before: 'Rosso', after: 'Azzurro' },
      { label: 'Promemoria', before: '17/07/2026', after: '20/07/2026' },
    ]);
    expect(
      fieldChanges(
        memoEntry({ before: { position: 1 }, after: { title: 'Stima', position: 2 } }),
        () => undefined,
      ),
    ).toEqual([]);
  });

  it('tells when a note became private, or was shared again, without its private content', () => {
    const hidden = memoEntry({
      before: { private: false },
      after: { title: 'Stima', private: true },
    });
    expect(describeChange(hidden)).toBe('ha reso privata la nota libera «Stima»');
    expect(fieldChanges(hidden, () => undefined)).toEqual([
      { label: 'Visibilità', before: 'Condivisa', after: 'Privata' },
    ]);
    const shared = memoEntry({
      before: { private: true },
      after: { title: 'Stima', body: 'Entro il 17', position: 2, private: false },
    });
    expect(describeChange(shared)).toBe('ha condiviso la nota libera «Stima»');
    expect(fieldChanges(shared, () => undefined)).toEqual([
      { label: 'Testo', after: 'Entro il 17' },
      { label: 'Visibilità', before: 'Privata', after: 'Condivisa' },
    ]);
  });
});

describe('entries read from the database', () => {
  it('know their kinds of change and of entity', () => {
    expect(isHistoryEntity('memo')).toBe(true);
    expect(isHistoryEntity('toString')).toBe(false);
    expect(isHistoryEntity(3)).toBe(false);
    expect(isHistoryAction('import')).toBe(true);
    expect(isHistoryAction('rename')).toBe(false);
  });
});
