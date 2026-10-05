import { describe, expect, it } from 'vitest';
import type { PlanSnapshot } from './types';
import {
  BACKUP_FORMAT,
  backupFileName,
  createBackupFile,
  parseBackup,
  parseBackupText,
  serializeBackup,
} from './backup';

const plan: PlanSnapshot = {
  lanes: [
    { id: 'lane-1', name: 'Frontend' },
    { id: 'lane-2', name: 'Backend' },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Nuovo carrello',
      laneId: 'lane-1',
      startDate: '2026-09-02',
      endDate: '2026-09-08',
      colorId: 'blue',
      borderStyle: 'dashed',
      status: 'in_progress',
      assignee: 'Giulia',
      deliverables: ['Revisione del codice'],
    },
    {
      id: 'task-2',
      title: 'API ordini',
      laneId: 'lane-2',
      startDate: '2026-09-03',
      endDate: '2026-09-03',
      colorId: 'yellow',
      borderStyle: 'solid',
      status: 'planned',
    },
  ],
  metrics: [
    { date: '2026-09-03', value: 98000 },
    { date: '2026-09-02', value: 1250.5 },
  ],
  dailyNotes: { '2026-09-15': 'Congelamento del codice' },
  memos: [
    { id: 'memo-1', title: 'App mobile: rilascio a gennaio', position: 1 },
    {
      id: 'memo-2',
      title: 'Stima del fornitore',
      body: 'Entro il 17',
      colorId: 'yellow',
      remindOn: '2026-07-17',
      position: 1.5,
      author: { id: '1002', login: 'editor' },
    },
  ],
};

/** A file written by the previous app version, with invented content. */
const legacyFile = {
  version: '2.0.0',
  updatedAt: '2026-09-01T08:00:00.000Z',
  updatedBy: 'someone@example.com',
  lanes: [
    { id: 'lane-1', name: 'CORSIA A', category: 'Attività', description: 'Prima corsia' },
    { id: 'lane-2', name: 'CORSIA B', category: 'Attività', description: 'Seconda corsia' },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Attività di prova',
      laneId: 'lane-2',
      startDate: '2026-09-10',
      endDate: '2026-09-11',
      colorId: 'server-yellow',
      borderStyle: 'dashed',
      status: 'completed',
      description: 'Descrizione',
    },
    {
      id: 'task-2',
      title: 'Collaudo',
      laneId: 'lane-1',
      startDate: '2026-09-14',
      endDate: '2026-09-16',
      colorId: 'qa-ice',
      status: 'planned',
    },
  ],
  metrics: [
    { date: '2026-09-10', value: '1.234.567' },
    { date: '2026-09-11', value: '98.765' },
  ],
  dailyNotes: { '2026-09-10': 'Nota di prova', '2026-09-11': '   ' },
};

function errorsOf(value: unknown): string[] {
  const result = parseBackup(value);
  if (result.ok) throw new Error('expected the backup to be rejected');
  return result.errors;
}

describe('backup round trip', () => {
  it('restores exactly the exported plan', () => {
    const text = serializeBackup(createBackupFile(plan, new Date('2026-09-28T10:00:00Z')));
    const result = parseBackupText(text);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('current');
    expect(result.exportedAt).toBe('2026-09-28T10:00:00.000Z');
    expect(result.plan).toEqual({
      ...plan,
      metrics: [...plan.metrics].sort((a, b) => a.date.localeCompare(b.date)),
    });
  });

  it('writes the metric with its definition and notes sorted by date', () => {
    const file = createBackupFile(plan, new Date('2026-09-28T10:00:00Z'));
    expect(file.format).toBe(BACKUP_FORMAT);
    expect(file.metrics).toEqual([
      {
        id: 'metric-1',
        label: 'Fatturato',
        unit: '€',
        decimals: 0,
        values: [
          { date: '2026-09-02', value: 1250.5 },
          { date: '2026-09-03', value: 98000 },
        ],
      },
    ]);
    expect(file.notes).toEqual([{ date: '2026-09-15', text: 'Congelamento del codice' }]);
  });

  it('names files after the local date', () => {
    expect(backupFileName(new Date(2026, 8, 28, 23, 30))).toBe(
      'release-board-backup-2026-09-28.json',
    );
    expect(backupFileName(new Date(2026, 8, 28), 'prima-del-ripristino')).toBe(
      'release-board-backup-2026-09-28-prima-del-ripristino.json',
    );
  });
});

describe('files of the previous app version', () => {
  it('are migrated to the current plan', () => {
    const result = parseBackup(legacyFile);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('legacy-v2');
    expect(result.exportedAt).toBe('2026-09-01T08:00:00.000Z');
    expect(result.plan).toEqual({
      lanes: [
        { id: 'lane-1', name: 'CORSIA A' },
        { id: 'lane-2', name: 'CORSIA B' },
      ],
      tasks: [
        {
          id: 'task-1',
          title: 'Attività di prova',
          laneId: 'lane-2',
          startDate: '2026-09-10',
          endDate: '2026-09-11',
          colorId: 'yellow',
          borderStyle: 'dashed',
          status: 'completed',
          description: 'Descrizione',
        },
        {
          id: 'task-2',
          title: 'Collaudo',
          laneId: 'lane-1',
          startDate: '2026-09-14',
          endDate: '2026-09-16',
          colorId: 'ice',
          borderStyle: 'dashed',
          status: 'planned',
        },
      ],
      metrics: [
        { date: '2026-09-10', value: 1234567 },
        { date: '2026-09-11', value: 98765 },
      ],
      dailyNotes: { '2026-09-10': 'Nota di prova' },
      memos: [],
    });
  });

  it('report metric values that are not numbers', () => {
    const file = { ...legacyFile, metrics: [{ date: '2026-09-10', value: 'n/d' }] };
    expect(errorsOf(file)).toEqual(['Metrica del 10/09/2026: valore non numerico.']);
  });
});

describe('invalid backups', () => {
  const valid = createBackupFile(plan, new Date('2026-09-28T10:00:00Z'));

  it('reject text that is not JSON', () => {
    expect(parseBackupText('{ nope')).toEqual({
      ok: false,
      errors: ['Il file non contiene JSON valido.'],
    });
  });

  it('reject unknown files and newer versions', () => {
    expect(errorsOf([])).toEqual(['Il file non contiene un backup.']);
    expect(errorsOf({ hello: 'world' })).toEqual(['Il file non è un backup di Release Board.']);
    expect(errorsOf({ ...valid, schemaVersion: 5 })).toEqual([
      'Il backup è stato creato con una versione più recente di Release Board.',
    ]);
    expect(errorsOf({ ...valid, schemaVersion: 2 })).toEqual([
      'Versione del backup non supportata.',
    ]);
  });

  it('read the backups of 0.4, which have no free notes', () => {
    const { memos, ...withoutMemos } = valid;
    const result = parseBackup({ ...withoutMemos, schemaVersion: 3 });
    expect(memos).toHaveLength(2);
    expect(result).toMatchObject({
      ok: true,
      plan: { lanes: plan.lanes, tasks: plan.tasks, dailyNotes: plan.dailyNotes, memos: [] },
    });
  });

  it('explain every problem of a free note', () => {
    const broken = {
      ...valid,
      memos: [
        { id: 'memo-1', title: '', position: 1 },
        { id: 'memo-2', title: 'Due', colorId: 'rainbow', remindOn: '2026-02-30', position: 'x' },
        { id: 'memo-2', title: 'Tre', body: 7, position: 3 },
        { id: 'memo-4', title: 'x'.repeat(201), position: 4 },
        { id: 'memo-5', title: 'Cinque', position: 5, author: { id: '1002' } },
      ],
    };
    expect(errorsOf(broken)).toEqual([
      'Nota libera 1: manca il titolo.',
      'Nota libera 2: colore non riconosciuto, data del promemoria non valida, posizione non valida.',
      'Nota libera 3: testo non valido.',
      'Nota libera 4: titolo troppo lungo.',
      'Nota libera 5: autore non valido.',
    ]);
  });

  it('never carry private notes, which belong to their author', () => {
    const secret = { id: 'memo-3', title: 'Solo per me', position: 3, private: true as const };
    const file = createBackupFile(
      { ...plan, memos: [...plan.memos, secret] },
      new Date('2026-09-28T10:00:00Z'),
    );
    expect(file.memos.map((memo) => memo.id)).toEqual(['memo-1', 'memo-2']);
  });

  it('explain every problem of a task', () => {
    const broken = {
      ...valid,
      tasks: [
        {
          ...plan.tasks[0],
          startDate: '2026-09-10',
          endDate: '2026-09-02',
          laneId: 'missing',
          colorId: 'pink',
        },
      ],
    };
    expect(errorsOf(broken)).toEqual([
      'Attività "Nuovo carrello": corsia inesistente, la fine precede l\'inizio, colore non riconosciuto.',
    ]);
  });

  it('reject duplicated ids, impossible dates and extra metrics', () => {
    const broken = {
      ...valid,
      tasks: [plan.tasks[0], { ...plan.tasks[1], id: 'task-1' }],
      metrics: [valid.metrics[0], valid.metrics[0]],
      notes: [{ date: '2026-02-30', text: 'x' }],
    };
    expect(errorsOf(broken)).toEqual([
      'Attività "API ordini": identificativo "task-1" ripetuto.',
      'Questa versione gestisce una sola metrica giornaliera.',
      'Nota 1: servono una data valida e un testo.',
    ]);
  });

  it('reject an unknown approval light and a promotion that is not text', () => {
    const [metric] = valid.metrics;
    const broken = {
      ...valid,
      metrics: [
        {
          ...metric,
          values: [
            { date: '2026-09-02', value: 1, approval: 'yellow' },
            { date: '2026-09-03', value: 2, promoEu: 3 },
            { date: '2026-09-04', value: 3, approval: 'red', promoNonEu: 'Saldi' },
          ],
        },
      ],
    };
    expect(errorsOf(broken)).toEqual([
      'Metrica del 02/09/2026: semaforo non valido.',
      'Metrica del 03/09/2026: promozione non valida.',
    ]);
  });

  it('list at most twenty problems', () => {
    const tasks = Array.from({ length: 25 }, (_, index) => ({
      ...plan.tasks[1],
      id: `t${index}`,
      laneId: 'x',
    }));
    const errors = errorsOf({ ...valid, tasks });
    expect(errors).toHaveLength(21);
    expect(errors.at(-1)).toBe('…e altri 5 problemi.');
  });
});
