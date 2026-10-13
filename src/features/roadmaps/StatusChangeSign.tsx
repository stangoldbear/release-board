import { ArrowRight, TriangleAlert } from 'lucide-react';
import { PROJECT_STATUS_LABELS } from '../../domain/projects';
import type { ProjectWithEnd } from '../../domain/projects';
import type { StatusChange } from '../../domain/projectStatus';
import { useFormatDate } from '../../shared/dateFormat';
import { Button } from '../../shared/ui/Button';
import { Popover } from '../../shared/ui/Popover';
import { Tooltip } from '../../shared/ui/Tooltip';
import { ProjectStatusMark } from './projectUi';

interface StatusChangeSignProps {
  project: ProjectWithEnd;
  change: StatusChange;
  today: string;
  /** Pixels from the first day of the row to the middle of today. */
  left: number;
  /** Saves the state the dates give. */
  onConfirm: () => void;
  onOpen: () => void;
}

/**
 * The sign on the column of today of a project whose state the dates changed: a triangle, with
 * the change on its tip, that opens a panel saying what happened, from which state to which, and
 * why, with the buttons that confirm the new state or open the project.
 */
export function StatusChangeSign({
  project,
  change,
  today,
  left,
  onConfirm,
  onOpen,
}: StatusChangeSignProps) {
  const formatDate = useFormatDate();
  const from = PROJECT_STATUS_LABELS[change.from];
  const to = PROJECT_STATUS_LABELS[change.to];
  const why =
    change.to === 'completed'
      ? `Oggi, ${formatDate(today)}, è oltre la fine del progetto, ${formatDate(project.endDate)}.`
      : `Oggi, ${formatDate(today)}, è dentro il periodo del progetto, dal ${formatDate(project.startDate)} al ${formatDate(project.endDate)}.`;
  return (
    <span
      className="absolute top-0.5 z-20 -translate-x-1/2"
      style={{ left }}
      // The pointer must not start a drag of the row or of the bar under the sign.
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Tooltip text={`Stato cambiato dalle date: ${from} → ${to}. Apri per confermare`}>
        <Popover
          label={`Stato di «${project.title}» cambiato da ${from} a ${to}: conferma o apri`}
          variant="ghost"
          size="icon"
          align="start"
          className="pointer-events-auto rounded-full bg-surface p-px text-danger shadow-xs hover:bg-danger-soft"
          panelClassName="w-72"
          panel={
            <div className="space-y-2.5 text-sm">
              <p className="text-xs font-bold tracking-wide text-fg-muted uppercase">
                Stato cambiato dalle date
              </p>
              <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                <ProjectStatusMark status={change.from} />
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
                <ProjectStatusMark status={change.to} />
              </p>
              <p className="text-xs text-fg-muted">{why}</p>
              <p className="text-xs text-fg-muted">
                La timeline mostra già «{to}»; la conferma lo salva per tutti, con il tuo nome nella
                cronologia.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="primary" size="sm" onClick={onConfirm}>
                  Conferma «{to}»
                </Button>
                <Button size="sm" onClick={onOpen}>
                  Apri il progetto
                </Button>
              </div>
            </div>
          }
        >
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
        </Popover>
      </Tooltip>
    </span>
  );
}
