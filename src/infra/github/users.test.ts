import { describe, expect, it } from 'vitest';
import {
  isValidGitHubLogin,
  lookupGitHubNameById,
  lookupGitHubUser,
  lookupGitHubUserById,
} from './users';

function respond(status: number, body?: unknown): typeof fetch {
  return () =>
    Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
}

describe('isValidGitHubLogin', () => {
  it('accepts real usernames and rejects the rest', () => {
    expect(isValidGitHubLogin('octocat')).toBe(true);
    expect(isValidGitHubLogin('my-name-1')).toBe(true);
    expect(isValidGitHubLogin('-start')).toBe(false);
    expect(isValidGitHubLogin('double--hyphen')).toBe(false);
    expect(isValidGitHubLogin('with space')).toBe(false);
    expect(isValidGitHubLogin('a'.repeat(40))).toBe(false);
    expect(isValidGitHubLogin('')).toBe(false);
  });
});

describe('lookupGitHubUser', () => {
  it('maps the account and keeps the id as a string', async () => {
    const fetchImpl = respond(200, {
      id: 583231,
      login: 'octocat',
      avatar_url: 'https://example.com/a.png',
    });
    await expect(lookupGitHubUser('octocat', fetchImpl)).resolves.toEqual({
      id: '583231',
      login: 'octocat',
      avatarUrl: 'https://example.com/a.png',
      name: null,
    });
  });

  it('keeps the name of the public profile', async () => {
    const fetchImpl = respond(200, {
      id: 1,
      login: 'octocat',
      avatar_url: '',
      name: ' The Octocat ',
    });
    await expect(lookupGitHubUser('octocat', fetchImpl)).resolves.toMatchObject({
      name: 'The Octocat',
    });
    await expect(lookupGitHubNameById('1', fetchImpl)).resolves.toBe('The Octocat');
    await expect(lookupGitHubNameById('99', respond(404))).resolves.toBeNull();
    await expect(
      lookupGitHubNameById('1', respond(200, { id: 1, login: 'octocat', name: '' })),
    ).resolves.toBeNull();
  });

  it('returns null for unknown users and invalid names without calling GitHub', async () => {
    await expect(lookupGitHubUser('nobody-here', respond(404))).resolves.toBeNull();
    let called = false;
    await expect(
      lookupGitHubUser('not valid', () => {
        called = true;
        return Promise.resolve(new Response());
      }),
    ).resolves.toBeNull();
    expect(called).toBe(false);
  });

  it('explains rate limits and network errors', async () => {
    await expect(lookupGitHubUser('octocat', respond(403))).rejects.toThrow(/limite/);
    await expect(
      lookupGitHubUser('octocat', () => Promise.reject(new Error('offline'))),
    ).rejects.toThrow(/raggiungibile/);
    await expect(lookupGitHubUser('octocat', respond(200, { nope: true }))).rejects.toThrow(
      /inatteso/,
    );
  });

  it('looks accounts up by id too', async () => {
    const fetchImpl = respond(200, { id: 1, login: 'first', avatar_url: '' });
    await expect(lookupGitHubUserById('1', fetchImpl)).resolves.toMatchObject({ login: 'first' });
    await expect(lookupGitHubUserById('abc', fetchImpl)).resolves.toBeNull();
  });
});
