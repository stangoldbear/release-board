import { describe, expect, it } from 'vitest';
import { canReplacePlan } from './Instance';
import type { Instance } from './Instance';

function cloud(role: 'owner' | 'editor'): Instance {
  return {
    kind: 'cloud',
    projectId: 'demo',
    planName: 'Piano',
    user: {
      githubId: '1',
      login: 'someone',
      name: null,
      avatarUrl: null,
      email: null,
      emailVerified: false,
    },
    role,
    members: {} as never,
    history: {} as never,
    lookupName: () => Promise.resolve(null),
    signOut: () => Promise.resolve(),
  };
}

describe('canReplacePlan', () => {
  it('leaves the restore and the sample to the owner of a shared plan', () => {
    expect(canReplacePlan(cloud('owner'))).toBe(true);
    expect(canReplacePlan(cloud('editor'))).toBe(false);
  });

  it('lets anyone replace the plan of this browser', () => {
    expect(canReplacePlan({ kind: 'local' })).toBe(true);
  });
});
