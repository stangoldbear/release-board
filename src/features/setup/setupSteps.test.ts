import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { describeAuthError } from '../../infra/firebase/auth';
import { stepNumberIn, stepsFor } from './setupSteps';
import type { ProjectKind, StepContext } from './setupSteps';

const KINDS: ProjectKind[] = ['new', 'existing'];

function contextFor(kind: ProjectKind): StepContext {
  return {
    kind,
    host: 'team.example.org',
    siteUrl: 'https://team.example.org/release-board/',
    stepNumber: (id) => stepNumberIn(kind, id),
  };
}

describe('setup guides', () => {
  it('give each step its own title', () => {
    for (const kind of KINDS) {
      const titles = stepsFor(kind).map((step) => step.title);
      expect(new Set(titles).size, kind).toBe(titles.length);
    }
  });

  it('refer only to steps of the same guide', () => {
    for (const kind of KINDS) {
      for (const step of stepsFor(kind)) {
        const html = renderToStaticMarkup(
          createElement(Fragment, null, step.content(contextFor(kind))),
        );
        expect(html, `${kind}: ${step.title}`).not.toMatch(/undefined|NaN/);
      }
    }
  });

  it('number the steps from one, in guide order', () => {
    expect(stepNumberIn('existing', 'checkDatabase')).toBe(1);
    expect(stepNumberIn('existing', 'enableGitHub')).toBe(3);
    expect(stepNumberIn('new', 'enableGitHub')).toBe(3);
    expect(() => stepNumberIn('new', 'createApiKey')).toThrow();
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
