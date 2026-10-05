import { useId, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { FileUp, TriangleAlert, Upload } from 'lucide-react';
import { APPROVAL_LABELS, APPROVAL_LIGHTS } from '../../domain/approval';
import { parseRevenueForecast } from '../../domain/revenueForecast';
import type { ForecastParseResult } from '../../domain/revenueForecast';
import type { DailyMetric } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { formatDateToIT } from '../../utils/dateUtils';
import { APPROVAL_TONE, ApprovalIcon, preciseValue } from './MetricDetails';

/** A forecast is a few kilobytes per year: anything far larger is not one. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const PREVIEW_DAYS = 6;
const LISTED_PROBLEMS = 8;

interface ImportForecastDialogProps {
  /** The values already in the plan, to tell new days from updated ones. */
  metrics: DailyMetric[];
  onImport: (days: DailyMetric[]) => void;
  onClose: () => void;
}

type Loaded = { fileName: string; result: ForecastParseResult };

const SPREADSHEET_FILE =
  'Questo è un file di foglio di calcolo: in Google Fogli scegli «File» → «Scarica» → «Valori separati da virgola (.csv)» e importa quel file.';

/** Why a file cannot be read as text, before reading it. */
function fileProblem(file: File): string | null {
  if (/\.(xlsx|xlsm|xls|ods|numbers)$/i.test(file.name)) return SPREADSHEET_FILE;
  if (file.size > MAX_FILE_BYTES) return 'Il file è troppo grande per essere una previsione.';
  return null;
}

/**
 * Imports the revenue forecast from the CSV file of the spreadsheet: shows what it found, and the
 * rows it leaves out with the reason, before anything is saved. Mounted only while open.
 */
export function ImportForecastDialog({ metrics, onImport, onClose }: ImportForecastDialogProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const instructionsId = useId();

  const load = async (file: File | undefined) => {
    if (!file) return;
    const problem = fileProblem(file);
    if (problem) {
      setLoaded({ fileName: file.name, result: { ok: false, error: problem } });
      return;
    }
    const text = await file.text();
    // A zip archive, such as an Excel file renamed to .csv.
    const result: ForecastParseResult = text.startsWith('PK')
      ? { ok: false, error: SPREADSHEET_FILE }
      : parseRevenueForecast(text);
    setLoaded({ fileName: file.name, result });
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void load(event.dataTransfer.files[0]);
  };

  const days = loaded?.result.ok ? loaded.result.days : [];
  const existing = new Set(metrics.map((metric) => metric.date));
  const updated = days.filter((day) => existing.has(day.date)).length;

  const dropZone = (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
        dragging ? 'border-link bg-accent-soft' : 'border-line-strong bg-surface-muted'
      }`}
    >
      <Upload className="h-5 w-5 text-fg-muted" aria-hidden="true" />
      <p className="text-sm">Trascina qui il file CSV, oppure</p>
      <Button onClick={() => inputRef.current?.click()} aria-describedby={instructionsId}>
        <FileUp className="h-4 w-4" aria-hidden="true" />
        Scegli il file
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,.tsv,text/tab-separated-values,.txt"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void load(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );

  return (
    <Dialog
      title="Importa il fatturato previsto"
      description="Dal foglio delle previsioni, salvato in formato CSV"
      icon={
        <div className="rounded-xl bg-surface-strong p-2 text-fg">
          <FileUp className="h-5 w-5" aria-hidden="true" />
        </div>
      }
      onClose={onClose}
      className="max-w-2xl"
      footer={
        <>
          <Button onClick={onClose}>Annulla</Button>
          <Button
            variant="primary"
            disabled={days.length === 0}
            onClick={() => {
              onImport(days);
              onClose();
            }}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {days.length > 0
              ? `Importa ${days.length} ${days.length === 1 ? 'giorno' : 'giorni'}`
              : 'Importa'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        {!loaded?.result.ok && (
          <>
            <ol id={instructionsId} className="list-decimal space-y-1 pl-5">
              <li>In Google Fogli apri il foglio delle previsioni.</li>
              <li>
                Scegli «File» → «Scarica» → «Valori separati da virgola (.csv)»: il file finisce nei
                download.
              </li>
              <li>Importalo qui sotto. Prima di salvare vedrai cosa contiene.</li>
            </ol>
            {loaded && !loaded.result.ok && (
              <p
                role="alert"
                className="flex gap-2 rounded-lg border border-danger bg-danger-soft p-3 text-fg"
              >
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                <span>
                  <strong className="font-semibold">{loaded.fileName}</strong>:{' '}
                  {loaded.result.error}
                </span>
              </p>
            )}
            {dropZone}
            <p className="text-xs text-fg-muted">
              Servono le colonne <strong>Date</strong> (per esempio 5-ott-26) e <strong>OV</strong>{' '}
              (per esempio 3.210.123,45). Se ci sono, vengono lette anche <strong>MONTH</strong> e{' '}
              <strong>day</strong> per controllare le date, <strong>EU MARKETS</strong> e{' '}
              <strong>NON EU MARKETS</strong> per le promozioni, <strong>Approval light</strong>{' '}
              (Green, Orange o Red) per il semaforo. Le righe vuote prima dei nomi delle colonne non
              contano.
            </p>
          </>
        )}

        {loaded?.result.ok && (
          <ForecastPreview
            fileName={loaded.fileName}
            result={loaded.result}
            updated={updated}
            onChooseAnother={() => setLoaded(null)}
          />
        )}
      </div>
    </Dialog>
  );
}

interface ForecastPreviewProps {
  fileName: string;
  result: Extract<ForecastParseResult, { ok: true }>;
  /** Days that already have a value, which the import replaces. */
  updated: number;
  onChooseAnother: () => void;
}

function ForecastPreview({ fileName, result, updated, onChooseAnother }: ForecastPreviewProps) {
  const { days, problems } = result;
  const first = days[0];
  const last = days.at(-1);
  const withPromos = days.filter((day) => day.promoEu || day.promoNonEu).length;

  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span>
          File <strong className="font-semibold wrap-anywhere">{fileName}</strong>
        </span>
        <button
          type="button"
          onClick={onChooseAnother}
          className="cursor-pointer text-xs font-semibold text-link underline"
        >
          Scegli un altro file
        </button>
      </p>

      {first && last ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-line bg-surface-muted p-2.5">
            <dt className="text-xs text-fg-muted">Giorni</dt>
            <dd className="text-lg font-bold tabular-nums">{days.length}</dd>
            <dd className="text-xs text-fg-muted">
              dal {formatDateToIT(first.date)} al {formatDateToIT(last.date)}
            </dd>
          </div>
          <div className="rounded-lg border border-line bg-surface-muted p-2.5">
            <dt className="text-xs text-fg-muted">Già presenti</dt>
            <dd className="text-lg font-bold tabular-nums">{updated}</dd>
            <dd className="text-xs text-fg-muted">vengono sostituiti</dd>
          </div>
          <div className="rounded-lg border border-line bg-surface-muted p-2.5">
            <dt className="text-xs text-fg-muted">Semaforo</dt>
            {APPROVAL_LIGHTS.map((light) => (
              <dd key={light} className="flex items-center gap-1.5 text-xs tabular-nums">
                <span className={`rounded-sm p-0.5 ${APPROVAL_TONE[light]}`}>
                  <ApprovalIcon light={light} />
                </span>
                {APPROVAL_LABELS[light].name}: {days.filter((day) => day.approval === light).length}
              </dd>
            ))}
          </div>
          <div className="rounded-lg border border-line bg-surface-muted p-2.5">
            <dt className="text-xs text-fg-muted">Con promozioni</dt>
            <dd className="text-lg font-bold tabular-nums">{withPromos}</dd>
            <dd className="text-xs text-fg-muted">giorni</dd>
          </div>
        </dl>
      ) : (
        <p className="rounded-lg border border-line bg-surface-muted p-3">
          Nel file non c&apos;è nessun giorno da importare.
        </p>
      )}

      {days.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">I primi giorni del file</caption>
            <thead className="bg-surface-muted text-fg-muted">
              <tr>
                <th scope="col" className="px-2 py-1.5 font-semibold">
                  Giorno
                </th>
                <th scope="col" className="px-2 py-1.5 text-right font-semibold">
                  OV
                </th>
                <th scope="col" className="px-2 py-1.5 font-semibold">
                  Semaforo
                </th>
                <th scope="col" className="px-2 py-1.5 font-semibold">
                  Promo EU
                </th>
                <th scope="col" className="px-2 py-1.5 font-semibold">
                  Promo non EU
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {days.slice(0, PREVIEW_DAYS).map((day) => (
                <tr key={day.date}>
                  <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">
                    {formatDateToIT(day.date)}
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                    {preciseValue(day.value)}
                  </td>
                  <td className="px-2 py-1.5">
                    {day.approval ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-semibold ${APPROVAL_TONE[day.approval]}`}
                      >
                        <ApprovalIcon light={day.approval} />
                        {APPROVAL_LABELS[day.approval].name}
                      </span>
                    ) : (
                      <span className="text-fg-muted">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">{day.promoEu ?? ''}</td>
                  <td className="px-2 py-1.5">{day.promoNonEu ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {days.length > PREVIEW_DAYS && (
            <p className="border-t border-line bg-surface-muted px-2 py-1.5 text-xs text-fg-muted">
              … e altri {days.length - PREVIEW_DAYS} giorni
            </p>
          )}
        </div>
      )}

      {problems.length > 0 && (
        <div className="rounded-lg border border-warning bg-warning-soft p-3 text-fg">
          <p className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            {problems.length === 1
              ? '1 riga non verrà importata'
              : `${problems.length} righe non verranno importate`}
          </p>
          <ul className="mt-1.5 space-y-0.5 text-xs">
            {problems.slice(0, LISTED_PROBLEMS).map((problem) => (
              <li key={problem.line}>
                Riga {problem.line}: {problem.message}
              </li>
            ))}
            {problems.length > LISTED_PROBLEMS && (
              <li>… e altre {problems.length - LISTED_PROBLEMS}</li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}
