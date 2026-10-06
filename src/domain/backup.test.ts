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
import { defaultRoadmapConfig } from './roadmapConfig';

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
  projects: [
    {
      id: 'project-1',
      title: 'App mobile 3.0',
      startDate: '2026-09-10',
      endDate: '2026-12-20',
      colorId: 'purple',
      status: 'in_progress',
      owner: 'Giulia',
      description: 'Nuovo carrello',
    },
    {
      id: 'project-2',
      title: 'Programma fedeltà',
      startDate: '2027-01-01',
      endDate: '2027-03-31',
      colorId: 'yellow',
      status: 'idea',
    },
  ],
  projectNotes: [
    {
      id: 'note-1',
      projectId: 'project-1',
      text: 'Stima: 15 giorni lato server',
      createdAt: '2026-09-20T09:30:00.000Z',
      author: { id: '1002', login: 'editor' },
      status: 'open',
      dueOn: '2026-10-20',
      remind: true,
      owners: ['Giulia'],
      tags: ['stima'],
    },
  ],
  assignments: [
    {
      id: 'assignment-1',
      projectId: 'project-1',
      stakeholderId: 'ios-1',
      startDate: '2026-09-14',
      manDays: 15,
      note: 'Prima fase',
    },
  ],
  roadmap: defaultRoadmapConfig(),
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
      projects: [],
      projectNotes: [],
      assignments: [],
      roadmap: defaultRoadmapConfig(),
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
    expect(errorsOf({ ...valid, schemaVersion: 7 })).toEqual([
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

  it('read the backups of 0.5, which have no projects', () => {
    const { projects, projectNotes, assignments, ...withoutProjects } = valid;
    const result = parseBackup({ ...withoutProjects, schemaVersion: 4 });
    expect(projects).toHaveLength(2);
    expect(projectNotes.length + assignments.length).toBe(2);
    expect(result).toMatchObject({ ok: true, plan: { memos: plan.memos, projects: [] } });
  });

  it('explain every problem of a project', () => {
    const broken = {
      ...valid,
      projectNotes: [],
      assignments: [],
      projects: [
        {
          id: 'p-1',
          title: '',
          startDate: '2026-01-01',
          endDate: '2026-02-01',
          colorId: 'blue',
          status: 'idea',
        },
        {
          id: 'p-2',
          title: 'Due',
          startDate: '2026-03-01',
          endDate: '2026-02-01',
          colorId: 'rainbow',
          status: 'done',
        },
        {
          id: 'p-2',
          title: 'Tre',
          startDate: 'ieri',
          endDate: '2026-02-01',
          colorId: 'blue',
          status: 'idea',
          owner: 7,
        },
        {
          id: 'p-4',
          title: 'Quattro',
          startDate: '2026-01-01',
          endDate: '2026-02-01',
          colorId: 'blue',
          status: 'idea',
          description: 'x'.repeat(5001),
        },
        'nope',
      ],
    };
    expect(errorsOf(broken)).toEqual([
      'Progetto 1: manca il titolo.',
      'Progetto "Due": la fine precede l\'inizio, colore non riconosciuto, stato non valido.',
      'Progetto "Tre": data di inizio non valida, responsabile non valido.',
      'Progetto "Quattro": descrizione non valida.',
      'Progetto 5: formato non valido.',
    ]);
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

describe('backups of 0.6 and the roadmap of 0.7', () => {
  const valid = createBackupFile(plan, new Date('2026-09-28T10:00:00Z'));

  it('read the backups of 0.6, which have no notes of the projects, assignments or configuration', () => {
    const { projectNotes, assignments, roadmap, ...older } = valid;
    expect(projectNotes).toHaveLength(1);
    expect(assignments).toHaveLength(1);
    expect(roadmap.fields.length).toBeGreaterThan(0);
    const result = parseBackup({ ...older, schemaVersion: 5 });
    expect(result).toMatchObject({
      ok: true,
      plan: {
        projects: plan.projects,
        projectNotes: [],
        assignments: [],
        roadmap: defaultRoadmapConfig(),
      },
    });
  });

  it('keep the values of the custom fields of a project, and refuse ones that are not a map', () => {
    const fields = { impactedTeams: ['qa', 'ba'], jiraEpics: ['https://jira.example.com/E-1'] };
    const withFields = {
      ...valid,
      projects: [{ ...plan.projects[0], fields }, plan.projects[1]],
    };
    const result = parseBackup(withFields);
    expect(result.ok && result.plan.projects[0]?.fields).toEqual(fields);
    expect(
      errorsOf({
        ...valid,
        projectNotes: [],
        assignments: [],
        projects: [{ ...plan.projects[0], fields: ['x'] }],
      }),
    ).toEqual(['Progetto "App mobile 3.0": campi non validi.']);
  });

  it('explain every problem of the notes of the projects and of the assignments', () => {
    const note = valid.projectNotes[0]!;
    const assignment = valid.assignments[0]!;
    expect(
      errorsOf({
        ...valid,
        projectNotes: [
          note,
          { ...note },
          { ...note, id: 'n2', projectId: 'missing' },
          { ...note, id: 'n3', text: '' },
        ],
        assignments: [
          assignment,
          { ...assignment, id: 'a2', projectId: 'missing' },
          { ...assignment, id: 'a3', stakeholderId: 'nobody' },
          { ...assignment, id: 'a4', manDays: -1 },
        ],
      }),
    ).toEqual([
      'Nota dei progetti 2: identificativo "note-1" ripetuto.',
      'Nota dei progetti 3: progetto inesistente.',
      'Nota dei progetti 4: formato non valido.',
      'Assegnazione 2: progetto inesistente.',
      'Assegnazione 3: persona inesistente.',
      'Assegnazione 4: formato non valido.',
    ]);
  });

  it('explain every problem of the configuration of the roadmap', () => {
    const { roadmap } = valid;
    expect(
      errorsOf({
        ...valid,
        assignments: [],
        roadmap: {
          fields: [roadmap.fields[0], { id: 'x', label: 'X', type: 'attachment' }],
          teams: [roadmap.teams[0], roadmap.teams[0]],
          stakeholders: [{ id: 'ux-1', name: 'UX #1', teamId: 'design' }],
        },
      }),
    ).toEqual([
      'Team 2: identificativo "server" ripetuto.',
      'Persona del team 1: team inesistente.',
      'Campo dei progetti 2: formato non valido.',
    ]);
    expect(errorsOf({ ...valid, roadmap: 'nope' })).toEqual([
      'Configurazione della roadmap: formato non valido.',
      'Assegnazione 1: persona inesistente.',
    ]);
  });
});
