import { describe, expect, it } from 'vitest';
import { createBackupFile } from '../../domain/backup';
import { createEmptyPlan } from '../../domain/plan';
import { DEFAULT_NOTES_LOOK } from '../../domain/notesLook';
import { defaultRoadmapConfig } from '../../domain/roadmapConfig';
import { DEFAULT_TIMELINE_NOTES_LOOK } from '../../domain/timelineNotes';
import {
  SETTINGS_FORMAT,
  createSettingsFile,
  parseSettingsText,
  roadmapSummary,
  serializeSettings,
  settingsFileName,
} from './settingsFile';
import type { AppearanceSettings } from './settingsFile';

const roadmap = {
  ...defaultRoadmapConfig(),
  closures: [{ start: '2026-08-10', end: '2026-08-21', reason: 'Chiusura estiva' }],
};
const appearance: AppearanceSettings = {
  theme: 'dark-modern',
  colorPreset: 'smooth',
  dateFormat: 'dd/mm/yyyy',
  layout: 'classic',
  textScale: 1.15,
  timelineNotes: { ...DEFAULT_TIMELINE_NOTES_LOOK, layout: 'lanes' },
  notesLook: { ...DEFAULT_NOTES_LOOK, shape: 'card', board: 'dots' },
};
const file = createSettingsFile(roadmap, appearance, new Date('2026-10-13T10:00:00Z'));

describe('the settings file', () => {
  it('reads back what it wrote: the configuration of the roadmap and the appearance', () => {
    const result = parseSettingsText(serializeSettings(file));
    expect(result).toEqual({
      ok: true,
      source: 'settings',
      exportedAt: '2026-10-13T10:00:00.000Z',
      roadmap,
      appearance,
      skipped: [],
    });
    expect(settingsFileName(new Date('2026-10-13T10:00:00Z'))).toBe(
      'release-board-impostazioni-2026-10-13.json',
    );
  });

  it('keeps what it recognizes and lists the rest', () => {
    const changed = {
      ...file,
      schemaVersion: 3,
      roadmap: {
        ...roadmap,
        teams: [...roadmap.teams, { id: 'ux', name: 'UX' }],
        closures: [...roadmap.closures, { start: 'domani', end: 'dopodomani' }],
        widgets: ['x'],
      },
      appearance: {
        ...appearance,
        theme: 'neon',
        colorPreset: 'rainbow',
        textScale: 3,
        sound: 'on',
      },
    };
    const result = parseSettingsText(JSON.stringify(changed));
    expect(result.ok && result.roadmap?.teams).toHaveLength(roadmap.teams.length);
    expect(result.ok && result.roadmap?.closures).toEqual(roadmap.closures);
    expect(result.ok && result.appearance).toEqual({
      dateFormat: 'dd/mm/yyyy',
      layout: 'classic',
      timelineNotes: appearance.timelineNotes,
      notesLook: appearance.notesLook,
    });
    expect(result.ok && result.skipped).toEqual([
      'File di una versione più recente: lette solo le parti riconosciute',
      '1 team non letto',
      '1 chiusura non letta',
      'Tema non riconosciuto',
      'Colori non riconosciuti',
      'Dimensione del testo non riconosciuta',
    ]);
  });

  it('leaves out a configuration that could not be read', () => {
    const appearanceOnly = createSettingsFile(null, appearance, new Date('2026-10-13T10:00:00Z'));
    expect(appearanceOnly.roadmap).toBeUndefined();
    expect(parseSettingsText(serializeSettings(appearanceOnly))).toMatchObject({
      ok: true,
      roadmap: null,
      appearance,
    });
  });

  it('takes the configuration out of a backup of the data, without an appearance', () => {
    const backup = createBackupFile(
      { ...createEmptyPlan(), roadmap },
      new Date('2026-10-13T10:00:00Z'),
    );
    const result = parseSettingsText(JSON.stringify(backup));
    expect(result).toMatchObject({ ok: true, source: 'backup', roadmap, appearance: {} });
  });

  it('refuses what is not settings, or holds nothing this version knows', () => {
    expect(parseSettingsText('{')).toEqual({
      ok: false,
      error: 'Il file non contiene JSON valido.',
    });
    expect(parseSettingsText('{"format":"other"}').ok).toBe(false);
    expect(parseSettingsText('[]').ok).toBe(false);
    expect(
      parseSettingsText(JSON.stringify({ format: SETTINGS_FORMAT, appearance: { theme: 'neon' } })),
    ).toEqual({
      ok: false,
      error: 'Il file non contiene impostazioni che questa versione riconosce.',
    });
  });

  it('reads the looks of the notes as a browser does, and lists one it cannot read', () => {
    const result = parseSettingsText(
      JSON.stringify({
        format: SETTINGS_FORMAT,
        appearance: { timelineNotes: { layout: 'lanes', kinds: 'all' }, notesLook: 'post-it' },
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      appearance: { timelineNotes: { ...DEFAULT_TIMELINE_NOTES_LOOK, layout: 'lanes' } },
      skipped: ['Aspetto di Notes: formato non valido'],
    });
  });

  it('says what a configuration holds', () => {
    expect(roadmapSummary(roadmap)).toBe(
      `${roadmap.fields.length} campi · 6 team · 16 persone · 1 chiusura · formula della contingency`,
    );
  });
});
