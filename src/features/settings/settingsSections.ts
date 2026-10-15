// The settings by topic: a few categories, each with its sections, shown one section at a time
// ("Impostazioni › Aspetto › Tema"). Which sections there are depends on the instance and the role.

export type SettingsCategoryId =
  'appearance' | 'releases' | 'roadmap' | 'people' | 'data' | 'about';

/** Every section, in the order of the list. */
const SECTION_IDS = [
  'theme',
  'colors',
  'layout',
  'text',
  'timeline-notes',
  'notes',
  'lanes',
  'roadmap-config',
  'labels',
  'project-colors',
  'closures',
  'account',
  'members',
  'email-domains',
  'backup',
  'settings-file',
  'history',
  'instance',
  'about',
  'beta',
] as const;

export type SettingsSectionId = (typeof SECTION_IDS)[number];

/** Where a choice applies: in this browser only, or for every member of the plan. */
export type SettingsScope = 'browser' | 'plan';

export const SETTINGS_SCOPE_LABELS: Record<SettingsScope, string> = {
  browser: 'In questo browser',
  plan: 'Per tutti i membri',
};

export interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  scope?: SettingsScope;
}

export interface SettingsCategory {
  id: SettingsCategoryId;
  label: string;
  sections: SettingsSection[];
}

/** What decides the sections shown. */
export interface SettingsContext {
  /** A shared instance, rather than the data of this browser. */
  cloud: boolean;
  /** The signed-in member owns the plan: members and email domains are theirs. */
  owner: boolean;
  /** Something is in beta, so the switch of the beta features is offered. */
  beta: boolean;
}

/** The categories and their sections, in the order of the list; a category without sections is left out. */
export function settingsCategories({ cloud, owner, beta }: SettingsContext): SettingsCategory[] {
  const categories: SettingsCategory[] = [
    {
      id: 'appearance',
      label: 'Aspetto',
      sections: [
        { id: 'theme', label: 'Tema', scope: 'browser' },
        { id: 'colors', label: 'Colori', scope: 'browser' },
        { id: 'layout', label: 'Layout e date', scope: 'browser' },
        { id: 'text', label: 'Testo e densità', scope: 'browser' },
        { id: 'timeline-notes', label: 'Note sulla timeline', scope: 'browser' },
        { id: 'notes', label: 'Notes', scope: 'browser' },
      ],
    },
    {
      id: 'releases',
      label: 'Next Releases',
      sections: [{ id: 'lanes', label: 'Corsie', scope: 'plan' }],
    },
    {
      id: 'roadmap',
      label: 'Roadmap',
      sections: [
        { id: 'roadmap-config', label: 'Campi, team e persone', scope: 'plan' },
        { id: 'labels', label: 'Etichette', scope: 'plan' },
        { id: 'project-colors', label: 'Colori dei progetti', scope: 'plan' },
        { id: 'closures', label: 'Chiusure aziendali', scope: 'plan' },
      ],
    },
    {
      id: 'people',
      label: 'Account e membri',
      sections: cloud
        ? [
            { id: 'account', label: 'Account' },
            ...(owner
              ? ([
                  { id: 'members', label: 'Membri', scope: 'plan' },
                  { id: 'email-domains', label: 'Domini email ammessi', scope: 'plan' },
                ] satisfies SettingsSection[])
              : []),
          ]
        : [],
    },
    {
      id: 'data',
      label: 'Dati',
      sections: [
        { id: 'backup', label: 'Backup' },
        { id: 'settings-file', label: 'File delle impostazioni' },
        cloud
          ? { id: 'history', label: 'Cronologia' }
          : { id: 'instance', label: 'Istanza condivisa' },
      ],
    },
    {
      id: 'about',
      label: 'Informazioni',
      sections: [
        { id: 'about', label: 'Versione e dati' },
        ...(beta ? [{ id: 'beta', label: 'Funzioni beta', scope: 'browser' } as const] : []),
      ],
    },
  ];
  return categories.filter((category) => category.sections.length > 0);
}

/** A section with its category; null when the instance does not have it. */
export function findSection(
  categories: readonly SettingsCategory[],
  id: SettingsSectionId,
): { category: SettingsCategory; section: SettingsSection } | null {
  for (const category of categories) {
    const section = category.sections.find((item) => item.id === id);
    if (section) return { category, section };
  }
  return null;
}

/** The section to show: the one asked for when the instance has it, or else the first. */
export function shownSection(
  categories: readonly SettingsCategory[],
  wanted: SettingsSectionId | null,
): SettingsSectionId {
  if (wanted && findSection(categories, wanted)) return wanted;
  return categories[0]?.sections[0]?.id ?? 'theme';
}

/** A section a browser saved; null when the saved value is not one. */
export function parseSettingsSection(value: unknown): SettingsSectionId | null {
  return (SECTION_IDS as readonly unknown[]).includes(value) ? (value as SettingsSectionId) : null;
}
