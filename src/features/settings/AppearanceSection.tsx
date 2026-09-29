import { useId } from 'react';
import { Monitor } from 'lucide-react';
import { SYSTEM_THEMES, THEMES, THEME_PREFERENCES } from '../../themes';
import type { Theme, ThemePreference } from '../../themes';

interface AppearanceSectionProps {
  theme: ThemePreference;
  onChangeTheme: (theme: ThemePreference) => void;
}

/** A miniature of the page in the theme's own colors, whatever the current theme is. */
function ThemeSwatch({ theme }: { theme: Theme }) {
  const { colors } = theme;
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-14 shrink-0 flex-col justify-center gap-1 rounded-md border p-1.5"
      style={{ backgroundColor: colors.canvas, borderColor: colors['line-strong'] }}
    >
      <span className="h-1.5 w-full rounded-sm" style={{ backgroundColor: colors.fg }} />
      <span className="flex gap-1">
        <span className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: colors.accent }} />
        <span className="h-2.5 w-3 rounded-sm" style={{ backgroundColor: colors.surface }} />
      </span>
    </span>
  );
}

const SYSTEM_DESCRIPTION = `${THEMES[SYSTEM_THEMES.light].name} o ${THEMES[SYSTEM_THEMES.dark].name}, come il dispositivo`;

export function AppearanceSection({ theme, onChangeTheme }: AppearanceSectionProps) {
  const systemDescriptionId = useId();
  return (
    <section aria-labelledby="settings-appearance" className="space-y-3">
      <h3 id="settings-appearance" className="text-sm font-bold">
        Aspetto
      </h3>
      <fieldset>
        <legend className="mb-2 text-xs text-fg-muted">
          Tema: la scelta si applica subito ed è ricordata da questo browser.
        </legend>
        <div className="grid gap-2">
          {THEME_PREFERENCES.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-2 text-sm hover:bg-surface-strong has-checked:border-accent has-checked:bg-accent-soft"
            >
              <input
                type="radio"
                name="theme"
                value={option}
                checked={theme === option}
                onChange={() => onChangeTheme(option)}
                // The label also holds the description, which belongs in the description only.
                aria-label={option === 'system' ? 'Segui il sistema' : THEMES[option].name}
                aria-describedby={option === 'system' ? systemDescriptionId : undefined}
              />
              {option === 'system' ? (
                <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-line-strong">
                  <Monitor className="h-5 w-5" aria-hidden="true" />
                </span>
              ) : (
                <ThemeSwatch theme={THEMES[option]} />
              )}
              <span>
                <span className="block font-semibold">
                  {option === 'system' ? 'Segui il sistema' : THEMES[option].name}
                </span>
                {option === 'system' && (
                  <span id={systemDescriptionId} className="block text-xs text-fg-muted">
                    {SYSTEM_DESCRIPTION}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
