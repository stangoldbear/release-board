import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { Equal, Minus, Plus, Scissors } from 'lucide-react';
import type { TaskColorId } from '../../domain/colors';
import { formatLocaleNumber } from '../../domain/numberFormat';
import type { DateRange } from '../../domain/schedule';
import { SPLIT_GAP_MAX, equalParts, moveCut, resizePart } from '../../domain/split';
import type { SplitStep } from '../../domain/split';
import { useFormatDate } from '../../shared/dateFormat';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { taskColorStyle } from '../../themes';
import { addDaysIso, daysBetween } from '../../utils/dateUtils';

/** What the window splits: a bar of work, in days of work, or a task, in days. */
export interface SplitTarget {
  /** «Server #1 su App mobile 3.0»: the bar, as its menu names it. */
  name: string;
  /** Its days now, under the title. */
  summary: string;
  total: number;
  step: SplitStep;
  /** Parts at most, two at least for the window to make sense. */
  maxParts: number;
  colorId: TaskColorId;
  /** The bar has a note, which every part can keep. */
  hasNote: boolean;
  /** What the pause counts: working days for work, days for a task. */
  pauseIn: 'working' | 'calendar';
  /** The days of each part, or null when a part does not fit in the calendar. */
  place: (sizes: readonly number[], pause: number) => DateRange[] | null;
  /** The days nobody works on, drawn as such in the calendar of the preview. */
  isDayOff: (iso: string) => boolean;
}

export interface SplitChoice {
  sizes: number[];
  pause: number;
  /** The note goes on every part; otherwise it stays on the first. */
  copyNote: boolean;
}

function days(value: number): string {
  return `${formatLocaleNumber(value, Number.isInteger(value) ? 0 : 1)} ${value === 1 ? 'giorno' : 'giorni'}`;
}

function shortDays(value: number): string {
  return `${formatLocaleNumber(value, Number.isInteger(value) ? 0 : 1)} gg`;
}

/** The handle of a cut: hit area of 24 pixels at least (WCAG 2.2), a slider for the keyboard. */
const CUT_WIDTH = 24;

/**
 * Splits a bar in parts that together make the whole: how many, by dragging the cuts of the
 * preview or by writing the days of each part, with a pause between them, and whether every part
 * keeps the note. The dates of every part are written beside it, and a small calendar shows them
 * with the days off: the list is the same preview for screen readers. Mounted only while open.
 */
export function SplitDialog({
  target,
  onSplit,
  onClose,
}: {
  target: SplitTarget;
  onSplit: (choice: SplitChoice) => void;
  onClose: () => void;
}) {
  const formatDate = useFormatDate();
  const { total, step, maxParts } = target;
  const [sizes, setSizes] = useState(() => equalParts(total, 2, step));
  const [pause, setPause] = useState(0);
  const [pauseText, setPauseText] = useState('0');
  const [copyNote, setCopyNote] = useState(true);
  const [announcement, setAnnouncement] = useState('');
  const barRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  const partsId = useId();
  const pauseId = useId();
  const helpId = useId();
  const parts = sizes.length;
  const placed = target.place(sizes, pause);
  const pauseWords = target.pauseIn === 'working' ? 'giorni lavorativi' : 'giorni';

  const setParts = (count: number) => {
    const next = Math.min(Math.max(count, 2), maxParts);
    setSizes(equalParts(total, next, step));
    setAnnouncement(`${next} parti uguali`);
  };

  // The cuts as positions from the start of the bar, in days.
  const cutAt = (index: number) => sizes.slice(0, index + 1).reduce((sum, size) => sum + size, 0);
  const moveCutBy = (index: number, steps: number) => setSizes(moveCut(sizes, index, steps, step));

  const cutKey = (event: KeyboardEvent, index: number) => {
    const day = 1 / step;
    const room = {
      down: (sizes[index] ?? step) / step - 1,
      up: (sizes[index + 1] ?? step) / step - 1,
    };
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowDown: -1,
      ArrowRight: 1,
      ArrowUp: 1,
      PageDown: -day,
      PageUp: day,
      Home: -room.down,
      End: room.up,
    };
    const by = steps[event.key];
    if (by === undefined) return;
    event.preventDefault();
    moveCutBy(index, by);
  };

  // A cut follows the pointer, in steps: from the start of the bar to where the pointer is.
  const startCutDrag = (event: PointerEvent<HTMLDivElement>, index: number) => {
    const bar = barRef.current;
    if (!bar) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    handle.focus();
    const rect = bar.getBoundingClientRect();
    let current = sizes;
    const move = (moveEvent: globalThis.PointerEvent) => {
      const at = ((moveEvent.clientX - rect.left) / rect.width) * total;
      const wanted = Math.round(at / step) * step;
      const now = current.slice(0, index + 1).reduce((sum, size) => sum + size, 0);
      const next = moveCut(current, index, (wanted - now) / step, step);
      if (next.some((size, i) => size !== current[i])) {
        current = next;
        setSizes(next);
      }
    };
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };

  // The days of the preview's calendar: from the first day of the first part to the last of the
  // last one.
  const span =
    placed && placed.length > 0 ? { start: placed[0]!.start, end: placed.at(-1)!.end } : null;
  const calendar = span
    ? Array.from({ length: daysBetween(span.start, span.end) }, (_, at) =>
        addDaysIso(span.start, at),
      )
    : [];
  const partOn = (iso: string) =>
    placed?.findIndex((range) => range.start <= iso && iso <= range.end) ?? -1;

  const submit = () => {
    if (!placed) return;
    onSplit({ sizes, pause, copyNote });
    onClose();
  };

  return (
    <Dialog
      title={`Dividi «${target.name}»`}
      description={target.summary}
      icon={<Scissors className="h-5 w-5" aria-hidden="true" />}
      onClose={onClose}
      className="max-w-2xl"
      footer={
        <>
          <Button onClick={onClose}>Annulla</Button>
          <Button variant="primary" type="submit" form={formId} disabled={!placed}>
            <Scissors className="h-4 w-4" aria-hidden="true" />
            Dividi in {parts} parti
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="space-y-5"
      >
        <p role="status" className="sr-only">
          {announcement}
        </p>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <label htmlFor={partsId} className={LABEL_CLASS}>
              Parti
            </label>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Una parte in meno"
                disabled={parts <= 2}
                onClick={() => setParts(parts - 1)}
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span className="w-16">
                <input
                  id={partsId}
                  type="number"
                  data-autofocus
                  min={2}
                  max={maxParts}
                  value={parts}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isInteger(value) && value >= 2) setParts(value);
                  }}
                  className={`${FIELD_CLASS} text-center tabular-nums`}
                />
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Una parte in più"
                disabled={parts >= maxParts}
                onClick={() => setParts(parts + 1)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div>
            <label htmlFor={pauseId} className={LABEL_CLASS}>
              Pausa tra le parti
            </label>
            <div className="flex items-center gap-2">
              <span className="w-20">
                <input
                  id={pauseId}
                  type="number"
                  min={0}
                  max={SPLIT_GAP_MAX}
                  step={1}
                  value={pauseText}
                  onChange={(event) => {
                    setPauseText(event.target.value);
                    const value = Number(event.target.value);
                    if (Number.isInteger(value) && value >= 0 && value <= SPLIT_GAP_MAX)
                      setPause(value);
                  }}
                  className={`${FIELD_CLASS} tabular-nums`}
                />
              </span>
              <span className="text-sm whitespace-nowrap text-fg-muted">{pauseWords}</span>
            </div>
          </div>
          <Button
            onClick={() => {
              setSizes(equalParts(total, parts, step));
              setAnnouncement(`${parts} parti uguali`);
            }}
          >
            <Equal className="h-4 w-4" aria-hidden="true" />
            Parti uguali
          </Button>
        </div>

        <section aria-labelledby={`${formId}-preview`} className="space-y-2">
          <h3 id={`${formId}-preview`} className={LABEL_CLASS}>
            Anteprima
          </h3>
          <p id={helpId} className="text-xs text-fg-muted">
            Trascina i tagli, o usa le frecce sul taglio con il focus, per dare a ogni parte i suoi
            giorni: il totale resta {days(total)}.
          </p>
          {/* The parts in proportion to their days, with the cuts between them. */}
          <div
            ref={barRef}
            className="relative flex h-12 select-none"
            style={{ touchAction: 'none' }}
          >
            {sizes.map((size, index) => (
              <div
                key={index}
                style={{ width: `${(size / total) * 100}%`, ...taskColorStyle(target.colorId) }}
                className="flex min-w-0 items-center justify-center overflow-hidden rounded-sm border-2 px-1 text-xs font-semibold"
                aria-hidden="true"
              >
                <span className="truncate">
                  {index + 1} · {shortDays(size)}
                </span>
              </div>
            ))}
            {sizes.slice(0, -1).map((size, index) => {
              const position = (cutAt(index) / total) * 100;
              return (
                <div
                  key={index}
                  tabIndex={0}
                  role="slider"
                  aria-label={`Taglio tra la parte ${index + 1} e la parte ${index + 2}`}
                  aria-describedby={helpId}
                  aria-orientation="horizontal"
                  aria-valuemin={step}
                  aria-valuemax={size + (sizes[index + 1] ?? 0) - step}
                  aria-valuenow={size}
                  aria-valuetext={`Parte ${index + 1}: ${days(size)}, parte ${index + 2}: ${days(sizes[index + 1] ?? 0)}`}
                  onKeyDown={(event) => cutKey(event, index)}
                  onPointerDown={(event) => startCutDrag(event, index)}
                  style={{ left: `calc(${position}% - ${CUT_WIDTH / 2}px)`, width: CUT_WIDTH }}
                  className="group absolute inset-y-[-4px] flex cursor-ew-resize items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-link"
                >
                  <span className="h-full w-1 rounded-full bg-fg shadow-[0_0_0_2px_var(--color-surface)] group-hover:w-1.5" />
                </div>
              );
            })}
          </div>

          {/* The parts on the calendar, with the pauses and the days off. */}
          {calendar.length > 0 && (
            <div aria-hidden="true" className="space-y-1">
              <div className="flex h-4 gap-px">
                {calendar.map((iso, at) => {
                  const part = partOn(iso);
                  const off = target.isDayOff(iso);
                  // Where a part starts right after another, a space marks the cut.
                  const before = at > 0 ? partOn(calendar[at - 1] ?? iso) : part;
                  const cut = part > 0 && before !== part && before >= 0;
                  return (
                    <span
                      key={iso}
                      title={formatDate(iso)}
                      style={part >= 0 && !off ? taskColorStyle(target.colorId) : undefined}
                      className={`min-w-0 flex-1 rounded-[2px] ${cut ? 'ml-1.5' : ''} ${
                        part >= 0 && !off
                          ? 'border'
                          : off
                            ? 'border border-line-strong bg-surface-strong'
                            : 'border border-dashed border-line-strong'
                      }`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-fg-muted">
                <span>{formatDate(calendar[0])}</span>
                <span>{formatDate(calendar.at(-1))}</span>
              </div>
              <p className="flex flex-wrap gap-x-3 text-xs text-fg-muted">
                <span className="flex items-center gap-1">
                  <span
                    style={taskColorStyle(target.colorId)}
                    className="h-3 w-3 rounded-[2px] border"
                  />
                  lavoro
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-[2px] border border-line-strong bg-surface-strong" />
                  giorno libero
                </span>
                {pause > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-[2px] border border-dashed border-line-strong" />
                    pausa
                  </span>
                )}
              </p>
            </div>
          )}
        </section>

        <section aria-labelledby={`${formId}-parts`} className="space-y-2">
          <h3 id={`${formId}-parts`} className={LABEL_CLASS}>
            Le parti
          </h3>
          {!placed && (
            <p role="alert" className="text-sm font-semibold text-danger">
              Una parte non entra nel calendario: togli la pausa o qualche parte.
            </p>
          )}
          <ol className="space-y-1.5">
            {sizes.map((size, index) => {
              const range = placed?.[index];
              const fieldId = `${formId}-part-${index}`;
              return (
                <li
                  key={index}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface px-3 py-2"
                >
                  <label htmlFor={fieldId} className="w-16 shrink-0 text-sm font-semibold">
                    Parte {index + 1}
                  </label>
                  <span className="flex items-center gap-1.5">
                    <span className="w-20">
                      <input
                        id={fieldId}
                        type="number"
                        min={step}
                        max={total - step * (parts - 1)}
                        step={step}
                        value={size}
                        onChange={(event) =>
                          setSizes(resizePart(sizes, index, Number(event.target.value), step))
                        }
                        className={`${FIELD_CLASS} py-1 tabular-nums`}
                      />
                    </span>
                    <span className="text-sm whitespace-nowrap text-fg-muted">
                      {target.step === 0.5 ? 'giorni uomo' : 'giorni'}
                    </span>
                  </span>
                  {range && (
                    <span className="text-sm tabular-nums">
                      {range.start === range.end
                        ? formatDate(range.start)
                        : `${formatDate(range.start)} → ${formatDate(range.end)}`}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {target.hasNote && (
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={copyNote}
              onChange={(event) => setCopyNote(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold">Copia la nota in ogni parte</span>
              <span className="block text-xs text-fg-muted">
                Altrimenti la nota resta solo sulla prima parte.
              </span>
            </span>
          </label>
        )}
      </form>
    </Dialog>
  );
}
