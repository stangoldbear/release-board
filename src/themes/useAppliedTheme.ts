import { useLayoutEffect, useSyncExternalStore } from 'react';
import { applyTheme, resolveTheme } from './index';
import type { ThemePreference } from './index';
import type { ColorPreset } from './presets';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function systemIsDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

/** Whether the device asks for a dark theme, kept up to date. */
export function useSystemIsDark(): boolean {
  return useSyncExternalStore(subscribeToSystemTheme, systemIsDark);
}

/**
 * Applies the preferred theme to the page, following the system setting when asked to, with the
 * colors of the tasks, projects and teams in the preset.
 */
export function useAppliedTheme(preference: ThemePreference, preset: ColorPreset): void {
  const dark = useSystemIsDark();
  // A layout effect, so that the first paint already has the theme's colors.
  useLayoutEffect(() => {
    applyTheme(resolveTheme(preference, dark), document.documentElement, preset);
  }, [preference, dark, preset]);
}
