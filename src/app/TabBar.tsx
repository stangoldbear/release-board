import { useRef } from 'react';
import { useRootHeightVar } from '../shared/useRootHeightVar';
import { VersionStamp } from '../shared/ui/VersionStamp';
import { AREA_ICONS } from './areaIcons';
import type { Area } from './areas';
import { pageTabs } from './layout';
import type { PageTab } from './layout';

/** The variable with the height of the bar, so that the page keeps its content clear of it. */
export const TAB_BAR_HEIGHT_VAR = '--tab-bar-height';

interface TabBarProps {
  /** The areas this browser can show, in the order of the tabs. */
  areas: readonly Area[];
  tab: PageTab;
  onSelect: (tab: PageTab) => void;
}

/**
 * The tabs at the bottom of the window, as the sheets of a spreadsheet: «All» shows every area
 * one under the other, the other tabs one area alone. Version and commit stay in view at its
 * right; on phones they stay at the bottom of the page.
 */
export function TabBar({ areas, tab, onSelect }: TabBarProps) {
  const ref = useRef<HTMLElement>(null);
  useRootHeightVar(ref, TAB_BAR_HEIGHT_VAR);
  return (
    <nav
      ref={ref}
      aria-label="Aree della pagina"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch">
        {pageTabs(areas).map(({ id, label }) => {
          const Icon = AREA_ICONS[id];
          const selected = id === tab;
          return (
            <button
              key={id}
              type="button"
              aria-current={selected ? 'page' : undefined}
              onClick={() => onSelect(id)}
              className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 border-t-2 px-1 py-1.5 text-center text-xs leading-tight transition-colors sm:flex-initial sm:flex-row sm:gap-1.5 sm:border-r sm:border-r-line sm:px-4 sm:py-2 ${
                selected
                  ? 'border-t-accent bg-canvas font-semibold text-fg'
                  : 'border-t-transparent text-fg-muted hover:bg-surface-strong hover:text-fg'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </button>
          );
        })}
        <VersionStamp className="ml-auto hidden self-center px-4 sm:block" />
      </div>
    </nav>
  );
}
