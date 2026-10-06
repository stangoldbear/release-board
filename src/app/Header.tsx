import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { CalendarRange, Milestone, NotebookPen, Search, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CompactToggle, TextSizeControls } from '../features/calendar/DisplayControls';
import { AppLogo } from '../shared/ui/AppLogo';
import { Button } from '../shared/ui/Button';
import type { TextScale } from '../shared/ui/textScale';
import { ToggleChip } from '../shared/ui/ToggleChip';
import { AREAS } from './areas';
import type { AreaId, AreaVisibility } from './areas';

interface HeaderProps {
  /** Size of the text of the notes and the calendars. */
  textScale: TextScale;
  onTextScaleChange: (scale: TextScale) => void;
  /** Compact mode of the notes and the calendars. */
  compact: boolean;
  onToggleCompact: () => void;
  /** Which areas of the page are shown. */
  areas: AreaVisibility;
  onToggleArea: (area: AreaId) => void;
  /** The text searched in every area. */
  search: string;
  onSearchChange: (search: string) => void;
  /** Enter in the search field shows the next result; with Shift, the one before. */
  onSearchKey: (backwards: boolean) => void;
  /** Under the bar while something is searched: what was found, and how to go through it. */
  searchBar?: ReactNode;
  /** What the search finds, in words, for screen readers; empty while nothing is searched. */
  searchAnnouncement: string;
  /** The synchronization indicator, in a shared instance. */
  syncIndicator?: ReactNode;
  onOpenSettings: () => void;
}

/** The search field, where the focus goes when the search is cleared. */
export const SEARCH_FIELD_ID = 'search-field';

const AREA_ICONS: Record<AreaId, LucideIcon> = {
  notes: NotebookPen,
  releases: CalendarRange,
  roadmaps: Milestone,
};

/**
 * The bar at the top: the app's name, the size of the text, the areas to show, the search, the
 * synchronization and the settings. The calendar's own controls are in its area.
 */
export function Header({
  textScale,
  onTextScaleChange,
  compact,
  onToggleCompact,
  areas,
  onToggleArea,
  search,
  onSearchChange,
  onSearchKey,
  searchBar,
  searchAnnouncement,
  syncIndicator,
  onOpenSettings,
}: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  useStickyHeight(headerRef);

  return (
    // On phones the header wraps to several lines: it scrolls away instead of covering the page.
    <header
      ref={headerRef}
      className="z-40 border-b border-line bg-surface shadow-xs sm:sticky sm:top-0"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6 2xl:gap-x-5">
        <div className="flex items-center gap-2.5">
          <AppLogo size={36} />
          <div>
            <h1 className="text-base leading-none font-extrabold">Release Board</h1>
            <p className="mt-0.5 hidden text-xs text-fg-muted 2xl:block">
              Pianificazione di rilasci e attività
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* On phones the magnifiers are in the settings, so that the page stays in view. */}
          <div className="max-sm:hidden">
            <TextSizeControls textScale={textScale} onChange={onTextScaleChange} />
          </div>
          <CompactToggle compact={compact} onToggle={onToggleCompact} />
        </div>

        <div
          role="group"
          aria-label="Aree da mostrare"
          className="flex flex-wrap items-center gap-1.5"
        >
          {AREAS.map(({ id, label }) => {
            const Icon = AREA_ICONS[id];
            return (
              <ToggleChip
                key={id}
                pressed={areas[id]}
                onClick={() => onToggleArea(id)}
                label={`Area ${label}`}
                title={areas[id] ? `Nascondi l'area ${label}` : `Mostra l'area ${label}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {label}
              </ToggleChip>
            );
          })}
        </div>

        <div className="relative min-w-48 flex-1 sm:max-w-sm">
          <Search
            className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted"
            aria-hidden="true"
          />
          <input
            id={SEARCH_FIELD_ID}
            type="search"
            aria-label="Cerca in note, attività e progetti"
            aria-keyshortcuts="Enter Shift+Enter"
            placeholder="Cerca in note, attività e progetti…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              onSearchKey(event.shiftKey);
            }}
            className="w-full rounded-lg border border-line-strong bg-surface py-1.5 pr-3 pl-9 text-xs placeholder:text-fg-muted"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {syncIndicator}
          <Button
            size="icon"
            onClick={onOpenSettings}
            aria-label="Impostazioni"
            title="Impostazioni"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      {searchBar}
      {/* Always mounted, so that the first count of a search is announced too. */}
      <p role="status" className="sr-only">
        {searchAnnouncement}
      </p>
    </header>
  );
}

/**
 * Keeps --header-height on the page equal to the height of the fixed header, so that the page
 * scrolls a focused element out from under it (scroll-padding-top in index.css).
 */
function useStickyHeight(ref: { current: HTMLElement | null }): void {
  useLayoutEffect(() => {
    const header = ref.current;
    if (!header) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() =>
      root.style.setProperty('--header-height', `${header.offsetHeight}px`),
    );
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--header-height');
    };
  }, [ref]);
}
