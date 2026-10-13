import { TriangleAlert } from 'lucide-react';
import { useFormatDate } from '../../shared/dateFormat';
import { Button } from '../../shared/ui/Button';
import { HoverCard, useHoverCard } from '../../shared/ui/HoverCard';
import { formatManDays } from './barRendering';
import type { DeadlineOverrun } from './deadlineOverrun';

interface DeadlineSignProps {
  title: string;
  overrun: DeadlineOverrun;
  /** Pixels from the first day of the row to the end of the day of the deadline. */
  left: number;
  onOpen: () => void;
}

/**
 * The sign of a project past its deadline, on the line of the deadline at the top of its
 * row, over every bar: a red disc with a triangle that grows under the mouse and the focus, and
 * a card with the deadline, how far the work goes past it and who works past it, on the mouse,
 * the focus and a tap. The same words are its accessible name.
 */
export function DeadlineSign({ title, overrun, left, onOpen }: DeadlineSignProps) {
  const formatDate = useFormatDate();
  const card = useHoverCard<true>();
  const days =
    overrun.workingDays === 1 ? '1 giorno lavorativo' : `${overrun.workingDays} giorni lavorativi`;
  const summary = `Deadline di «${title}» superata: il ${formatDate(overrun.deadline)}, il lavoro finisce il ${formatDate(overrun.end)}, ${days} dopo`;
  return (
    <span
      className="absolute top-0.5 z-30 -translate-x-1/2"
      style={{ left }}
      // The pointer must not start a drag of the row or of the bar under the sign.
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label={summary}
        {...card.triggerProps(true)}
        className="pointer-events-auto flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-danger text-on-danger shadow-sm ring-2 ring-surface transition-transform hover:scale-125 focus-visible:scale-125 motion-reduce:transition-none"
      >
        <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {card.card && (
        <HoverCard
          anchor={card.card.anchor}
          cardRef={card.cardProps.cardRef}
          onPointerEnter={card.cardProps.onPointerEnter}
          onPointerLeave={card.cardProps.onPointerLeave}
        >
          <div>
            <p className="-mx-3 -mt-3 mb-2 flex items-center gap-1.5 rounded-t-xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              Deadline superata
            </p>
            <div className="space-y-1.5 text-xs">
              <p className="font-semibold">{title}</p>
              <p>
                Deadline: <strong>{formatDate(overrun.deadline)}</strong>
              </p>
              <p>
                Il lavoro finisce il <strong>{formatDate(overrun.end)}</strong>, {days} dopo.
              </p>
              {overrun.late.length > 0 ? (
                <div>
                  <p className="text-fg-muted">Oltre la deadline:</p>
                  <ul className="mt-0.5 space-y-0.5">
                    {overrun.late.map((item) => (
                      <li key={`${item.kind}-${item.id}`}>
                        <strong>{item.name}</strong> · {formatManDays(item.manDays)}, fino al{' '}
                        {formatDate(item.schedule.end)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-fg-muted">Il progetto inizia dopo la deadline.</p>
              )}
              <div className="pt-1">
                <Button size="sm" onClick={onOpen}>
                  Apri il progetto
                </Button>
              </div>
            </div>
          </div>
        </HoverCard>
      )}
    </span>
  );
}
