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
    });
  });

  it('shows the areas a saved value does not know', () => {
    expect(parseAreaVisibility({ notes: false })).toEqual({
      notes: false,
      releases: true,
      roadmaps: true,
      people: true,
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
  it('offers every area with or without the beta features, now that nothing is in beta', () => {
    expect(availableAreas(false).map(({ id }) => id)).toEqual([
      'notes',
      'releases',
      'roadmaps',
      'people',
    ]);
    expect(availableAreas(true)).toEqual(availableAreas(false));
    expect(HAS_BETA_FEATURES).toBe(false);
  });
});
