/** A GitHub account, as the public API describes it. */
export interface GitHubUser {
  /** The numeric id, as a string: it never changes, unlike the username. */
  id: string;
  login: string;
  avatarUrl: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const API = 'https://api.github.com';
const HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

/** GitHub usernames: letters, digits and single hyphens, at most 39 characters. */
export function isValidGitHubLogin(login: string): boolean {
  return /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(login);
}

async function fetchUser(path: string, fetchImpl: FetchLike): Promise<GitHubUser | null> {
  let response: Response;
  try {
    response = await fetchImpl(`${API}${path}`, { headers: HEADERS });
  } catch {
    throw new Error('GitHub non è raggiungibile: controlla la connessione e riprova.');
  }
  if (response.status === 404) return null;
  if (response.status === 403 || response.status === 429) {
    throw new Error(
      'GitHub ha rifiutato la richiesta (limite raggiunto): riprova tra qualche minuto.',
    );
  }
  if (!response.ok) throw new Error(`GitHub ha risposto con un errore (${response.status}).`);
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('id' in data) ||
    !('login' in data) ||
    typeof data.id !== 'number' ||
    typeof data.login !== 'string'
  ) {
    throw new Error('GitHub ha risposto in un formato inatteso.');
  }
  const avatarUrl =
    'avatar_url' in data && typeof data.avatar_url === 'string' ? data.avatar_url : '';
  return { id: String(data.id), login: data.login, avatarUrl };
}

/** The account with this username, or null when there is none. Public API, no token needed. */
export function lookupGitHubUser(
  login: string,
  fetchImpl: FetchLike = fetch,
): Promise<GitHubUser | null> {
  if (!isValidGitHubLogin(login)) return Promise.resolve(null);
  return fetchUser(`/users/${encodeURIComponent(login)}`, fetchImpl);
}

/** The account with this numeric id, or null when there is none. */
export function lookupGitHubUserById(
  id: string,
  fetchImpl: FetchLike = fetch,
): Promise<GitHubUser | null> {
  if (!/^\d{1,20}$/.test(id)) return Promise.resolve(null);
  return fetchUser(`/user/${id}`, fetchImpl);
}
