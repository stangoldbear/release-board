import { describe, expect, it } from 'vitest';
import { oneLineTitlesOf } from './useTimelineDisplay';

describe('oneLineTitlesOf', () => {
  it('puts the titles on one line with the titles alone, and in «Più giorni» at every level', () => {
    expect(oneLineTitlesOf({ level: 'titles' }, 'month')).toBe(true);
    expect(oneLineTitlesOf({ level: 'main' }, 'month')).toBe(false);
    expect(oneLineTitlesOf({ level: 'team' }, 'bimester')).toBe(false);
    expect(oneLineTitlesOf({ level: 'main' }, 'max')).toBe(true);
    expect(oneLineTitlesOf({ level: 'team' }, 'max')).toBe(true);
  });
});
