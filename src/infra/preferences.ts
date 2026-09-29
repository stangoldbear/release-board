import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

// Preferences are conveniences: losing one is harmless, so storage errors are ignored and a saved
// value that its parser rejects falls back to the default.

const PREFIX = 'release-board:';

export function readPreference<T>(key: string, parse: (value: unknown) => T | null): T | null {
  try {
    const stored = localStorage.getItem(PREFIX + key);
    return stored === null ? null : parse(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // The preference lasts for this session only.
  }
}

/** State remembered by this browser, such as the theme or the hidden rows. */
export function usePreference<T>(
  key: string,
  parse: (value: unknown) => T | null,
  fallback: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(() => readPreference(key, parse) ?? fallback);
  useEffect(() => writePreference(key, value), [key, value]);
  return [value, setValue];
}

export function isBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

/** Parser for a preference that is one of a few strings. */
export function oneOf<T extends string>(options: readonly T[]): (value: unknown) => T | null {
  return (value) =>
    typeof value === 'string' && (options as readonly string[]).includes(value)
      ? (value as T)
      : null;
}
