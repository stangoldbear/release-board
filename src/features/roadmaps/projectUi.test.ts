import { describe, expect, it } from 'vitest';
import { DETAIL_LEVELS } from './projectUi';

describe('the detail levels of the roadmap', () => {
  it('go from the titles alone to the team, each with a name and a description', () => {
    expect(DETAIL_LEVELS.map((level) => level.id)).toEqual(['titles', 'main', 'team']);
    for (const level of DETAIL_LEVELS) {
      expect(level.label).not.toBe('');
      expect(level.title.length).toBeGreaterThan(level.label.length);
    }
  });
});
