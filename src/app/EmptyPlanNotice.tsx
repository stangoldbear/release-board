import { Sparkles, TriangleAlert, Upload } from 'lucide-react';
import { Button } from '../shared/ui/Button';

interface EmptyPlanNoticeProps {
  /** Shown when saved data could not be read. */
  warning: string | null;
  onLoadSample: () => void;
  onRestoreBackup: () => void;
}

export function EmptyPlanNotice({ warning, onLoadSample, onRestoreBackup }: EmptyPlanNoticeProps) {
  return (
    <section className="rounded-xl border border-line bg-surface px-6 py-5 text-center shadow-2xs">
      {warning && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-lg border border-warning bg-warning-soft px-3 py-1.5 text-xs">
          <TriangleAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          {warning}
        </p>
      )}
      <h2 className="text-sm font-bold">Il piano è vuoto</h2>
      <p className="mt-1 text-xs text-fg-muted">
        Aggiungi un&apos;attività dal calendario, prova l&apos;app con dei dati di esempio oppure
        ripristina un backup.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={onLoadSample}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Carica un esempio
        </Button>
        <Button onClick={onRestoreBackup}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Ripristina un backup
        </Button>
      </div>
    </section>
  );
}
