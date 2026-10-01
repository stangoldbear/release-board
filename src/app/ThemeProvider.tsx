import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { oneOf, usePreference } from '../infra/preferences';
import { THEME_PREFERENCES } from '../themes';
import type { ThemePreference } from '../themes';
import { useAppliedTheme } from '../themes/useAppliedTheme';

interface ThemeSetting {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeSetting | null>(null);

/**
 * Applies the theme remembered by this browser to every screen: the calendar and also the ones
 * shown before it, such as the welcome screen, the sign-in and the setup guide.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = usePreference('theme', oneOf(THEME_PREFERENCES), 'system');
  useAppliedTheme(theme);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

/** The theme preference, to show and change it in the settings. */
export function useThemeSetting(): ThemeSetting {
  const setting = useContext(ThemeContext);
  if (setting === null) throw new Error('useThemeSetting needs a ThemeProvider above it.');
  return setting;
}
