import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { oneOf, usePreference } from '../infra/preferences';
import { THEME_PREFERENCES } from '../themes';
import type { ThemePreference } from '../themes';
import { COLOR_PRESET_IDS, DEFAULT_COLOR_PRESET } from '../themes/presets';
import type { ColorPreset } from '../themes/presets';
import { useAppliedTheme } from '../themes/useAppliedTheme';

interface ThemeSetting {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  /** How the colors of tasks, projects and teams look over the theme. */
  colorPreset: ColorPreset;
  setColorPreset: (preset: ColorPreset) => void;
}

const ThemeContext = createContext<ThemeSetting | null>(null);

/**
 * Applies the theme and the color preset remembered by this browser to every screen: the
 * calendar and also the ones shown before it, such as the welcome screen, the sign-in and the
 * setup guide.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = usePreference('theme', oneOf(THEME_PREFERENCES), 'system');
  const [colorPreset, setColorPreset] = usePreference(
    'color-preset',
    oneOf(COLOR_PRESET_IDS),
    DEFAULT_COLOR_PRESET,
  );
  useAppliedTheme(theme, colorPreset);
  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorPreset, setColorPreset }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** The theme and color preset preferences, to show and change them in the settings. */
export function useThemeSetting(): ThemeSetting {
  const setting = useContext(ThemeContext);
  if (setting === null) throw new Error('useThemeSetting needs a ThemeProvider above it.');
  return setting;
}
