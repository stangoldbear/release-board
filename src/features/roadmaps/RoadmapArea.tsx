import { useMemo, useState } from 'react';
import { CalendarCheck, Check, Plus } from 'lucide-react';
import { PROJECT_STATUSES } from '../../domain/projects';
import type { ProjectChanges, ProjectContent } from '../../domain/projects';
import type { Project } from '../../domain/types';
import { oneOf, usePreference } from '../../infra/preferences';
import { Area } from '../../shared/ui/Area';
import { Button } from '../../shared/ui/Button';
import { RulesNotice } from '../../shared/ui/RulesNotice';
import { SEGMENT, SEGMENTED, SEGMENT_OFF, SEGMENT_ON } from '../../shared/ui/segmented';
import type { TextScale } from '../../shared/ui/textScale';
import { ToggleChip } from '../../shared/ui/ToggleChip';
import { ProjectDialog } from './ProjectDialog';
import {
  PROJECT_DETAILS,
  PROJECT_STATUS_ICONS,
  PROJECT_STATUS_PLURALS,
  readProjectDetails,
} from './projectUi';
import type { ProjectDetail } from './projectUi';
import {
  ROADMAP_ZOOMS,
  ROADMAP_ZOOM_LABELS,
  newProjectPeriod,
  roadmapColumns,
  roadmapRange,
} from './roadmapLayout';
import type { RoadmapColumn } from './roadmapLayout';
import { RoadmapTimeline } from './RoadmapTimeline';

/** The button that adds a project, where the focus goes when one is deleted. */
export const NEW_PROJECT_ID = 'new-project';

interface RoadmapAreaProps {
  /** The element id of the area. */
  id: string;
  /** Every project of the plan. */
  projects: Project[];
  /** The projects to show: all of them, or those the search finds. */
  shown: Project[];
  searching: boolean;
  /** The published security rules do not know projects yet: the area says so, and no more. */
  unavailable?: boolean;
  today: string;
  textScale: TextScale;
  compact: boolean;
  onCreate: (content: ProjectContent) => void;
  onUpdate: (projectId: string, changes: ProjectChanges) => void;
  /** Saves what the window edited: only the fields that changed. */
  onSave: (project: Project, content: ProjectContent) => void;
  onDelete: (project: Project) => void;
}

/** The window open on a project, or on a new one with its period. */
type OpenProject =
  | { project: Project; period: { startDate: string; endDate: string } }
  | { project: null; period: { startDate: string; endDate: string } };

/** How many projects there are in each state, with its shape, and what the search finds. */
function ProjectSummary({ projects, found }: { projects: Project[]; found: number | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-2.5 text-xs">
      <ul aria-label="Progetti per stato" className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <li className="font-semibold">
          Progetti: <strong>{projects.length}</strong>
        </li>
        {PROJECT_STATUSES.map((status) => {
          const Icon = PROJECT_STATUS_ICONS[status];
          const count = projects.filter((project) => project.status === status).length;
          return (
            <li key={status} className="flex items-center gap-1.5 text-fg-muted">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {PROJECT_STATUS_PLURALS[status]}: <strong className="text-fg">{count}</strong>
            </li>
          );
        })}
      </ul>
      {/* Not announced: the bar of the search already says how many projects it finds. */}
      <p className="text-fg-muted">
        {found !== null && (
          <>
            Trovati <strong className="text-fg">{found}</strong> su {projects.length}
          </>
        )}
      </p>
    </div>
  );
}

/**
 * The roadmap of the projects, past, current and to come, on a timeline of its own: its scale and
 * Today on the line of the title, then one card with the projects by state, the rows and the
 * details to show beside each title.
 */
export function RoadmapArea({
  id,
  projects,
  shown,
  searching,
  unavailable = false,
  today,
  textScale,
  compact,
  onCreate,
  onUpdate,
  onSave,
  onDelete,
}: RoadmapAreaProps) {
  const [zoom, setZoom] = usePreference('roadmap-zoom', oneOf(ROADMAP_ZOOMS), 'quarters');
  const [details, setDetails] = usePreference<ProjectDetail[]>(
    'roadmap-details',
    readProjectDetails,
    [],
  );
  const [todayRequest, setTodayRequest] = useState(0);
  const [open, setOpen] = useState<OpenProject | null>(null);
  const range = useMemo(() => roadmapRange(projects, today, zoom), [projects, today, zoom]);
  const columns = useMemo(() => roadmapColumns(range, zoom, today), [range, zoom, today]);

  const openNew = (column?: RoadmapColumn) =>
    setOpen({ project: null, period: newProjectPeriod(today, column) });
  const toggleDetail = (detail: ProjectDetail) =>
    setDetails((current) =>
      current.includes(detail) ? current.filter((item) => item !== detail) : [...current, detail],
    );
  const allDetails = PROJECT_DETAILS.map((detail) => detail.id);

  if (unavailable) {
    return (
      <Area id={id} title="Roadmaps">
        <RulesNotice what="I progetti" />
      </Area>
    );
  }

  return (
    <Area
      id={id}
      title="Roadmaps"
      actions={
        <>
          <div role="group" aria-label="Scala della roadmap" className={SEGMENTED}>
            {ROADMAP_ZOOMS.map((option) => (
              <button
                key={option}
                type="button"
                title={ROADMAP_ZOOM_LABELS[option].title}
                aria-pressed={zoom === option}
                onClick={() => setZoom(option)}
                className={`${SEGMENT} ${zoom === option ? SEGMENT_ON : SEGMENT_OFF}`}
              >
                {zoom === option && <Check className="h-3 w-3 shrink-0" aria-hidden="true" />}
                {ROADMAP_ZOOM_LABELS[option].label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => setTodayRequest((value) => value + 1)}
            aria-label="Oggi nella roadmap"
            title="Porta oggi in vista nella roadmap"
          >
            <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Oggi
          </Button>
          <div className="ml-auto">
            <Button id={NEW_PROJECT_ID} variant="primary" onClick={() => openNew()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuovo progetto
            </Button>
          </div>
        </>
      }
    >
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <ProjectSummary projects={projects} found={searching ? shown.length : null} />
        <p className="bg-surface-muted px-4 py-1.5 text-xs text-fg-muted">
          <span className="pointer-coarse:hidden">
            Trascina un progetto per spostarlo, dai bordi per cambiarne inizio e fine. Maiusc +
            rotellina scorre i mesi.
          </span>
          <span className="hidden pointer-coarse:inline">
            Tocca un progetto per modificarlo. Scorri con un dito per vedere gli altri mesi.
          </span>
        </p>
        <RoadmapTimeline
          projects={shown}
          range={range}
          columns={columns}
          zoom={zoom}
          today={today}
          todayRequest={todayRequest}
          details={details}
          searching={searching}
          textScale={textScale}
          compact={compact}
          onOpen={(project) => setOpen({ project, period: project })}
          onAddAt={openNew}
          onChange={onUpdate}
        />
        <div
          role="group"
          aria-labelledby={`${id}-details`}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-surface px-4 py-2.5"
        >
          <span id={`${id}-details`} className="text-xs font-bold tracking-wide uppercase">
            Informazioni visibili
          </span>
          {PROJECT_DETAILS.map((detail) => (
            <ToggleChip
              key={detail.id}
              pressed={details.includes(detail.id)}
              onClick={() => toggleDetail(detail.id)}
            >
              {detail.label}
            </ToggleChip>
          ))}
          <button
            type="button"
            onClick={() => setDetails(details.length > 0 ? [] : allDetails)}
            className="ml-1 cursor-pointer text-xs font-medium text-link hover:underline"
          >
            {details.length > 0 ? 'Solo il titolo' : 'Tutte le informazioni'}
          </button>
        </div>
      </div>

      {open && (
        <ProjectDialog
          project={open.project}
          period={open.period}
          gone={open.project !== null && !projects.some((item) => item.id === open.project?.id)}
          onSave={(content) => {
            if (open.project) onSave(open.project, content);
            else onCreate(content);
          }}
          onDelete={() => {
            if (open.project) onDelete(open.project);
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </Area>
  );
}
