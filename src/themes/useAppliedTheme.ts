import { useLayoutEffect, useSyncExternalStore } from 'react';
import { applyTheme, resolveTheme } from './index';
import type { ThemePreference } from './index';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function systemIsDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

/** Applies the preferred theme to the page, following the system setting when asked to. */
export function useAppliedTheme(preference: ThemePreference): void {
  const dark = useSyncExternalStore(subscribeToSystemTheme, systemIsDark);
  // A layout effect, so that the first paint already has the theme's colors.
  useLayoutEffect(() => {
    applyTheme(resolveTheme(preference, dark), document.documentElement);
  }, [preference, dark]);
}
