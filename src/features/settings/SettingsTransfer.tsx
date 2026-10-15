import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Download, TriangleAlert, Upload } from 'lucide-react';
import { PAGE_LAYOUTS } from '../../app/layout';
import { NOTES_LAYOUTS, NOTE_SHAPES } from '../../domain/notesLook';
import type { Assignment, RoadmapConfig } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { useToast } from '../../shared/ui/Toast';
import { getTheme } from '../../themes';
import { COLOR_PRESETS } from '../../themes/presets';
import { DATE_FORMATS, formatDateTimeIT } from '../../utils/dateUtils';
import { downloadTextFile } from '../../utils/download';
import {
  MAX_SETTINGS_BYTES,
  createSettingsFile,
  parseSettingsText,
  roadmapSummary,
  serializeSettings,
  settingsFileName,
} from './settingsFile';
import type { AppearanceSettings, SettingsParseResult, SettingsSource } from './settingsFile';

type ReadSettings = Extract<SettingsParseResult, { ok: true }>;

type ImportState =
  | { step: 'idle' }
  | { step: 'invalid'; fileName: string; error: string }
  | {
      step: 'confirm';
      fileName: string;
      settings: ReadSettings;
      useRoadmap: boolean;
      useAppearance: boolean;
    };

const SOURCE_LABELS: Record<SettingsSource, string> = {
  settings: 'Impostazioni di Release Board',
  backup: 'Backup dei dati: solo la configurazione della roadmap',
};

/** "Tema Scuro moderno · Date 13/10/2026 · Pulsanti in alto · Testo 115%". */
function appearanceSummary(appearance: Partial<AppearanceSettings>): string {
  const parts: string[] = [];
  if (appearance.theme) {
    parts.push(
      `Tema ${appearance.theme === 'system' ? 'come il sistema' : getTheme(appearance.theme).name}`,
    );
  }
  if (appearance.colorPreset) {
    const preset = COLOR_PRESETS.find((item) => item.id === appearance.colorPreset);
    parts.push(`Colori ${preset?.name ?? appearance.colorPreset}`);
  }
  if (appearance.dateFormat) {
    const format = DATE_FORMATS.find((item) => item.id === appearance.dateFormat);
    parts.push(`Date ${format?.label ?? appearance.dateFormat}`);
  }
  if (appearance.layout) {
    parts.push(PAGE_LAYOUTS.find((item) => item.id === appearance.layout)?.label ?? '');
  }
  if (appearance.textScale) parts.push(`Testo ${Math.round(appearance.textScale * 100)}%`);
  if (appearance.timelineNotes) {
    parts.push(
      `Note sulla timeline ${appearance.timelineNotes.layout === 'lanes' ? 'su una linea per tipo' : 'su una linea'}`,
    );
  }
  if (appearance.notesLook) {
    const shape = NOTE_SHAPES.find((item) => item.id === appearance.notesLook?.shape);
    const layout = NOTES_LAYOUTS.find((item) => item.id === appearance.notesLook?.layout);
    parts.push(`Notes ${shape?.label ?? ''} in ${layout?.label.toLowerCase() ?? ''}`);
  }
  return parts.filter(Boolean).join(' · ');
}

interface SettingsTransferProps {
  roadmap: RoadmapConfig;
  /** The published rules do not know the configuration of the roadmap yet: it is left out. */
  roadmapUnavailable: boolean;
  /** Replaces the configuration of the roadmap, for every member. */
  onReplaceRoadmap: (config: RoadmapConfig) => void;
  /** The work on the projects, to tell what would be left without its person. */
  assignments: readonly Assignment[];
  appearance: AppearanceSettings;
  /** Applies the choices of the appearance that an import has, in this browser. */
  onChangeAppearance: (appearance: Partial<AppearanceSettings>) => void;
}

/**
 * The settings without the data, to a file and back: the configuration of the roadmap with the
 * company closures, and the appearance of this browser. An import shows what the file holds and
 * what it leaves out, lets the user pick the parts, and first saves the current settings.
 */
export function SettingsTransfer({
  roadmap,
  roadmapUnavailable,
  onReplaceRoadmap,
  assignments,
  appearance,
  onChangeAppearance,
}: SettingsTransferProps) {
  const showToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>({ step: 'idle' });

  const download = (suffix?: string) => {
    const now = new Date();
    const file = createSettingsFile(roadmapUnavailable ? null : roadmap, appearance, now);
    downloadTextFile(settingsFileName(now, suffix), serializeSettings(file), 'application/json');
  };

  const handleFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_SETTINGS_BYTES) {
      setImportState({
        step: 'invalid',
        fileName: file.name,
        error: 'Il file è troppo grande per contenere impostazioni.',
      });
      return;
    }
    const result = parseSettingsText(await file.text());
    if (!result.ok) {
      setImportState({ step: 'invalid', fileName: file.name, error: result.error });
      return;
    }
    setImportState({
      step: 'confirm',
      fileName: file.name,
      settings: result,
      useRoadmap: result.roadmap !== null && !roadmapUnavailable,
      useAppearance: Object.keys(result.appearance).length > 0,
    });
  };

  const apply = (state: Extract<ImportState, { step: 'confirm' }>) => {
    download('prima-dell-importazione');
    if (state.useRoadmap && state.settings.roadmap) onReplaceRoadmap(state.settings.roadmap);
    if (state.useAppearance) onChangeAppearance(state.settings.appearance);
    showToast('Impostazioni importate');
    setImportState({ step: 'idle' });
  };

  const confirm = importState.step === 'confirm' ? importState : null;
  const imported = confirm?.settings.roadmap ?? null;
  const people = new Set(imported?.stakeholders.map((item) => item.id));
  const orphaned = imported
    ? assignments.filter((item) => !people.has(item.stakeholderId)).length
    : 0;

  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-muted">
        Le impostazioni senza i dati: campi, team e persone dei progetti, colori, formule e chiusure
        aziendali, che valgono per tutti, e l&apos;aspetto di questo browser (tema, formato delle
        date, layout, dimensione del testo, note sulla timeline e Notes).
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => download()}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Esporta le impostazioni
        </Button>
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Importa le impostazioni…
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="File delle impostazioni"
          onChange={(event) => void handleFileChosen(event)}
        />
      </div>

      {importState.step === 'invalid' && (
        <div role="alert" className="rounded-lg border border-danger bg-danger-soft p-3 text-xs">
          <p className="font-semibold">{importState.fileName} non può essere importato:</p>
          <p className="mt-1">{importState.error}</p>
        </div>
      )}

      {confirm && (
        <div className="space-y-3 rounded-lg border border-warning bg-warning-soft p-3 text-xs">
          <div>
            <p className="font-semibold">{confirm.fileName}</p>
            <p>
              {SOURCE_LABELS[confirm.settings.source]}
              {confirm.settings.exportedAt &&
                ` del ${formatDateTimeIT(confirm.settings.exportedAt)}`}
            </p>
          </div>
          <fieldset className="space-y-2">
            <legend className="sr-only">Parti da importare</legend>
            {imported && (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirm.useRoadmap}
                  disabled={roadmapUnavailable}
                  onChange={(event) =>
                    setImportState({ ...confirm, useRoadmap: event.target.checked })
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-semibold">
                    Configurazione della roadmap, per tutti i membri
                  </span>
                  <span className="block">{roadmapSummary(imported)}</span>
                  <span className="block text-fg-muted">
                    {roadmapUnavailable
                      ? 'Non disponibile finché non vengono pubblicate le regole di sicurezza aggiornate.'
                      : 'Sostituisce campi, team, persone, colori dei progetti, formule e chiusure aziendali.'}
                  </span>
                </span>
              </label>
            )}
            {Object.keys(confirm.settings.appearance).length > 0 && (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirm.useAppearance}
                  onChange={(event) =>
                    setImportState({ ...confirm, useAppearance: event.target.checked })
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-semibold">Aspetto di questo browser</span>
                  <span className="block">{appearanceSummary(confirm.settings.appearance)}</span>
                </span>
              </label>
            )}
          </fieldset>
          {confirm.settings.skipped.length > 0 && (
            <div>
              <p className="font-semibold">Non importato:</p>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
                {confirm.settings.skipped.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              Prima viene scaricata una copia delle impostazioni attuali.
              {confirm.useRoadmap &&
                orphaned > 0 &&
                (orphaned === 1
                  ? ' 1 assegnazione è di una persona che non è nel file: resta nei progetti come «Persona non in configurazione».'
                  : ` ${orphaned} assegnazioni sono di persone che non sono nel file: restano nei progetti come «Persona non in configurazione».`)}
            </span>
          </p>
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setImportState({ step: 'idle' })}>
              Annulla
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!confirm.useRoadmap && !confirm.useAppearance}
              onClick={() => apply(confirm)}
            >
              Applica le impostazioni
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
