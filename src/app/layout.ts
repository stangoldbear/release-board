import { AREAS } from './areas';
import type { Area, AreaId } from './areas';

/**
 * How the areas of the page are laid out: with tabs at the bottom of the window, as the sheets of
 * a spreadsheet, or one under the other with the buttons of the header showing and hiding them.
 */
export type PageLayout = 'tabs' | 'classic';

export const PAGE_LAYOUTS: readonly { id: PageLayout; label: string; description: string }[] = [
  {
    id: 'tabs',
    label: 'Schede in basso',
    description:
      'Una barra in fondo alla finestra, come le schede di un foglio di calcolo: «All» mette le aree una sotto l’altra, le altre ne mostrano una sola.',
  },
  {
    id: 'classic',
    label: 'Pulsanti in alto',
    description:
      'I pulsanti nell’intestazione mostrano e nascondono ogni area; quelle mostrate stanno una sotto l’altra.',
  },
];

export const PAGE_LAYOUT_IDS: readonly PageLayout[] = PAGE_LAYOUTS.map((layout) => layout.id);

export const DEFAULT_PAGE_LAYOUT: PageLayout = 'tabs';

/** The tab open in the tabs layout: every area, or one of them. */
export type PageTab = 'all' | AreaId;

export const ALL_TAB: PageTab = 'all';

/** The tabs, in the order of the bar: «All» first, then the areas available. */
export function pageTabs(areas: readonly Area[]): { id: PageTab; label: string }[] {
  return [{ id: ALL_TAB, label: 'All' }, ...areas.map(({ id, label }) => ({ id, label }))];
}

/** The tab a browser saved; null when the saved value is not one. */
export function parsePageTab(value: unknown): PageTab | null {
  return value === ALL_TAB || AREAS.some((area) => area.id === value) ? (value as PageTab) : null;
}

/** Whether a tab shows an area: «All» shows them all. */
export function tabShowsArea(tab: PageTab, area: AreaId): boolean {
  return tab === ALL_TAB || tab === area;
}
