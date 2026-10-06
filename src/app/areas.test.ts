import { describe, expect, it } from 'vitest';
import { ALL_AREAS_VISIBLE, parseAreaVisibility } from './areas';

describe('the areas shown', () => {
  it('reads what a browser saved', () => {
    expect(parseAreaVisibility({ notes: false, releases: true, roadmaps: false })).toEqual({
      notes: false,
      releases: true,
      roadmaps: false,
    });
  });

  it('shows the areas a saved value does not know', () => {
    expect(parseAreaVisibility({ notes: false })).toEqual({
      notes: false,
      releases: true,
      roadmaps: true,
    });
    expect(parseAreaVisibility({ notes: 'no' })).toEqual(ALL_AREAS_VISIBLE);
  });

  it('refuses what is not a saved choice', () => {
    expect(parseAreaVisibility(null)).toBeNull();
    expect(parseAreaVisibility([true])).toBeNull();
    expect(parseAreaVisibility('notes')).toBeNull();
  });
});
