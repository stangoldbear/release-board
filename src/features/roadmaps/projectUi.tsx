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

/** What a row of the roadmap can show beside the title of its project. */
export type ProjectDetail = 'dates' | 'status' | 'owner' | 'description';

export const PROJECT_DETAILS: readonly { id: ProjectDetail; label: string }[] = [
  { id: 'dates', label: 'Date' },
  { id: 'status', label: 'Stato' },
  { id: 'owner', label: 'Responsabile' },
  { id: 'description', label: 'Descrizione' },
];

/** The details a browser chose to show; null when the saved value is not a list of them. */
export function readProjectDetails(value: unknown): ProjectDetail[] | null {
  if (!Array.isArray(value)) return null;
  const known = PROJECT_DETAILS.map((detail) => detail.id) as unknown[];
  return value.filter((item): item is ProjectDetail => known.includes(item));
}
