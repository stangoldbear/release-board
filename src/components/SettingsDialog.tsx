import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { TriangleAlert, Download, Upload, X } from 'lucide-react';
import type { PlanSnapshot } from '../types';
import { BUILD_INFO, SOURCE_REPOSITORY_URL } from '../buildInfo';
import {
  MAX_BACKUP_BYTES,
  backupFileName,
  createBackupFile,
  parseBackupText,
  serializeBackup,
} from '../domain/backup';
import type { BackupSource } from '../domain/backup';
import { downloadTextFile } from '../utils/download';

interface SettingsDialogProps {
  plan: PlanSnapshot;
  onClose: () => void;
  onReplacePlan: (plan: PlanSnapshot) => void;
}

type ImportState =
  | { step: 'idle' }
  | { step: 'invalid'; fileName: string; errors: string[] }
  | {
      step: 'confirm';
      fileName: string;
      plan: PlanSnapshot;
      source: BackupSource;
      exportedAt: string | null;
    };

const SOURCE_LABELS: Record<BackupSource, string> = {
  current: 'Backup di Release Board',
  'legacy-v2': 'File della versione precedente',
};

function exportPlan(plan: PlanSnapshot, suffix?: string) {
  const now = new Date();
  downloadTextFile(
    backupFileName(now, suffix),
    serializeBackup(createBackupFile(plan, now)),
    'application/json',
  );
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

function countSummary(plan: PlanSnapshot): string {
  const notes = Object.keys(plan.dailyNotes).length;
  return [
    `${plan.tasks.length} attività`,
    `${plan.lanes.length} ${plan.lanes.length === 1 ? 'corsia' : 'corsie'}`,
    `${plan.metrics.length} valori giornalieri`,
    `${notes} ${notes === 1 ? 'nota' : 'note'}`,
  ].join(' · ');
}

/** Settings overlay on the browser modal <dialog>, which handles focus and closes with Esc. */
export function SettingsDialog({ plan, onClose, onReplacePlan }: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>({ step: 'idle' });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = () => dialogRef.current?.close();

  const handleFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setImportState({
        step: 'invalid',
        fileName: file.name,
        errors: ['Il file è troppo grande per essere un backup.'],
      });
      return;
    }
    const result = parseBackupText(await file.text());
    setImportState(
      result.ok
        ? {
            step: 'confirm',
            fileName: file.name,
            plan: result.plan,
            source: result.source,
            exportedAt: result.exportedAt,
          }
        : { step: 'invalid', fileName: file.name, errors: result.errors },
    );
  };

  const handleConfirmReplace = (next: PlanSnapshot) => {
    exportPlan(plan, 'prima-del-ripristino');
    onReplacePlan(next);
    close();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="settings-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/60"
    >
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 id="settings-title" className="text-base font-bold text-slate-900">
          Impostazioni
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="Chiudi"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div className="space-y-6 px-5 py-5">
        <section aria-labelledby="settings-backup" className="space-y-3">
          <h3 id="settings-backup" className="text-sm font-bold text-slate-900">
            Backup
          </h3>
          <p className="text-xs text-slate-600">{countSummary(plan)}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportPlan(plan)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Esporta JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Importa JSON…
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void handleFileChosen(event)}
            />
          </div>

          {importState.step === 'invalid' && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              <p className="font-semibold">{importState.fileName} non può essere importato:</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                {importState.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {importState.step === 'confirm' && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              <div>
                <p className="font-semibold">{importState.fileName}</p>
                <p>
                  {SOURCE_LABELS[importState.source]}
                  {importState.exportedAt && ` del ${formatDateTime(importState.exportedAt)}`}
                </p>
                <p className="mt-1">{countSummary(importState.plan)}</p>
              </div>
              <p className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  L&apos;importazione sostituisce tutti i dati attuali. Prima viene scaricata una
                  copia dei dati attuali.
                </span>
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportState({ step: 'idle' })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmReplace(importState.plan)}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700"
                >
                  Sostituisci i dati
                </button>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="settings-about" className="space-y-2">
          <h3 id="settings-about" className="text-sm font-bold text-slate-900">
            Informazioni
          </h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-slate-500">Versione</dt>
            <dd>{BUILD_INFO.version}</dd>
            <dt className="text-slate-500">Build</dt>
            <dd>
              {BUILD_INFO.commit} · {formatDateTime(BUILD_INFO.builtAt)}
            </dd>
            <dt className="text-slate-500">Dati</dt>
            <dd>Salvati in questo browser</dd>
            <dt className="text-slate-500">Codice sorgente</dt>
            <dd>
              <a
                href={SOURCE_REPOSITORY_URL}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline hover:text-blue-900"
              >
                {SOURCE_REPOSITORY_URL.replace('https://', '')}
              </a>
            </dd>
          </dl>
        </section>
      </div>
    </dialog>
  );
}
