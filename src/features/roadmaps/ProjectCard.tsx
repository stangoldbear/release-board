import { CalendarRange, Clock, Flag, UserRound } from 'lucide-react';
import { projectLabels } from '../../domain/labels';
import type { ProjectWithEnd } from '../../domain/projects';
import type { ProjectSpan } from '../../domain/projectSpan';
import type { StatusChange } from '../../domain/projectStatus';
import { PROJECT_STATUS_LABELS } from '../../domain/projects';
import { coloredValueOf, projectColorOf } from '../../domain/roadmapConfig';
import type { ProjectField, RoadmapConfig } from '../../domain/types';
import { useFormatDate } from '../../shared/dateFormat';
import { taskColorStyle } from '../../themes';
import { clampLines } from '../calendar/timelineLayout';
import { formatManDays } from './barRendering';
import type { WorkItem } from './barRendering';
import { FieldTag, FieldValues } from './fieldUi';
import { ProjectStatusMark } from './projectUi';

interface ProjectCardProps {
  project: ProjectWithEnd & { statusChange?: StatusChange };
  span: ProjectSpan;
  /** The bars of the work, in the order of the teams. */
  work: WorkItem[];
  config: RoadmapConfig;
  /** The field whose value tags the project beside its title. */
  tagField: ProjectField | null;
}

/** A line of the card: an icon, a name, a value. */
function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarRange;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
      <div className="min-w-0">
        <span className="block text-xs text-fg-muted">{label}</span>
        <span className="block text-xs font-semibold break-words">{children}</span>
      </div>
    </div>
  );
}

/**
 * Everything the column of the names no longer shows of a project, laid out in full: the tab and
 * the title with the state, the period with its days, the owner, the deadline, the
 * description, the main fields with their links, and the people at work with their days.
 */
export function ProjectCard({ project, span, work, config, tagField }: ProjectCardProps) {
  const formatDate = useFormatDate();
  const colorId = projectColorOf(project, config);
  const sizeValue = tagField ? coloredValueOf(project, tagField) : null;
  // The main fields, but the one of the tab, which the header says.
  const mainFields = config.fields.filter((field) => field.main && field.id !== tagField?.id);
  const labels = projectLabels(project, config);
  return (
    <div className="space-y-2.5 text-sm">
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          style={taskColorStyle(colorId)}
          className="mt-0.5 block h-4 w-2 shrink-0 rounded-xs border"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold break-words">{project.title}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
            <ProjectStatusMark status={project.status} />
            {project.statusChange && (
              <span>
                (era {PROJECT_STATUS_LABELS[project.statusChange.from].toLowerCase()}, da
                confermare)
              </span>
            )}
            {sizeValue && tagField && (
              <span>
                {tagField.label}: {sizeValue.label}
              </span>
            )}
          </p>
        </div>
      </div>

      {labels.length > 0 && (
        <ul aria-label="Etichette" className="flex flex-wrap gap-1">
          {labels.map((label) => (
            <li key={label.id} className="flex min-w-0">
              <FieldTag colorId={label.colorId}>{label.label}</FieldTag>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Fact icon={CalendarRange} label="Periodo">
          {formatDate(project.startDate)} → {formatDate(project.endDate)}
        </Fact>
        <Fact icon={Clock} label="Giorni uomo">
          {span.totalManDays > 0 ? formatManDays(span.totalManDays) : '—'}
        </Fact>
        {project.owner && (
          <Fact icon={UserRound} label="Responsabile">
            {project.owner}
          </Fact>
        )}
        {project.deadline && (
          <Fact icon={Flag} label="Deadline">
            {formatDate(project.deadline)}
            {span.late && <span className="text-danger"> · superata</span>}
          </Fact>
        )}
      </div>

      {project.description && (
        <p
          style={clampLines(6)}
          className="text-xs break-words whitespace-pre-line text-fg-muted"
          title={project.description}
        >
          {project.description}
        </p>
      )}

      {mainFields.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-line pt-2">
          {mainFields.map((field) => (
            <FieldValues key={field.id} project={project} field={field} />
          ))}
        </div>
      )}

      {work.length > 0 && (
        <ul aria-label="Team" className="flex flex-col gap-0.5 border-t border-line pt-2 text-xs">
          {work.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full border border-line-strong"
                style={{
                  backgroundColor: item.colorId
                    ? `var(--rb-task-${item.colorId}-border)`
                    : 'var(--color-surface-strong)',
                }}
              />
              <span className="min-w-0 flex-1 truncate">
                {item.name}
                {item.tag && <span className="text-fg-muted"> {item.tag}</span>}
              </span>
              <span className="shrink-0 tabular-nums">{formatManDays(item.manDays)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
