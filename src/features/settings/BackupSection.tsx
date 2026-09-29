import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Download, TriangleAlert, Upload } from 'lucide-react';
import {
  MAX_BACKUP_BYTES,
  backupFileName,
  createBackupFile,
  parseBackupText,
  serializeBackup,
} from '../../domain/backup';
import type { BackupSource } from '../../domain/backup';
import type { PlanSnapshot } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { formatDateTimeIT } from '../../utils/dateUtils';
import { downloadTextFile } from '../../utils/download';

interface BackupSectionProps {
  plan: PlanSnapshot;
  /** Called after the user confirmed, once a copy of the current data has been downloaded. */
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

function countSummary(plan: PlanSnapshot): string {
  const notes = Object.keys(plan.dailyNotes).length;
  return [
    `${plan.tasks.length} attività`,
    `${plan.lanes.length} ${plan.lanes.length === 1 ? 'corsia' : 'corsie'}`,
    `${plan.metrics.length} valori giornalieri`,
    `${notes} ${notes === 1 ? 'nota' : 'note'}`,
  ].join(' · ');
}

/** Export to a JSON file, and import one after validation, preview and confirmation. */
export function BackupSection({ plan, onReplacePlan }: BackupSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>({ step: 'idle' });

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
  };

  return (
    <section aria-labelledby="settings-backup" className="space-y-3">
      <h3 id="settings-backup" className="text-sm font-bold">
        Backup
      </h3>
      <p className="text-xs text-fg-muted">{countSummary(plan)}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => exportPlan(plan)}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Esporta JSON
        </Button>
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Importa JSON…
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleFileChosen(event)}
        />
      </div>

      {importState.step === 'invalid' && (
        <div className="rounded-lg border border-danger bg-danger-soft p-3 text-xs">
          <p className="font-semibold">{importState.fileName} non può essere importato:</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
            {importState.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {importState.step === 'confirm' && (
        <div className="space-y-3 rounded-lg border border-warning bg-warning-soft p-3 text-xs">
          <div>
            <p className="font-semibold">{importState.fileName}</p>
            <p>
              {SOURCE_LABELS[importState.source]}
              {importState.exportedAt && ` del ${formatDateTimeIT(importState.exportedAt)}`}
            </p>
            <p className="mt-1">{countSummary(importState.plan)}</p>
          </div>
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              L&apos;importazione sostituisce tutti i dati attuali. Prima viene scaricata una copia
              dei dati attuali.
            </span>
          </p>
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setImportState({ step: 'idle' })}>
              Annulla
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleConfirmReplace(importState.plan)}
            >
              Sostituisci i dati
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
