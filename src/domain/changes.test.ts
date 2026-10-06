import { describe, expect, it } from 'vitest';
import { applyChanges } from './changes';

describe('applyChanges', () => {
  it('replaces fields, removes those set to null and leaves the others', () => {
    const item: { title: string; owner?: string; body?: string } = {
      title: 'App',
      owner: 'Giulia',
      body: 'Testo',
    };
    expect(applyChanges(item, { title: 'App 2', owner: null, body: undefined })).toEqual({
      title: 'App 2',
      body: 'Testo',
    });
    expect(item).toEqual({ title: 'App', owner: 'Giulia', body: 'Testo' });
  });
});
