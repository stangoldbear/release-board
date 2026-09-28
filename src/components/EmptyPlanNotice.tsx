import { TriangleAlert, Sparkles, Upload } from 'lucide-react';

interface EmptyPlanNoticeProps {
  /** Shown when saved data could not be read. */
  warning: string | null;
  onLoadSample: () => void;
  onRestoreBackup: () => void;
}

export function EmptyPlanNotice({ warning, onLoadSample, onRestoreBackup }: EmptyPlanNoticeProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl px-6 py-5 text-center shadow-2xs">
      {warning && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-900">
          <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
          {warning}
        </p>
      )}
      <h2 className="text-sm font-bold text-slate-800">Il piano è vuoto</h2>
      <p className="text-xs text-slate-500 mt-1">
        Aggiungi un&apos;attività dal calendario, prova l&apos;app con dei dati di esempio oppure
        ripristina un backup.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onLoadSample}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          Carica un esempio
        </button>
        <button
          type="button"
          onClick={onRestoreBackup}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" />
          Ripristina un backup
        </button>
      </div>
    </section>
  );
}
