import { PAGE_LAYOUT_IDS } from '../../app/layout';
import type { PageLayout } from '../../app/layout';
import { BACKUP_FORMAT } from '../../domain/backup';
import { parseNotesLook } from '../../domain/notesLook';
import type { NotesLook } from '../../domain/notesLook';
import { parseTimelineNotesLook } from '../../domain/timelineNotes';
import type { TimelineNotesLook } from '../../domain/timelineNotes';
import { parseRoadmapConfig, sortByPosition } from '../../domain/roadmapConfig';
import type { RoadmapConfig } from '../../domain/types';
import { TEXT_SCALES } from '../../shared/ui/textScale';
import type { TextScale } from '../../shared/ui/textScale';
import { THEME_PREFERENCES } from '../../themes';
import type { ThemePreference } from '../../themes';
import { COLOR_PRESET_IDS } from '../../themes/presets';
import type { ColorPreset } from '../../themes/presets';
import { DATE_FORMAT_IDS, formatDateToISO } from '../../utils/dateUtils';
import type { DateFormat } from '../../utils/dateUtils';

// The settings without the data, in a file of their own: the configuration of the roadmap that
// every member shares, with the company closures, and how the app looks in this browser. A file
// is read on a best effort basis: what this version recognizes is kept, the rest is listed, so
// that a file from another version still gives what it can.

export const SETTINGS_FORMAT = 'release-board/settings';
export const SETTINGS_SCHEMA_VERSION = 1;
/** Larger files are not settings: a configuration weighs a few kilobytes. */
export const MAX_SETTINGS_BYTES = 1024 * 1024;

/** The choices of Settings → Aspetto, which this browser keeps. */
export interface AppearanceSettings {
  theme: ThemePreference;
  colorPreset: ColorPreset;
  dateFormat: DateFormat;
  layout: PageLayout;
  textScale: TextScale;
  /** The row «Note sulla timeline» (0.18). */
  timelineNotes: TimelineNotesLook;
  /** The board of Notes (0.18). */
  notesLook: NotesLook;
}

export interface SettingsFile {
  format: typeof SETTINGS_FORMAT;
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
  exportedAt: string;
  /** Absent when the published rules did not let the configuration be read. */
  roadmap?: RoadmapConfig;
  appearance: AppearanceSettings;
}

/** A settings file, or the configuration in a backup of the data. */
export type SettingsSource = 'settings' | 'backup';

export type SettingsParseResult =
  | {
      ok: true;
      source: SettingsSource;
      exportedAt: string | null;
      /** The configuration of the roadmap, when the file has one. */
      roadmap: RoadmapConfig | null;
      /** The choices of the appearance that the file has and this version knows. */
      appearance: Partial<AppearanceSettings>;
      /** What was left out, in words. */
      skipped: string[];
    }
  | { ok: false; error: string };

type Data = Record<string, unknown>;

function isData(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The file of the settings; without a configuration when it could not be read. */
export function createSettingsFile(
  roadmap: RoadmapConfig | null,
  appearance: AppearanceSettings,
  exportedAt: Date,
): SettingsFile {
  const file: SettingsFile = {
    format: SETTINGS_FORMAT,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    appearance,
  };
  if (roadmap) {
    file.roadmap = {
      ...roadmap,
      fields: sortByPosition(roadmap.fields),
      teams: sortByPosition(roadmap.teams),
      stakeholders: sortByPosition(roadmap.stakeholders),
    };
  }
  return file;
}

export function serializeSettings(file: SettingsFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function settingsFileName(date: Date, suffix?: string): string {
  return `release-board-impostazioni-${formatDateToISO(date)}${suffix ? `-${suffix}` : ''}.json`;
}

/** "3 campi", "1 campo". */
function count(amount: number, one: string, many: string): string {
  return `${amount} ${amount === 1 ? one : many}`;
}

/** The items of a list in the data that the configuration did not keep, in words. */
function dropped(data: Data, kept: RoadmapConfig): string[] {
  const length = (value: unknown) => (Array.isArray(value) ? value.length : 0);
  const lists: [number, number, string, string][] = [
    [length(data.fields), kept.fields.length, 'campo non letto', 'campi non letti'],
    [length(data.teams), kept.teams.length, 'team non letto', 'team non letti'],
    [length(data.stakeholders), kept.stakeholders.length, 'persona non letta', 'persone non lette'],
    [length(data.closures), kept.closures?.length ?? 0, 'chiusura non letta', 'chiusure non lette'],
  ];
  return lists.flatMap(([found, read, one, many]) =>
    found > read ? [count(found - read, one, many)] : [],
  );
}

/** The appearance choices this version knows, and the names of those it does not. */
function readAppearance(value: unknown): {
  appearance: Partial<AppearanceSettings>;
  skipped: string[];
} {
  const appearance: Partial<AppearanceSettings> = {};
  const skipped: string[] = [];
  if (value === undefined) return { appearance, skipped };
  if (!isData(value)) return { appearance, skipped: ['Aspetto: formato non valido'] };
  const pick = <K extends keyof AppearanceSettings>(
    key: K,
    options: readonly AppearanceSettings[K][],
    unknown: string,
  ) => {
    if (value[key] === undefined) return;
    if ((options as readonly unknown[]).includes(value[key])) {
      appearance[key] = value[key] as AppearanceSettings[K];
    } else {
      skipped.push(unknown);
    }
  };
  pick('theme', THEME_PREFERENCES, 'Tema non riconosciuto');
  pick('colorPreset', COLOR_PRESET_IDS, 'Colori non riconosciuti');
  pick('dateFormat', DATE_FORMAT_IDS, 'Formato delle date non riconosciuto');
  pick('layout', PAGE_LAYOUT_IDS, 'Layout non riconosciuto');
  pick('textScale', TEXT_SCALES, 'Dimensione del testo non riconosciuta');
  // The looks of the notes are read as a browser reads them: what is not known takes the default.
  const looks = [
    ['timelineNotes', parseTimelineNotesLook, 'Note sulla timeline: formato non valido'],
    ['notesLook', parseNotesLook, 'Aspetto di Notes: formato non valido'],
  ] as const;
  for (const [key, parse, unknown] of looks) {
    if (value[key] === undefined) continue;
    const look = parse(value[key]);
    if (look) Object.assign(appearance, { [key]: look });
    else skipped.push(unknown);
  }
  return { appearance, skipped };
}

/**
 * Reads a settings file, or the configuration of a backup of the data, as far as it can: a file
 * of a newer version or with parts that do not fit still gives the parts that do.
 */
export function parseSettingsText(text: string): SettingsParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Il file non contiene JSON valido.' };
  }
  if (!isData(value)) {
    return { ok: false, error: 'Il file non contiene impostazioni di Release Board.' };
  }
  const source: SettingsSource | null =
    value.format === SETTINGS_FORMAT
      ? 'settings'
      : value.format === BACKUP_FORMAT
        ? 'backup'
        : null;
  if (!source) return { ok: false, error: 'Il file non contiene impostazioni di Release Board.' };

  const skipped: string[] = [];
  if (
    source === 'settings' &&
    typeof value.schemaVersion === 'number' &&
    value.schemaVersion > SETTINGS_SCHEMA_VERSION
  ) {
    skipped.push('File di una versione più recente: lette solo le parti riconosciute');
  }
  let roadmap: RoadmapConfig | null = null;
  if (isData(value.roadmap)) {
    roadmap = parseRoadmapConfig(value.roadmap);
    skipped.push(...dropped(value.roadmap, roadmap));
  } else if (value.roadmap !== undefined) {
    skipped.push('Configurazione della roadmap: formato non valido');
  }
  const read = source === 'settings' ? readAppearance(value.appearance) : null;
  skipped.push(...(read?.skipped ?? []));
  const appearance = read?.appearance ?? {};
  if (!roadmap && Object.keys(appearance).length === 0) {
    return { ok: false, error: 'Il file non contiene impostazioni che questa versione riconosce.' };
  }
  return {
    ok: true,
    source,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : null,
    roadmap,
    appearance,
    skipped,
  };
}

/** "9 campi · 6 team · 16 persone · 2 chiusure · formula della contingency": what a configuration holds. */
export function roadmapSummary(config: RoadmapConfig): string {
  const parts = [
    count(config.fields.length, 'campo', 'campi'),
    count(config.teams.length, 'team', 'team'),
    count(config.stakeholders.length, 'persona', 'persone'),
    count(config.closures?.length ?? 0, 'chiusura', 'chiusure'),
  ];
  if (config.contingencyFormula) parts.push('formula della contingency');
  return parts.join(' · ');
}
