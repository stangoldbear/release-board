import { describe, expect, it } from 'vitest';
import { NAME_TTL_MS, readNameCache, staleIds } from './authorNames';

describe('the names of the authors', () => {
  const cache = {
    '1001': { name: 'Mario Rossi', at: 1_000 },
    '1002': { name: null, at: 1_000 },
  };

  it('asks only for the accounts it does not know, or knows from too long ago', () => {
    expect(staleIds(['1001', '1002', '1003'], cache, 2_000)).toEqual(['1003']);
    expect(staleIds(['1001', '1003'], cache, 1_000 + NAME_TTL_MS + 1)).toEqual(['1001', '1003']);
  });

  it('reads what a browser saved, leaving out what is not a name', () => {
    expect(
      readNameCache({ ...cache, broken: { name: 3, at: 1 }, other: 'x', late: { name: 'L' } }),
    ).toEqual(cache);
    expect(readNameCache([])).toBeNull();
    expect(readNameCache(null)).toBeNull();
  });
});
