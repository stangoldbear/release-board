import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { isWorkingDay } from '../../domain/assignments';
import { ABSENCE_REASON_MAX, CLOSURES_MAX } from '../../domain/roadmapConfig';
import type { Closure } from '../../domain/types';
import { useFormatDate } from '../../shared/dateFormat';
import { Button } from '../../shared/ui/Button';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { RulesNotice } from '../../shared/ui/RulesNotice';
import { addDaysIso, isIsoDate } from '../../utils/dateUtils';

/** The days of a closure that would be working days without it: weekends and holidays excluded. */
function closedWorkingDays(closure: Closure): number {
  let days = 0;
  for (let day = closure.start; day <= closure.end; day = addDaysIso(day, 1)) {
    if (isWorkingDay(day, [])) days += 1;
  }
  return days;
}

interface ClosuresSectionProps {
  closures: readonly Closure[];
  /** The published rules do not know the settings of the roadmap yet. */
  unavailable: boolean;
  /** Saves the whole list, shared by every member. */
  onChange: (closures: Closure[]) => void;
}

/**
 * The days the company is closed: striped red on the timeline, and skipped by the work of the
 * projects as weekends are. Each one is added or removed at once, for every member.
 */
export function ClosuresSection({ closures, unavailable, onChange }: ClosuresSectionProps) {
  const formatDate = useFormatDate();
  const [draft, setDraft] = useState({ start: '', end: '', reason: '' });
  const fromId = useId();
  const toId = useId();
  const reasonId = useId();
  const full = closures.length >= CLOSURES_MAX;
  const draftValid =
    isIsoDate(draft.start) && isIsoDate(draft.end) && draft.start <= draft.end && !full;

  const add = () => {
    if (!draftValid) return;
    const closure: Closure = { start: draft.start, end: draft.end };
    if (draft.reason.trim()) closure.reason = draft.reason.trim();
    const others = closures.filter(
      (item) => item.start !== closure.start || item.end !== closure.end,
    );
    onChange([...others, closure]);
    setDraft({ start: '', end: '', reason: '' });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-muted">
        I giorni in cui l&apos;azienda è chiusa: sulla timeline sono a righe rosse e, come i sabati
        e le domeniche, nessuno lavora, così le barre del lavoro dei progetti li saltano. Vale per
        tutti i membri del piano.
      </p>
      {unavailable ? (
        <RulesNotice what="Le chiusure aziendali" />
      ) : (
        <>
          {closures.length > 0 ? (
            <ul aria-label="Chiusure aziendali" className="space-y-1.5">
              {closures.map((closure) => {
                const days = closedWorkingDays(closure);
                return (
                  <li
                    key={`${closure.start}-${closure.end}`}
                    className="flex items-center gap-2 rounded-md border border-line bg-surface-muted px-2.5 py-1.5 text-sm"
                  >
                    <span
                      aria-hidden="true"
                      className="h-3 w-5 shrink-0 rounded-xs border border-line-strong bg-closure"
                    />
                    <span className="min-w-0 flex-1">
                      {closure.start === closure.end
                        ? formatDate(closure.start)
                        : `${formatDate(closure.start)} – ${formatDate(closure.end)}`}
                      <span className="text-fg-muted">
                        {' · '}
                        {days === 1 ? '1 giorno lavorativo' : `${days} giorni lavorativi`}
                        {closure.reason && ` · ${closure.reason}`}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1"
                      onClick={() => onChange(closures.filter((item) => item !== closure))}
                      aria-label={`Rimuovi la chiusura dal ${formatDate(closure.start)} al ${formatDate(closure.end)}`}
                      title="Rimuovi la chiusura"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-line p-3 text-center text-xs text-fg-muted">
              Nessuna chiusura.
            </p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor={fromId} className={LABEL_CLASS}>
                Dal
              </label>
              <input
                id={fromId}
                type="date"
                max={DATE_MAX}
                value={draft.start}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    start: event.target.value,
                    end:
                      draft.end === '' || draft.end < event.target.value
                        ? event.target.value
                        : draft.end,
                  })
                }
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor={toId} className={LABEL_CLASS}>
                Al (incluso)
              </label>
              <input
                id={toId}
                type="date"
                max={DATE_MAX}
                min={draft.start || undefined}
                value={draft.end}
                onChange={(event) => setDraft({ ...draft, end: event.target.value })}
                className={FIELD_CLASS}
              />
            </div>
            <div className="min-w-32 flex-1">
              <label htmlFor={reasonId} className={LABEL_CLASS}>
                Motivo
              </label>
              <input
                id={reasonId}
                type="text"
                maxLength={ABSENCE_REASON_MAX}
                placeholder="es. Chiusura estiva"
                value={draft.reason}
                onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    add();
                  }
                }}
                className={FIELD_CLASS}
              />
            </div>
            <Button onClick={add} disabled={!draftValid}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Aggiungi chiusura
            </Button>
          </div>
          {full && (
            <p className="text-xs text-fg-muted">
              Al massimo {CLOSURES_MAX} chiusure: togline una passata per aggiungerne altre.
            </p>
          )}
        </>
      )}
    </div>
  );
}
