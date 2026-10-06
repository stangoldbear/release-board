import { useEffect, useEffectEvent } from 'react';
import { usePreference } from '../infra/preferences';

/**
 * Finds the full name of a GitHub account by its numeric id, which never changes, unlike the
 * username; null when the profile has none.
 */
export type NameLookup = (githubId: string) => Promise<string | null>;

/** Names already found, by GitHub id, with the time they were found. */
export type NameCache = Readonly<Record<string, { name: string | null; at: number }>>;

/** A name found is asked again after a week, in case its owner changed it. */
export const NAME_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** The names a browser saved; null when the saved value is not a list of them. */
export function readNameCache(value: unknown): NameCache | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]: [string, unknown]) => {
      if (typeof entry !== 'object' || entry === null) return false;
      const { name, at } = entry as Record<string, unknown>;
      return (name === null || typeof name === 'string') && typeof at === 'number';
    }),
  );
}

/** The accounts whose name is not known, or was found too long ago. */
export function staleIds(ids: readonly string[], cache: NameCache, now: number): string[] {
  return ids.filter((id) => {
    const entry = cache[id];
    return !entry || now - entry.at > NAME_TTL_MS;
  });
}

/**
 * The full names of the people behind some GitHub accounts, from their public profiles: a map
 * from GitHub id to name, with the names known so far. The browser keeps them for a week. When
 * GitHub cannot answer, the usernames stay as they are.
 */
export function useAuthorNames(
  ids: readonly string[],
  lookup: NameLookup | null,
): ReadonlyMap<string, string> {
  const [cache, setCache] = usePreference('author-names', readNameCache, {});
  // One key for the same accounts in any order, so that the effect runs only when they change.
  const key = [...new Set(ids)].sort().join('\n');
  const missing = useEffectEvent((wanted: string[]) => staleIds(wanted, cache, Date.now()));

  useEffect(() => {
    if (!lookup || key === '') return;
    let cancelled = false;
    for (const id of missing(key.split('\n'))) {
      lookup(id).then(
        (name) => {
          if (!cancelled) setCache((current) => ({ ...current, [id]: { name, at: Date.now() } }));
        },
        () => {
          // GitHub unreachable or its limit reached: the username is shown, and asked again later.
        },
      );
    }
    return () => {
      cancelled = true;
    };
  }, [key, lookup, setCache]);

  return new Map(
    Object.entries(cache).flatMap(([id, { name }]) => (name ? [[id, name] as const] : [])),
  );
}
