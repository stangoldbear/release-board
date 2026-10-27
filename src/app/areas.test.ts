import { describe, expect, it } from 'vitest';
import { ALL_AREAS_VISIBLE, HAS_BETA_FEATURES, availableAreas, parseAreaVisibility } from './areas';

describe('the areas shown', () => {
  it('reads what a browser saved', () => {
    expect(
      parseAreaVisibility({ notes: false, releases: true, roadmaps: false, people: false }),
    ).toEqual({
      notes: false,
      releases: true,
      roadmaps: false,
      people: false,
      contacts: true,
    });
  });

  it('shows the areas a saved value does not know', () => {
    expect(parseAreaVisibility({ notes: false })).toEqual({
      notes: false,
      releases: true,
      roadmaps: true,
      people: true,
      contacts: true,
    });
    expect(parseAreaVisibility({ notes: 'no' })).toEqual(ALL_AREAS_VISIBLE);
  });

  it('refuses what is not a saved choice', () => {
    expect(parseAreaVisibility(null)).toBeNull();
    expect(parseAreaVisibility([true])).toBeNull();
    expect(parseAreaVisibility('notes')).toBeNull();
  });
});

describe('the areas available', () => {
  it('offers the contacts only with the beta features (0.21)', () => {
    expect(availableAreas(false).map(({ id }) => id)).toEqual([
      'notes',
      'releases',
      'roadmaps',
      'people',
    ]);
    expect(availableAreas(true).map(({ id }) => id)).toEqual([
      'notes',
      'releases',
      'roadmaps',
      'people',
      'contacts',
    ]);
    expect(HAS_BETA_FEATURES).toBe(true);
  });
});
