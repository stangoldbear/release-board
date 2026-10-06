import { Pencil, Plus, Upload } from 'lucide-react';
import type { TaskChanges } from '../../domain/plan';
import type { DateRange } from '../../domain/schedule';
import type { PlanSnapshot, TaskItem, TaskStatus } from '../../domain/types';
import { Area } from '../../shared/ui/Area';
import { Button } from '../../shared/ui/Button';
import type { TextScale } from '../../shared/ui/textScale';
import { TaskSummary } from '../tasks/TaskSummary';
import { CalendarNav } from './CalendarNav';
import type { CalendarAction, CalendarView } from './calendarView';
import { RowVisibilityBar } from './RowVisibilityBar';
import { Timeline } from './Timeline';
import type { CalendarDisplay, CalendarDisplayControls } from './useCalendarDisplay';
import { WeekBoard } from './WeekBoard';

/** The button that adds a task, where the focus goes when a task is deleted. */
export const NEW_TASK_ID = 'new-task';

interface ReleasesAreaProps {
  /** The element id of the area. */
  id: string;
  plan: PlanSnapshot;
  /** The tasks the search and the status keep. */
  tasks: TaskItem[];
  /** The days whose note the search finds; null while nothing is searched. */
  noteMatches: Set<string> | null;
  status: TaskStatus | null;
  onStatusChange: (status: TaskStatus | null) => void;
  view: CalendarView;
  onViewAction: (action: CalendarAction) => void;
  /** The days the timeline holds, without the past when it is hidden. */
  timelineRange: DateRange;
  /** The week of the board. */
  week: DateRange;
  display: CalendarDisplay;
  displayControls: CalendarDisplayControls;
  textScale: TextScale;
  compact: boolean;
  onNewTask: () => void;
  onOpenTask: (task: TaskItem) => void;
  onChangeTask: (taskId: string, changes: TaskChanges) => void;
  onDuplicateTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskAt: (date: string, laneId: string) => void;
  onSaveNote: (date: string, text: string) => void;
  onMoveNote: (from: string, to: string, text?: string) => void;
  onEditMetrics: () => void;
  onImportMetrics: () => void;
}

/**
 * The calendar of the next releases: its period and views on the line of the title, then one card
 * with the tasks by status, the timeline or the board, and the rows to show.
 */
export function ReleasesArea({
  id,
  plan,
  tasks,
  noteMatches,
  status,
  onStatusChange,
  view,
  onViewAction,
  timelineRange,
  week,
  display,
  displayControls,
  textScale,
  compact,
  onNewTask,
  onOpenTask,
  onChangeTask,
  onDuplicateTask,
  onDeleteTask,
  onAddTaskAt,
  onSaveNote,
  onMoveNote,
  onEditMetrics,
  onImportMetrics,
}: ReleasesAreaProps) {
  return (
    <Area
      id={id}
      title="Next Releases"
      actions={
        <>
          <CalendarNav
            view={view}
            onViewAction={onViewAction}
            hidePastDays={display.hidePastDays}
          />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {display.showMetrics && (
              <>
                {/* On phones the icons alone, so that the calendar comes into view sooner. */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="max-sm:p-2"
                  onClick={onEditMetrics}
                  title="Modifica fatturato"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="max-sm:sr-only">Modifica fatturato</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="max-sm:p-2"
                  onClick={onImportMetrics}
                  title="Importa fatturato"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="max-sm:sr-only">Importa fatturato</span>
                </Button>
              </>
            )}
            <Button id={NEW_TASK_ID} variant="primary" onClick={onNewTask}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuova attività
            </Button>
          </div>
        </>
      }
    >
      {/* One card: the summary above the calendar, the rows to show under it. */}
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <TaskSummary
          tasks={plan.tasks}
          // The tasks in the status, whatever the search hides.
          found={
            status === null ? null : plan.tasks.filter((task) => task.status === status).length
          }
          status={status}
          onStatusChange={onStatusChange}
        />

        {view.mode === 'timeline' ? (
          <Timeline
            range={timelineRange}
            zoom={view.zoom}
            anchor={view.anchor}
            jump={view.jump}
            onScrolled={(first, last, settled) =>
              onViewAction({ type: 'scrolled', first, last, settled })
            }
            tasks={tasks}
            lanes={plan.lanes}
            metrics={plan.metrics}
            dailyNotes={plan.dailyNotes}
            noteMatches={noteMatches}
            showMetrics={display.showMetrics}
            highlightWeekends={display.highlightWeekends}
            textScale={textScale}
            compact={compact}
            visibility={display.visibility}
            onShowAllRows={displayControls.showAllRows}
            onZoom={(step) => onViewAction({ type: 'zoomBy', step })}
            onShowDays={(date) => onViewAction({ type: 'goTo', date, zoom: 'detail' })}
            onChangeTask={onChangeTask}
            onOpenTask={onOpenTask}
            onDuplicateTask={onDuplicateTask}
            onDeleteTask={onDeleteTask}
            onAddTaskAt={onAddTaskAt}
            onSaveNote={onSaveNote}
            onMoveNote={onMoveNote}
          />
        ) : (
          <div className="bg-surface-muted p-3">
            <WeekBoard
              week={week}
              tasks={tasks}
              lanes={plan.lanes}
              metrics={plan.metrics}
              dailyNotes={plan.dailyNotes}
              noteMatches={noteMatches}
              showMetrics={display.showMetrics}
              highlightWeekends={display.highlightWeekends}
              textScale={textScale}
              compact={compact}
              visibility={display.visibility}
              onChangeTask={onChangeTask}
              onOpenTask={onOpenTask}
              onDuplicateTask={onDuplicateTask}
              onAddTaskAt={onAddTaskAt}
              onMoveNote={(from, to) => onMoveNote(from, to)}
            />
          </div>
        )}

        <RowVisibilityBar
          lanes={plan.lanes}
          display={display}
          controls={displayControls}
          onTimeline={view.mode === 'timeline'}
        />
      </div>
    </Area>
  );
}
