import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { moveMilestone } from '../../domain/milestones';
import type { MilestoneChanges } from '../../domain/milestones';
import type { Milestone } from '../../domain/types';
import { useFormatDate } from '../../shared/dateFormat';
import { HoverCard, useHoverCard } from '../../shared/ui/HoverCard';
import { DragHint } from '../calendar/DragHint';
import { usePointerDrag } from '../calendar/usePointerDrag';
import { DiamondSymbol } from '../notes/noteSymbols';
import { milestoneElementId } from './MilestoneDiamond';
import type { MilestoneTools } from './MilestoneDiamond';
import { Markdown } from '../../shared/ui/Markdown';

/** The text of a note on the timeline, in the card that opens on it. */
function MilestoneDetails({
  milestone,
  projectTitle,
}: {
  milestone: Milestone;
  projectTitle: string | undefined;
}) {
  const formatDate = useFormatDate();
  return (
    <div className="space-y-1 text-sm">
      <p className="flex items-center gap-2 font-bold">
        <DiamondSymbol colorId={milestone.colorId} size={12} />
        <span className="min-w-0 break-words">{milestone.title}</span>
      </p>
      <p className="text-xs text-fg-muted">
        {formatDate(milestone.date)}
        {projectTitle ? ` · ${projectTitle}` : ' · nessun progetto'}
        {milestone.remind ? ' · con avviso' : ''}
      </p>
      {milestone.body && <Markdown text={milestone.body} />}
    </div>
  );
}

interface MilestoneToolsOptions {
  dayWidth: number;
  onOpen: (milestone: Milestone) => void;
  onChange: (milestoneId: string, changes: MilestoneChanges) => void;
  /** The title of a project, for the name of a note of a project. */
  projectTitleOf: (projectId: string) => string | undefined;
}

/**
 * What every diamond of the timeline shares, on the row of the notes and on the rows of the
 * projects: the drag by the day, the card with the text, the keyboard commands with their
 * announcement. `overlays` go anywhere in the tree: the help text, the status, the card, the hint.
 */
export function useMilestoneTools({
  dayWidth,
  onOpen,
  onChange,
  projectTitleOf,
}: MilestoneToolsOptions): { tools: MilestoneTools; overlays: ReactNode } {
  const formatDate = useFormatDate();
  const helpId = useId();
  const [announcement, setAnnouncement] = useState('');
  const card = useHoverCard<Milestone>();
  const drag = usePointerDrag<{ milestone: Milestone; days: number }>(
    (current, delta) => {
      const days = Math.round(delta.x / dayWidth);
      return days === current.days ? current : { ...current, days };
    },
    (done) => {
      if (done.days === 0) return;
      onChange(done.milestone.id, { date: moveMilestone(done.milestone, done.days).date });
    },
  );
  const dragged = drag.drag ? moveMilestone(drag.drag.milestone, drag.drag.days) : null;

  const tools: MilestoneTools = {
    dragged,
    startDrag: (event, milestone) => {
      if (drag.start(event, { milestone, days: 0 })) event.stopPropagation();
    },
    ignoreClick: drag.isClickAfterDrag,
    hover: (milestone) => {
      const { onPointerEnter, onPointerLeave, onFocus, onBlur } = card.triggerProps(milestone);
      return { onPointerEnter, onPointerLeave, onFocus, onBlur };
    },
    helpId,
    onOpen,
    onChange: (milestoneId, changes) => {
      onChange(milestoneId, changes);
      if (changes.date) {
        setAnnouncement(`Nota sulla timeline il ${formatDate(changes.date)}`);
        window.requestAnimationFrame(() =>
          document.getElementById(milestoneElementId(milestoneId))?.focus(),
        );
      }
    },
    projectTitleOf,
  };

  const overlays = (
    <>
      <p id={helpId} className="sr-only">
        Frecce sinistra e destra spostano la nota di un giorno; con Maiusc di una settimana. Invio
        la apre.
      </p>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {dragged && (
        <DragHint>
          Nota il <strong>{formatDate(dragged.date)}</strong>
        </DragHint>
      )}
      {card.card && (
        <HoverCard
          anchor={card.card.anchor}
          cardRef={card.cardProps.cardRef}
          onPointerEnter={card.cardProps.onPointerEnter}
          onPointerLeave={card.cardProps.onPointerLeave}
        >
          <MilestoneDetails
            milestone={card.card.item}
            projectTitle={
              card.card.item.projectId ? projectTitleOf(card.card.item.projectId) : undefined
            }
          />
        </HoverCard>
      )}
    </>
  );

  return { tools, overlays };
}
