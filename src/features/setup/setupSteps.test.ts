import { describe, expect, it } from 'vitest';
import { describeAuthError } from '../../infra/firebase/auth';
import { stepsFor } from './setupSteps';
import type { ProjectKind } from './setupSteps';

const KINDS: ProjectKind[] = ['new', 'existing'];

describe('setup guides', () => {
  it('give each step its own title', () => {
    for (const kind of KINDS) {
      const titles = stepsFor(kind).map((step) => step.title);
      expect(new Set(titles).size, kind).toBe(titles.length);
    }
  });

  it('contain the steps that sign-in errors send the user to', () => {
    const titles = new Set(KINDS.flatMap((kind) => stepsFor(kind).map((step) => step.title)));
    const codes = [
      'auth/unauthorized-domain',
      'auth/operation-not-allowed',
      'auth/api-key-not-valid.-please-pass-a-valid-api-key.',
      'auth/requests-from-referer-https://team.example.org/-are-blocked.',
      'auth/requests-to-this-api-identitytoolkit-method-x-are-blocked.',
    ];
    for (const code of codes) {
      const title = /«(.+)»/.exec(describeAuthError(code))?.[1];
      expect(title && titles.has(title), code).toBe(true);
    }
  });
});
