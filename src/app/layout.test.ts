import { describe, expect, it } from 'vitest';
import { AREAS } from './areas';
import {
  ALL_TAB,
  DEFAULT_PAGE_LAYOUT,
  PAGE_LAYOUT_IDS,
  pageTabs,
  parsePageTab,
  tabShowsArea,
} from './layout';

describe('the layout of the page', () => {
  it('offers the tabs at the bottom by default, and the buttons of the header', () => {
    expect(DEFAULT_PAGE_LAYOUT).toBe('tabs');
    expect(PAGE_LAYOUT_IDS).toEqual(['tabs', 'classic']);
  });

  it('lists «All» first, then the areas', () => {
    expect(pageTabs(AREAS).map(({ id }) => id)).toEqual([
      'all',
      'notes',
      'releases',
      'roadmaps',
      'people',
      'contacts',
    ]);
    expect(pageTabs(AREAS).map(({ label }) => label)).toEqual([
      'All',
      'Notes',
      'Next Releases',
      'Roadmap',
      'Persone',
      'Contatti',
    ]);
  });

  it('reads the tab a browser saved and refuses anything else', () => {
    expect(parsePageTab('all')).toBe(ALL_TAB);
    expect(parsePageTab('roadmaps')).toBe('roadmaps');
    expect(parsePageTab('history')).toBeNull();
    expect(parsePageTab(1)).toBeNull();
  });

  it('shows every area in «All» and one area in the other tabs', () => {
    expect(tabShowsArea('all', 'notes')).toBe(true);
    expect(tabShowsArea('releases', 'releases')).toBe(true);
    expect(tabShowsArea('releases', 'roadmaps')).toBe(false);
    // The contacts have their own tab only.
    expect(tabShowsArea('all', 'contacts')).toBe(false);
    expect(tabShowsArea('contacts', 'contacts')).toBe(true);
  });
});
