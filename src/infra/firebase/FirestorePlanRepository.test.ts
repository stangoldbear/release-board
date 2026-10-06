import { describe, expect, it } from 'vitest';
import { unavailableMessage } from './FirestorePlanRepository';

describe('the parts of the plan that the published rules refuse', () => {
  it('are named in one sentence', () => {
    expect(unavailableMessage(['projects'])).toMatch(/^Progetti non disponibili: .*regole/);
    expect(unavailableMessage(['memos', 'projects'])).toMatch(
      /^Note libere e progetti non disponibili/,
    );
  });
});
