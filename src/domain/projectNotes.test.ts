import { describe, expect, it } from 'vitest';
import {
  diffProjectNote,
  dueProjectNotes,
  isNoteOverdue,
  noteSuggestions,
  notesOfProject,
  parseProjectNote,
  rememberNoteReminders,
  splitList,
} from './projectNotes';
import type { ProjectNote } from './types';

const note: ProjectNote = {
  id: 'n1',
  projectId: 'p1',
  text: 'Stima: 15 giorni lato server',
  createdAt: '2026-10-06T09:30:00.000Z',
  author: { id: '1002', login: 'editor' },
  status: 'open',
  dueOn: '2026-10-20',
  remind: true,
  owners: ['Giulia', 'Marco'],
  tags: ['stima'],
};

describe('project notes', () => {
  it('are listed by project, oldest first', () => {
    const later = { ...note, id: 'n2', createdAt: '2026-10-07T08:00:00.000Z' };
    const other = { ...note, id: 'n3', projectId: 'p2' };
    expect(notesOfProject([later, other, note], 'p1').map((item) => item.id)).toEqual(['n1', 'n2']);
  });

  it('save only what changed, dropping empty lists and a reminder without a deadline', () => {
    expect(
      diffProjectNote(note, {
        projectId: 'p1',
        text: ' Stima: 15 giorni lato server ',
        status: 'done',
        dueOn: '',
        remind: true,
        owners: [],
        tags: ['stima'],
      }),
    ).toEqual({ status: 'done', dueOn: null, remind: null, owners: null });
    expect(diffProjectNote(note, { ...note, text: '' })).toEqual({});
    expect(diffProjectNote({ ...note, status: undefined }, { ...note, status: 'open' })).toEqual({
      status: 'open',
    });
  });

  it('split comma lists and suggest what was already written', () => {
    expect(splitList(' Giulia, Marco ,, Giulia,')).toEqual(['Giulia', 'Marco']);
    expect(
      noteSuggestions([note, { ...note, id: 'n2', owners: ['anna'], tags: ['Analisi'] }]),
    ).toEqual({
      owners: ['anna', 'Giulia', 'Marco'],
      tags: ['Analisi', 'stima'],
    });
  });

  it('remind of the notes due, not done and not shown yet for that deadline', () => {
    const done = { ...note, id: 'done', status: 'done' as const };
    const quiet = { ...note, id: 'quiet', remind: undefined };
    const future = { ...note, id: 'future', dueOn: '2026-11-01' };
    const notes = [note, done, quiet, future];
    expect(dueProjectNotes(notes, '2026-10-20', {}).map((item) => item.id)).toEqual(['n1']);
    expect(dueProjectNotes(notes, '2026-10-19', {})).toEqual([]);
    const seen = rememberNoteReminders({ gone: '2026-01-01' }, [note], notes);
    expect(seen).toEqual({ n1: '2026-10-20' });
    expect(dueProjectNotes(notes, '2026-10-25', seen)).toEqual([]);
    expect(dueProjectNotes([{ ...note, dueOn: '2026-10-22' }], '2026-10-25', seen)).toHaveLength(1);
    expect(isNoteOverdue(note, '2026-10-21')).toBe(true);
    expect(isNoteOverdue(note, '2026-10-20')).toBe(false);
    expect(isNoteOverdue(done, '2026-10-21')).toBe(false);
  });

  it('are read from their data, and refused when they do not fit', () => {
    const { id, ...data } = note;
    expect(parseProjectNote(id, data)).toEqual(note);
    expect(parseProjectNote('n1', { ...data, text: '' })).toBeNull();
    expect(parseProjectNote('n1', { ...data, createdAt: '2026-10-06' })).toBeNull();
    expect(parseProjectNote('n1', { ...data, status: 'maybe' })).toBeNull();
    expect(parseProjectNote('n1', { ...data, dueOn: undefined, remind: true })).toBeNull();
    expect(parseProjectNote('n1', { ...data, owners: ['', 'x'] })).toBeNull();
    expect(parseProjectNote('n1', { ...data, owners: [], tags: [] })).toEqual({
      ...note,
      owners: undefined,
      tags: undefined,
    });
    expect(
      parseProjectNote('n1', { projectId: 'p1', text: 'Solo testo', createdAt: note.createdAt }),
    ).toEqual({
      id: 'n1',
      projectId: 'p1',
      text: 'Solo testo',
      createdAt: note.createdAt,
    });
  });
});
