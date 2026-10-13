import { Fragment, useId, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { assignmentsOfProject } from '../../domain/assignments';
import type { AssignmentChanges } from '../../domain/assignments';
import { applyChanges } from '../../domain/changes';
import { milestonesOfProject } from '../../domain/milestones';
import { followerOf } from '../../domain/projectOrder';
import type { ProjectChanges, ProjectWithEnd } from '../../domain/projects';
import { projectSpan } from '../../domain/projectSpan';
import type { ProjectSpan } from '../../domain/projectSpan';
import type { ProjectOfDay } from '../../domain/projectStatus';
import { groupProjects, projectColorField } from '../../domain/roadmapConfig';
import type {
  Assignment,
  FieldOption,
  Milestone,
  Project,
  ProjectField,
  RoadmapConfig,
  Stakeholder,
} from '../../domain/types';
import { useFormatDate } from '../../shared/dateFormat';
import { FloatingPanel } from '../../shared/ui/FloatingPanel';
import { useListDrag } from '../../shared/useListDrag';
import { useStableCallback } from '../../shared/useStableCallback';
import { DragHint } from '../calendar/DragHint';
import { LABEL_CELL } from '../calendar/timelineLayout';
import type { TimelineGeometry } from '../timeline/TimelineFrame';
import { formatManDays, workItemsOf } from './barRendering';
import type { WorkItem } from './barRendering';
import { FieldTag } from './fieldUi';
import type { MilestoneTools } from './MilestoneDiamond';
import { projectBarId } from './ProjectBar';
import { ProjectCard } from './ProjectCard';
import { ProjectRow } from './ProjectRow';
import type { Editing } from './ProjectRow';
import type { DetailLevel } from './projectUi';
import type { RoadmapMetrics } from './roadmapLayout';
import { RowCells } from './RowCells';
import { useProjectDrag } from './useProjectDrag';
import { draggedWork, useWorkDrag } from './useWorkDrag';
import type { WorkChanges } from './useWorkDrag';
import { workBarId } from './WorkBar';

export interface ProjectsSectionProps {
  geometry: TimelineGeometry;
  /** The projects to show, one per row, in the order of the rows, each as the day has it. */
  projects: ProjectOfDay<ProjectWithEnd>[];
  /** Where each project falls: the work of its team, its days, its gaps. */
  spans: ReadonlyMap<string, ProjectSpan>;
  /** How much each row shows under the title of its project, unless the project has a choice of its own. */
  level: DetailLevel;
  levelOf: (projectId: string) => DetailLevel;
  /** The published rules know the assignments: the Team level can be chosen. */
  teamLevelAvailable: boolean;
  /** The custom fields, the teams and the people, to show the main fields and the assignments. */
  config: RoadmapConfig;
  assignments: Assignment[];
  /** While searching, the rows are those found, and no row adds a project. */
  searching: boolean;
  /** A field that groups: the projects with the same value go together, under its tag. */
  groupBy: ProjectField | null;
  metrics: RoadmapMetrics;
  onOpen: (project: Project) => void;
  /** Adds a project from the days in view, as the button above the timeline does. */
  onAdd: () => void;
  /** Adds a project from a day. */
  onAddAt: (date: string) => void;
  onChange: (projectId: string, changes: ProjectChanges) => void;
  /** Moves a project by some days with the work of its team. */
  onMove: (projectId: string, days: number) => void;
  onOpenAssignment: (assignment: Assignment) => void;
  onAddAssignment: (project: Project) => void;
  onChangeAssignment: (assignmentId: string, changes: AssignmentChanges) => void;
  onOpenStakeholder: (stakeholder: Stakeholder) => void;
  /** The rows of one project, or null to follow the timeline again. */
  onSetProjectLevel: (projectId: string, level: DetailLevel | null) => void;
  /** Puts a project right before another in the order of the members, or last with null. */
  onReorder: (projectId: string, beforeId: string | null) => void;
  /** The notes on the timeline to show, those of the projects among them. */
  milestones: Milestone[];
  /** What every diamond shares: the drag, the card and the commands. */
  milestoneTools: MilestoneTools;
  /** Adds a note of a project on a day, with a click on it; absent while searching. */
  onAddMilestone?: (date: string, projectId: string) => void;
}

/** The type of the rows dragged in the column of the projects: nothing else lands among them. */
const PROJECT_DRAG_TYPE = 'application/x-release-board-project';

/**
 * The row above a group of projects: the value they share, as its tag, and how many they are. A
 * heading, so that a screen reader can move from group to group.
 */
function GroupHeader({
  field,
  option,
  count,
  width,
  todayOffset,
  minHeight,
}: {
  field: ProjectField;
  option: FieldOption | null;
  count: number;
  width: number;
  todayOffset: number | null;
  minHeight: number;
}) {
  return (
    <div
      className="grid border-b border-line-strong bg-surface-strong"
      style={{ gridTemplateColumns: 'var(--gantt-label-width) auto' }}
    >
      <div
        className={`${LABEL_CELL} flex items-center bg-surface-strong`}
        style={{ gridColumn: 1, gridRow: 1, minHeight }}
      >
        <h4 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="sr-only">{field.label}:</span>
          {option ? (
            <FieldTag colorId={option.colorId}>{option.label}</FieldTag>
          ) : (
            <span className="font-semibold">Senza valore</span>
          )}
          <span className="text-fg-muted">
            {count} {count === 1 ? 'progetto' : 'progetti'}
          </span>
        </h4>
      </div>
      <div className="relative" style={{ gridColumn: 2, gridRow: 1, width }}>
        {todayOffset !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-link"
            style={{ left: todayOffset }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The projects of the roadmap, a row each, past, current or to come, with a bar from its start to
 * its end, and at the "Team" level a row for each bar of the work; the last row adds a project
 * with a click on a day. The section keeps its drags to itself: a drag redraws only its rows.
 */
export function ProjectsSection({
  geometry,
  projects,
  spans,
  level,
  levelOf,
  teamLevelAvailable,
  config,
  assignments,
  searching,
  groupBy,
  metrics,
  onOpen,
  onAdd,
  onAddAt,
  onChange,
  onMove,
  onOpenAssignment,
  onAddAssignment,
  onChangeAssignment,
  onOpenStakeholder,
  onSetProjectLevel,
  onReorder,
  milestones,
  milestoneTools,
  onAddMilestone,
}: ProjectsSectionProps) {
  const formatDate = useFormatDate();
  const { range, dayWidth, today, columns, totalWidth, todayOffset } = geometry;
  const { barHeight, assignmentHeight, rowPadding } = metrics;
  const helpId = useId();
  const workHelpId = useId();
  const { drag, startDrag, isClickAfterDrag } = useProjectDrag(dayWidth, onMove);
  // A bar of work changed by hand: an assignment goes to its own document, the contingency lives
  // on the project, and a start moved by hand makes the arrangement manual.
  const changeWork = (item: WorkItem, changes: WorkChanges) => {
    if (item.kind === 'assignment') {
      onChangeAssignment(item.id, changes);
      return;
    }
    const contingency = {
      startDate: changes.startDate ?? item.startDate,
      manDays: changes.manDays ?? item.manDays,
    };
    onChange(
      item.projectId,
      changes.startDate ? { contingency, arrangement: 'manual' } : { contingency },
    );
  };
  const workDrag = useWorkDrag(dayWidth, changeWork);
  const [editing, setEditing] = useState<Editing | null>(null);
  const spanOf = (project: ProjectWithEnd): ProjectSpan =>
    spans.get(project.id) ?? projectSpan(project, assignments, config);
  const workOf = useMemo(
    () =>
      new Map(
        projects.map((project) => [
          project.id,
          workItemsOf(
            project,
            spans.get(project.id) ?? projectSpan(project, assignments, config),
            config,
          ),
        ]),
      ),
    [projects, spans, assignments, config],
  );

  const addAt = useStableCallback(onAddAt);
  // The small window with everything about a project, from the button of its row: one for every
  // row, which stays where it was moved while it shows another project.
  const [info, setInfo] = useState<{
    projectId: string;
    anchor: HTMLElement;
    beside: HTMLElement;
  } | null>(null);
  const infoProject = info ? projects.find((project) => project.id === info.projectId) : undefined;
  const showInfo = (projectId: string, anchor: HTMLElement, beside: HTMLElement) =>
    setInfo((current) => (current?.projectId === projectId ? null : { projectId, anchor, beside }));
  // The field whose value tags every project, beside its title, whatever colors the bars.
  const tagField = projectColorField(config);
  // The rows follow the start of their projects: a move from the keyboard can change the row, and
  // the focus follows the bar there.
  const [announcement, setAnnouncement] = useState('');
  const refocus = (id: string) =>
    window.requestAnimationFrame(() => document.getElementById(id)?.focus());
  const changeByKey = (project: ProjectWithEnd, changes: ProjectChanges) => {
    onChange(project.id, changes);
    const after = applyChanges(project, changes);
    setAnnouncement(
      `«${project.title}» dal ${formatDate(after.startDate)} al ${formatDate(after.endDate ?? project.endDate)}`,
    );
    refocus(projectBarId(project.id));
  };
  const moveByKey = (project: ProjectWithEnd, days: number) => {
    onMove(project.id, days);
    setAnnouncement(
      `«${project.title}» spostato di ${Math.abs(days)} giorni ${days > 0 ? 'avanti' : 'indietro'}`,
    );
    refocus(projectBarId(project.id));
  };
  const changeWorkByKey = (item: WorkItem, changes: WorkChanges) => {
    changeWork(item, changes);
    if (changes.startDate) setAnnouncement(`${item.name} dal ${formatDate(changes.startDate)}`);
    if (changes.manDays) setAnnouncement(`${item.name}: ${formatManDays(changes.manDays)}`);
    refocus(workBarId(item));
  };

  const rowStyle = { gridTemplateColumns: 'var(--gantt-label-width) auto' };
  // Without a field to group by, one group of every project and no header.
  const groups = groupBy ? groupProjects(projects, groupBy) : [{ option: null, projects }];
  const listOf = (group: { option: FieldOption | null }) => group.option?.id ?? 'none';
  // A row dragged lands before the project at the slot of its group, or after the last one.
  const rowDrag = useListDrag(PROJECT_DRAG_TYPE, (projectId, list, index) => {
    const group = groups.find((item) => listOf(item) === list);
    if (group) onReorder(projectId, followerOf(group.projects, projectId, index));
  });
  const moveRowByKey = (project: ProjectWithEnd, delta: -1 | 1) => {
    const group = groups.find((item) => item.projects.some((p) => p.id === project.id));
    if (!group) return;
    const at = group.projects.findIndex((p) => p.id === project.id);
    if ((delta < 0 && at === 0) || (delta > 0 && at === group.projects.length - 1)) return;
    onReorder(project.id, followerOf(group.projects, project.id, delta > 0 ? at + 1 : at - 1));
    setAnnouncement(`«${project.title}» spostato ${delta > 0 ? 'giù' : 'su'} di una riga`);
    refocus(projectBarId(project.id));
  };
  const projectRowHeight = barHeight + rowPadding * 2;

  return (
    <>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <p id={helpId} className="sr-only">
        Frecce sinistra e destra spostano il progetto di una settimana, con il lavoro del suo team;
        con Alt, frecce su e giù lo spostano nell&apos;ordine delle righe. Invio lo apre.
      </p>
      <p id={workHelpId} className="sr-only">
        Frecce sinistra e destra spostano l&apos;inizio del lavoro di un giorno; con Maiusc di una
        settimana. Invio apre il lavoro; un doppio clic scrive i giorni uomo.
      </p>

      <div>
        {groups.map((group) => (
          <Fragment key={group.option?.id ?? 'none'}>
            {groupBy && (
              <GroupHeader
                field={groupBy}
                option={group.option}
                count={group.projects.length}
                width={totalWidth}
                todayOffset={todayOffset}
                minHeight={assignmentHeight + rowPadding * 2}
              />
            )}
            <div {...rowDrag.container}>
              {group.projects.map((project, index) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  today={today}
                  dragSource={rowDrag.source(project.id, listOf(group))}
                  dragTarget={rowDrag.target(
                    listOf(group),
                    group.projects.map((item) => item.id),
                    index,
                    'y',
                  )}
                  dropBefore={rowDrag.slot(listOf(group)) === index}
                  dropAfter={
                    index === group.projects.length - 1 &&
                    rowDrag.slot(listOf(group)) === group.projects.length
                  }
                  rowDragging={rowDrag.dragged === project.id}
                  onMoveRow={(delta) => moveRowByKey(project, delta)}
                  span={spanOf(project)}
                  work={workOf.get(project.id) ?? []}
                  assignments={assignmentsOfProject(assignments, project.id)}
                  level={levelOf(project.id)}
                  defaultLevel={level}
                  teamLevelAvailable={teamLevelAvailable}
                  columns={columns}
                  totalWidth={totalWidth}
                  todayOffset={todayOffset}
                  range={range}
                  dayWidth={dayWidth}
                  metrics={metrics}
                  searching={searching}
                  config={config}
                  tagField={tagField}
                  infoOpen={info?.projectId === project.id}
                  onShowInfo={(button, tools) => showInfo(project.id, button, tools)}
                  projectDrag={drag}
                  workDrag={workDrag.drag}
                  editing={editing}
                  helpId={helpId}
                  workHelpId={workHelpId}
                  ignoreProjectClick={isClickAfterDrag}
                  ignoreWorkClick={workDrag.isClickAfterDrag}
                  onStartProjectDrag={startDrag}
                  onStartWorkDrag={workDrag.startDrag}
                  onEdit={setEditing}
                  onOpen={() => onOpen(project)}
                  onChange={(changes) => changeByKey(project, changes)}
                  onMove={(days) => moveByKey(project, days)}
                  onChangeWork={changeWorkByKey}
                  onOpenAssignment={onOpenAssignment}
                  onAddAssignment={() => onAddAssignment(project)}
                  onOpenStakeholder={onOpenStakeholder}
                  onSetLevel={(next) => onSetProjectLevel(project.id, next)}
                  milestones={milestonesOfProject(milestones, project.id)}
                  milestoneTools={milestoneTools}
                  onAddMilestone={
                    onAddMilestone ? (date) => onAddMilestone(date, project.id) : undefined
                  }
                />
              ))}
            </div>
          </Fragment>
        ))}

        {searching ? (
          projects.length === 0 && (
            <p className="sticky left-0 w-fit px-4 py-3 text-xs text-fg-muted">
              Nessun progetto con questo testo.
            </p>
          )
        ) : (
          <div className="grid" style={rowStyle}>
            {/* The row that adds a project: a button in the column, a day to click beside it. */}
            <div
              className={`${LABEL_CELL} flex items-center bg-surface-muted`}
              style={{ gridColumn: 1, gridRow: 1, minHeight: projectRowHeight }}
            >
              <button
                type="button"
                onClick={onAdd}
                title="Crea un progetto da oggi, o dal mese in vista. Per partire da un altro giorno, clic su quel giorno in questa riga"
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong px-2 py-1.5 text-xs font-semibold text-link hover:border-link hover:bg-accent-soft"
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                Nuovo progetto
              </button>
            </div>
            <div className="relative flex" style={{ gridColumn: 2, gridRow: 1 }}>
              <RowCells columns={columns} onAdd={addAt} />
            </div>
          </div>
        )}
      </div>

      {info && infoProject && (
        <FloatingPanel
          title="Informazioni sul progetto"
          anchor={info.anchor}
          beside={info.beside}
          onClose={() => setInfo(null)}
        >
          <ProjectCard
            project={infoProject}
            span={spanOf(infoProject)}
            work={workOf.get(infoProject.id) ?? []}
            config={config}
            tagField={tagField}
          />
        </FloatingPanel>
      )}
      {drag && (
        <DragHint>
          Sposta{' '}
          <strong className="tabular-nums">
            {drag.days > 0 ? `+${drag.days}` : drag.days}{' '}
            {Math.abs(drag.days) === 1 ? 'giorno' : 'giorni'}
          </strong>
        </DragHint>
      )}
      {workDrag.drag && (
        <DragHint>
          {workDrag.drag.kind === 'move' ? (
            <>
              Inizio del lavoro <strong>{formatDate(draggedWork(workDrag.drag).startDate)}</strong>
            </>
          ) : (
            <>
              Giorni uomo{' '}
              <strong className="tabular-nums">
                {formatManDays(draggedWork(workDrag.drag).manDays)}
              </strong>
            </>
          )}
        </DragHint>
      )}
    </>
  );
}
