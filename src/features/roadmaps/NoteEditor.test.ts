import { describe, expect, it } from 'vitest';
import { emptyNoteDraft, noteDraftContent } from './NoteEditor';

describe('the pending project note', () => {
  it('uses the same content for Add and the project Save', () => {
    expect(
      noteDraftContent('p1', {
        ...emptyNoteDraft(),
        text: ' Pending ',
        status: 'open',
        dueOn: '2026-11-02',
        remind: true,
        owners: 'One, Two',
        tags: 'test',
      }),
    ).toEqual({
      projectId: 'p1',
      text: 'Pending',
      status: 'open',
      dueOn: '2026-11-02',
      remind: true,
      owners: ['One', 'Two'],
      tags: ['test'],
    });
  });
  it('does not save blank notes or invalid deadlines', () => {
    expect(noteDraftContent('p1', emptyNoteDraft())).toBeNull();
    expect(
      noteDraftContent('p1', { ...emptyNoteDraft(), text: 'Pending', dueOn: 'invalid' }),
    ).toBeNull();
    expect(noteDraftContent('p1', { ...emptyNoteDraft(), text: 'Pending', remind: true })).toEqual({
      projectId: 'p1',
      text: 'Pending',
    });
  });
});
