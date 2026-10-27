import { Fragment, useId, useState } from 'react';
import { ChevronDown, ChevronRight, TriangleAlert } from 'lucide-react';
import type { AssignmentChanges } from '../../domain/assignments';
import { dayRuns, stackBars } from '../../domain/peopleWork';
import type { DateRange } from '../../domain/schedule';
import type { Assignment, Stakeholder } from '../../domain/types';
import { usePreference } from '../../infra/preferences';
import { useFormatDate } from '../../shared/dateFormat';
import { diffDays } from '../../utils/dateUtils';
import { DragHint } from '../calendar/DragHint';
import { LABEL_CELL } from '../calendar/timelineLayout';
import { formatManDays } from '../roadmaps/barRendering';
import type { WorkItem } from '../roadmaps/barRendering';
import { DaysEditor } from '../roadmaps/DaysEditor';
import type { RoadmapMetrics } from '../roadmaps/roadmapLayout';
import { RowCells } from '../roadmaps/RowCells';
import { draggedWork } from '../roadmaps/useWorkDrag';
import type { WorkChanges } from '../roadmaps/useWorkDrag';
import { ABSENCE_STRIPES, WorkBar } from '../roadmaps/WorkBar';
import type { TimelineGeometry } from '../timeline/TimelineFrame';
import type { PeopleWork, PersonRow, PersonWorkBar } from './usePeopleWork';
import { PERSON_ROW_ATTRIBUTE, usePersonWorkDrag } from './usePersonWorkDrag';
import { useWorkSplit, workSplitParts } from '../roadmaps/useWorkSplit';
import type { SplitChoice } from '../split/SplitDialog';

/** The element of the bar of an assignment in the part «Persone»: the roadmap has its own. */
export function personWorkBarId(assignmentId: string): string {
  return `person-work-${assignmentId}`;
}

/** Red stripes over the days a person has more than one project: a band at the top of the row. */
const SHARED_STRIPES = {
  backgroundImage:
    'repeating-linear-gradient(135deg, var(--color-danger) 0 4px, transparent 4px 7px)',
};

const ROW_STYLE = { gridTemplateColumns: 'var(--gantt-label-width) auto' };
/** The least width of the field that types the days of a bar. */
const EDITOR_MIN_WIDTH = 88;

function parseTeamIds(value: unknown): string[] | null {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').slice(0, 200)
    : null;
}
const NO_TEAMS: string[] = [];
/** The key of a team in the list of the folded ones: the people without a team have one too. */
const teamKey = (teamId: string | undefined) => teamId ?? 'none';

interface PeopleSectionProps {
  geometry: TimelineGeometry;
  work: PeopleWork;
  /** Every assignment, to open the one of a bar. */
  assignments: readonly Assignment[];
  metrics: RoadmapMetrics;
  onOpenAssignment: (assignment: Assignment) => void;
  onDuplicateAssignment: (assignmentId: string) => void;
  onSplitAssignment: (assignmentId: string, choice: SplitChoice) => void;
  onChangeAssignment: (assignmentId: string, changes: AssignmentChanges) => void;
  onOpenStakeholder: (stakeholder: Stakeholder) => void;
}

/**
 * The part «Persone» of the timeline: a row for each person, by team, with a bar for the work on
 * each project in the color of the project, its title and its days on it. Bars that share days go
 * on lines of their own, and a red band marks the days with more than one project at a time. A bar
 * moves as in the roadmap, and over another row, or with Alt and the arrows up and down, its work
 * passes to that person; every view of the plan follows.
 */
export function PeopleSection({
  geometry,
  work,
  assignments,
  metrics,
  onOpenAssignment,
  onDuplicateAssignment,
  onSplitAssignment,
  onChangeAssignment,
  onOpenStakeholder,
}: PeopleSectionProps) {
  const workSplit = useWorkSplit((item, choice) => onSplitAssignment(item.id, choice));
  const formatDate = useFormatDate();
  const { range, dayWidth, columns, totalWidth, todayOffset } = geometry;
  const lineHeight = metrics.labeledRowHeight;
  const editorHeight = Math.max(lineHeight, metrics.lineHeight + 4);
  const helpId = useId();
  const [folded, setFolded] = usePreference<string[]>(
    'people-folded-teams',
    parseTeamIds,
    NO_TEAMS,
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const people = work.teams.flatMap((team) => team.people);
  const nameOf = (personId: string) =>
    people.find((row) => row.person.id === personId)?.person.name ?? '';

  const refocus = (assignmentId: string) =>
    window.requestAnimationFrame(() =>
      document.getElementById(personWorkBarId(assignmentId))?.focus(),
    );
  /** The team of the person the work goes to opens, so that the bar stays in view. */
  const unfold = (personId: string) => {
    const team = work.teams.find((item) => item.people.some((row) => row.person.id === personId));
    const key = teamKey(team?.team?.id);
    if (folded.includes(key)) setFolded(folded.filter((item) => item !== key));
  };
  const change = (bar: PersonWorkBar, changes: AssignmentChanges) => {
    onChangeAssignment(bar.item.id, changes);
    const title = `«${bar.project.title}»`;
    if (changes.stakeholderId) {
      unfold(changes.stakeholderId);
      setAnnouncement(`${title} passa a ${nameOf(changes.stakeholderId)}`);
    } else if (changes.startDate) {
      setAnnouncement(`${title}, ${bar.item.name}: dal ${formatDate(changes.startDate)}`);
    } else if (changes.manDays) {
      setAnnouncement(`${title}, ${bar.item.name}: ${formatManDays(changes.manDays)}`);
    }
    refocus(bar.item.id);
  };
  const barOf = (item: WorkItem) =>
    people.flatMap((row) => row.bars).find((bar) => bar.item.id === item.id);
  const drag = usePersonWorkDrag(dayWidth, (item, changes) => {
    const bar = barOf(item);
    if (bar) change(bar, changes);
  });
  const reassign = (bar: PersonWorkBar, step: -1 | 1) => {
    const at = people.findIndex((row) => row.person.id === bar.item.stakeholder?.id);
    const next = people[at + step];
    if (!next) {
      setAnnouncement(step < 0 ? 'È già la prima persona' : 'È già l’ultima persona');
      return;
    }
    change(bar, { stakeholderId: next.person.id });
  };
  const open = (bar: PersonWorkBar) => {
    const assignment = assignments.find((item) => item.id === bar.item.id);
    if (assignment) onOpenAssignment(assignment);
  };
  const toggleTeam = (key: string) =>
    setFolded(folded.includes(key) ? folded.filter((item) => item !== key) : [...folded, key]);

  /** A range of days as the left edge and the width of what covers it, cut to the days held. */
  const place = ({ start, end }: DateRange) => {
    if (end < range.start || start > range.end) return null;
    const first = Math.max(0, diffDays(range.start, start));
    const last = Math.min(diffDays(range.start, range.end), diffDays(range.start, end));
    return { left: first * dayWidth, width: (last - first + 1) * dayWidth };
  };
  const todayLine = todayOffset !== null && (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-link"
      style={{ left: todayOffset }}
    />
  );
  const draggingTo = drag.drag && drag.drag.personId !== drag.drag.item.stakeholder?.id;

  const personRow = ({ person, bars, shared, sharedAhead }: PersonRow) => {
    const { placed, lines } = stackBars(bars);
    const height = lines * lineHeight;
    const target = draggingTo && drag.drag?.personId === person.id;
    const absences = person.absences
      .map((absence) => ({ absence, at: place(absence) }))
      .filter((entry) => entry.at !== null);
    const details = [
      bars.length === 0 ? 'nessun progetto' : null,
      sharedAhead > 0
        ? `${sharedAhead} ${sharedAhead === 1 ? 'giorno' : 'giorni'} con più progetti insieme, da oggi`
        : null,
    ].filter(Boolean);
    return (
      <div key={person.id} className="grid" style={ROW_STYLE}>
        <div
          {...{ [PERSON_ROW_ATTRIBUTE]: person.id }}
          className={`${LABEL_CELL} flex items-center gap-1.5 border-t border-line/60 py-0! text-xs ${
            target ? 'bg-accent-soft' : 'bg-surface-muted'
          }`}
          style={{ gridColumn: 1, gridRow: 1, minHeight: height }}
        >
          <button
            type="button"
            onClick={() => onOpenStakeholder(person)}
            title="Modifica la persona: nome, team, info e assenze"
            className="min-w-0 cursor-pointer truncate text-left font-semibold hover:underline"
          >
            {person.name}
            {details.length > 0 && <span className="sr-only">: {details.join(', ')}</span>}
          </button>
          {sharedAhead > 0 && (
            <span
              aria-hidden="true"
              title={`${sharedAhead} ${sharedAhead === 1 ? 'giorno' : 'giorni'} con più progetti insieme, da oggi`}
              className="ml-auto flex shrink-0 items-center gap-0.5 font-semibold text-danger tabular-nums"
            >
              <TriangleAlert className="h-3.5 w-3.5" />
              {sharedAhead} gg
            </span>
          )}
        </div>
        <div
          {...{ [PERSON_ROW_ATTRIBUTE]: person.id }}
          className="relative flex border-t border-line/60"
          style={{ gridColumn: 2, gridRow: 1, height }}
        >
          <RowCells columns={columns} />
          {/* The row the work would pass to, over its days. */}
          {target && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-30 ring-2 ring-accent ring-inset"
            />
          )}
          {absences.map(({ absence, at }) => (
            <span
              key={absence.start}
              title={`Assente dal ${formatDate(absence.start)} al ${formatDate(absence.end)}`}
              className="absolute inset-y-0 opacity-40"
              style={{ ...ABSENCE_STRIPES, left: at!.left, width: at!.width }}
            />
          ))}
          {dayRuns(shared).map((run) => {
            const at = place(run);
            return (
              at && (
                <span
                  key={run.start}
                  aria-hidden="true"
                  title="Più progetti insieme"
                  className="absolute top-0 z-20 h-1"
                  style={{ ...SHARED_STRIPES, left: at.left, width: at.width }}
                />
              )
            );
          })}
          {todayLine}
          {placed.map(({ bar, line }) => {
            const dragged = drag.drag?.item.id === bar.item.id;
            const moving = dragged && drag.drag ? draggedWork(drag.drag) : bar.item;
            return (
              <div
                key={bar.item.id}
                className="pointer-events-none absolute inset-x-0"
                style={{ top: line * lineHeight, height: lineHeight }}
              >
                <WorkBar
                  item={moving}
                  range={range}
                  dayWidth={dayWidth}
                  height={lineHeight}
                  barHeight={metrics.labeledBarHeight}
                  labeled
                  dragging={dragged}
                  describedBy={helpId}
                  ignoreClick={drag.isClickAfterDrag}
                  onPointerDown={(event, kind) => drag.startDrag(event, bar.item, kind)}
                  onOpen={() => open(bar)}
                  onDuplicate={() => onDuplicateAssignment(bar.item.id)}
                  onSplit={
                    workSplitParts(bar.item) >= 2
                      ? () => workSplit.open(bar.item, bar.project.title)
                      : undefined
                  }
                  onEditDays={() => setEditing(bar.item.id)}
                  onChange={(changes: WorkChanges) => change(bar, changes)}
                  elementId={personWorkBarId(bar.item.id)}
                  name={bar.project.title}
                  ariaName={`${bar.project.title}, ${person.name}`}
                  colorId={bar.colorId}
                  onReassign={(step) => reassign(bar, step)}
                />
                {editing === bar.item.id && (
                  <DaysEditor
                    value={bar.item.manDays}
                    label={`Giorni uomo di ${person.name} su ${bar.project.title}`}
                    style={{
                      left:
                        Math.max(0, diffDays(range.start, bar.item.schedule.start)) * dayWidth + 1,
                      top: (lineHeight - editorHeight) / 2,
                      height: editorHeight,
                      minWidth: EDITOR_MIN_WIDTH,
                    }}
                    onSave={(manDays) => {
                      setEditing(null);
                      change(bar, { manDays });
                    }}
                    onCancel={() => {
                      setEditing(null);
                      refocus(bar.item.id);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {workSplit.dialog}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <p id={helpId} className="sr-only">
        Frecce sinistra e destra spostano l&apos;inizio del lavoro di un giorno, con Maiusc di una
        settimana; Alt e le frecce su e giù lo passano alla persona sopra o sotto. Invio apre il
        lavoro; un doppio clic scrive i giorni uomo.
      </p>
      {work.teams.map(({ team, people: rows }) => {
        const key = teamKey(team?.id);
        const isFolded = folded.includes(key);
        const rowsId = `people-team-${key}`;
        return (
          <Fragment key={key}>
            <div className="grid border-t border-line-strong bg-surface-strong" style={ROW_STYLE}>
              <div
                className={`${LABEL_CELL} flex items-center bg-surface-strong py-0!`}
                style={{ gridColumn: 1, gridRow: 1, minHeight: metrics.assignmentHeight }}
              >
                <h4 className="min-w-0 flex-1 text-xs">
                  <button
                    type="button"
                    aria-expanded={!isFolded}
                    aria-controls={rowsId}
                    onClick={() => toggleTeam(key)}
                    className="flex w-full min-w-0 cursor-pointer items-center gap-1.5 text-left"
                  >
                    {isFolded ? (
                      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-line-strong"
                      style={{
                        backgroundColor: team
                          ? `var(--rb-task-${team.colorId}-border)`
                          : 'var(--color-surface)',
                      }}
                    />
                    <span className="truncate font-semibold">{team?.name ?? 'Senza team'}</span>
                    <span className="shrink-0 text-fg-muted">
                      {rows.length} {rows.length === 1 ? 'persona' : 'persone'}
                    </span>
                  </button>
                </h4>
              </div>
              <div className="relative" style={{ gridColumn: 2, gridRow: 1, width: totalWidth }}>
                {todayLine}
              </div>
            </div>
            <div id={rowsId}>{!isFolded && rows.map(personRow)}</div>
          </Fragment>
        );
      })}

      {drag.drag && (
        <DragHint>
          {draggingTo ? (
            <>
              Passa a <strong>{nameOf(drag.drag.personId)}</strong>
              {drag.drag.days !== 0 && (
                <>
                  , dal <strong>{formatDate(draggedWork(drag.drag).startDate)}</strong>
                </>
              )}
            </>
          ) : drag.drag.kind === 'move' ? (
            <>
              Inizio del lavoro <strong>{formatDate(draggedWork(drag.drag).startDate)}</strong>
            </>
          ) : (
            <>
              Giorni uomo{' '}
              <strong className="tabular-nums">
                {formatManDays(draggedWork(drag.drag).manDays)}
              </strong>
            </>
          )}
        </DragHint>
      )}
    </>
  );
}
