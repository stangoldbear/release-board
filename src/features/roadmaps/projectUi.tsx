import { CircleCheck, CircleDashed, CircleDot, CirclePause, Lightbulb } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PROJECT_STATUS_LABELS } from '../../domain/projects';
import type { ProjectStatus } from '../../domain/types';

/** A shape for each state, so that the color of a project is never the only cue. */
export const PROJECT_STATUS_ICONS: Record<ProjectStatus, LucideIcon> = {
  idea: Lightbulb,
  planned: CircleDashed,
  in_progress: CircleDot,
  completed: CircleCheck,
  on_hold: CirclePause,
};

/** Plural labels, agreeing with "progetti". */
export const PROJECT_STATUS_PLURALS: Record<ProjectStatus, string> = {
  idea: 'Idee',
  planned: 'Pianificati',
  in_progress: 'In corso',
  completed: 'Completati',
  on_hold: 'In pausa',
};

/** The state of a project: its shape and, unless `iconOnly`, its name. */
export function ProjectStatusMark({
  status,
  iconOnly = false,
}: {
  status: ProjectStatus;
  iconOnly?: boolean;
}) {
  const Icon = PROJECT_STATUS_ICONS[status];
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {!iconOnly && PROJECT_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * How much a row of the roadmap shows of its project: the title alone, the main information
 * (description, state, owner and the main custom fields), or those and the people who work on it.
 */
export type DetailLevel = 'titles' | 'main' | 'team';

export const DETAIL_LEVELS: readonly { id: DetailLevel; label: string; title: string }[] = [
  { id: 'titles', label: 'Solo titoli', title: 'Il titolo di ogni progetto, e nulla più' },
  {
    id: 'main',
    label: 'Info principali',
    title: 'Sotto il titolo: descrizione, stato, responsabile e i campi principali',
  },
  {
    id: 'team',
    label: 'Team',
    title: 'Le informazioni principali e una riga per ogni persona che lavora al progetto',
  },
];
