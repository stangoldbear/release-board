import { useId, useState } from 'react';
import { ChevronDown, Monitor, Palette } from 'lucide-react';
import { CUSTOM_THEME_IDS, SYSTEM_THEMES, getTheme, isDarkTheme } from '../../themes';
import type { CustomThemeId, Theme, ThemePreference } from '../../themes';
import { TextSizeControls } from '../calendar/DisplayControls';
import type { TextScale } from '../../shared/ui/textScale';

interface AppearanceSectionProps {
  theme: ThemePreference;
  onChangeTheme: (theme: ThemePreference) => void;
  /** The size of the text of notes and calendars: on phones the header has no room for it. */
  textScale: TextScale;
  onTextScaleChange: (scale: TextScale) => void;
}

/** A miniature of the page in the theme's own colors, whatever the current theme is. */
function ThemeSwatch({ theme, small = false }: { theme: Theme; small?: boolean }) {
  const { colors } = theme;
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 flex-col justify-center gap-1 rounded-md border p-1.5 ${
        small ? 'h-8 w-11' : 'h-9 w-14'
      }`}
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

const OPTION =
  'flex cursor-pointer items-center gap-3 rounded-lg border border-line p-2 text-sm hover:bg-surface-strong has-checked:border-accent has-checked:bg-accent-soft';

const SYSTEM_DESCRIPTION = `${getTheme(SYSTEM_THEMES.light).name} o ${getTheme(SYSTEM_THEMES.dark).name}, come il dispositivo`;

const CUSTOM_GROUPS: { title: string; ids: CustomThemeId[] }[] = [
  { title: 'Chiari', ids: CUSTOM_THEME_IDS.filter((id) => !isDarkTheme(id)) },
  { title: 'Scuri', ids: CUSTOM_THEME_IDS.filter((id) => isDarkTheme(id)) },
];

function isCustom(theme: ThemePreference): theme is CustomThemeId {
  return (CUSTOM_THEME_IDS as readonly string[]).includes(theme);
}

/**
 * The theme: the system's, the app's light and dark ones, and as the last line a list of custom
 * themes that opens only when asked, so that it does not crowd the settings.
 */
export function AppearanceSection({
  theme,
  onChangeTheme,
  textScale,
  onTextScaleChange,
}: AppearanceSectionProps) {
  const systemDescriptionId = useId();
  // Open from the start when a custom theme is in use, so that its choice is in view.
  const [customOpen, setCustomOpen] = useState(() => isCustom(theme));

  const radio = (option: ThemePreference, name: string, describedBy?: string) => (
    <input
      type="radio"
      name="theme"
      value={option}
      checked={theme === option}
      onChange={() => onChangeTheme(option)}
      // The label may also hold a description, which belongs in the description only.
      aria-label={name}
      aria-describedby={describedBy}
    />
  );

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
          <label className={OPTION}>
            {radio('system', 'Segui il sistema', systemDescriptionId)}
            <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-line-strong">
              <Monitor className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold">Segui il sistema</span>
              <span id={systemDescriptionId} className="block text-xs text-fg-muted">
                {SYSTEM_DESCRIPTION}
              </span>
            </span>
          </label>
          {(['light-modern', 'dark-modern'] as const).map((option) => (
            <label key={option} className={OPTION}>
              {radio(option, getTheme(option).name)}
              <ThemeSwatch theme={getTheme(option)} />
              <span className="font-semibold">{getTheme(option).name}</span>
            </label>
          ))}

          <details
            open={customOpen}
            onToggle={(event) => setCustomOpen(event.currentTarget.open)}
            className="group rounded-lg border border-line"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg p-2 text-sm hover:bg-surface-strong [&::-webkit-details-marker]:hidden">
              <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-line-strong">
                <Palette className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Temi personalizzati</span>
                <span className="block text-xs text-fg-muted">
                  {CUSTOM_THEME_IDS.length} temi ispirati ai temi più usati di Visual Studio Code
                  {isCustom(theme) && ` · in uso: ${getTheme(theme).name}`}
                </span>
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            {/* Their colors are worked out only once the list is open. */}
            {customOpen && (
              <div className="space-y-3 border-t border-line p-2">
                {CUSTOM_GROUPS.map(({ title, ids }) => (
                  <div key={title}>
                    <p className="mb-1.5 text-xs font-semibold text-fg-muted">
                      {title} · {ids.length}
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {ids.map((id) => (
                        <label key={id} className={OPTION}>
                          {radio(id, getTheme(id).name)}
                          <ThemeSwatch theme={getTheme(id)} small />
                          <span className="min-w-0 leading-tight font-semibold">
                            {getTheme(id).name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </details>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-2 sm:hidden">
        <p className="text-xs text-fg-muted">Testo di note e calendari</p>
        <TextSizeControls textScale={textScale} onChange={onTextScaleChange} />
      </div>
    </section>
  );
}
