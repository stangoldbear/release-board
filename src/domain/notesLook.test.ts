import { describe, expect, it } from 'vitest';
import { DEFAULT_NOTES_LOOK, parseNotesLook } from './notesLook';

describe('parseNotesLook', () => {
  it('reads a saved look', () => {
    const look = { top: 'timeline', shape: 'card', layout: 'list', board: 'slate', paper: 'theme' };
    expect(parseNotesLook(look)).toEqual(look);
  });

  it('gives the default to what it does not know, and keeps the rest', () => {
    expect(parseNotesLook({ shape: 'plain', board: 'marble', extra: true })).toEqual({
      ...DEFAULT_NOTES_LOOK,
      shape: 'plain',
    });
  });

  it('refuses what is not a look', () => {
    expect(parseNotesLook('postit')).toBeNull();
    expect(parseNotesLook(null)).toBeNull();
    expect(parseNotesLook([])).toBeNull();
  });
});
