import { describe, expect, it } from 'vitest';
import {
  findSection,
  parseSettingsSection,
  settingsCategories,
  shownSection,
} from './settingsSections';

const ids = (cloud: boolean, owner: boolean, beta = false) =>
  settingsCategories({ cloud, owner, beta }).map((category) => [
    category.id,
    category.sections.map((section) => section.id),
  ]);

describe('settingsCategories', () => {
  it('gives an owner of a shared instance every section but the beta switch', () => {
    expect(ids(true, true)).toEqual([
      ['appearance', ['theme', 'colors', 'layout', 'text', 'timeline-notes', 'notes']],
      ['releases', ['lanes']],
      ['roadmap', ['roadmap-config', 'project-colors', 'closures']],
      ['people', ['account', 'members', 'email-domains']],
      ['data', ['backup', 'settings-file', 'history']],
      ['about', ['about']],
    ]);
  });

  it('keeps members and email domains to the owner', () => {
    expect(ids(true, false)).toContainEqual(['people', ['account']]);
  });

  it('leaves out the account in the local mode, and offers the shared instance instead of the history', () => {
    const local = ids(false, false);
    expect(local.map(([id]) => id)).not.toContain('people');
    expect(local).toContainEqual(['data', ['backup', 'settings-file', 'instance']]);
  });

  it('offers the beta features only while something is in beta', () => {
    expect(ids(false, false, true)).toContainEqual(['about', ['about', 'beta']]);
  });

  it('says where each choice applies', () => {
    const categories = settingsCategories({ cloud: true, owner: true, beta: false });
    expect(findSection(categories, 'theme')?.section.scope).toBe('browser');
    expect(findSection(categories, 'closures')?.section.scope).toBe('plan');
    expect(findSection(categories, 'account')?.section.scope).toBeUndefined();
  });
});

describe('shownSection', () => {
  const local = settingsCategories({ cloud: false, owner: false, beta: false });

  it('shows the section asked for, when the instance has it', () => {
    expect(shownSection(local, 'closures')).toBe('closures');
    expect(findSection(local, 'closures')?.category.label).toBe('Roadmap');
  });

  it('falls back to the first section otherwise', () => {
    expect(shownSection(local, 'members')).toBe('theme');
    expect(shownSection(local, null)).toBe('theme');
  });
});

describe('parseSettingsSection', () => {
  it('reads only the sections that exist', () => {
    expect(parseSettingsSection('backup')).toBe('backup');
    expect(parseSettingsSection('tema')).toBeNull();
    expect(parseSettingsSection(3)).toBeNull();
  });
});
