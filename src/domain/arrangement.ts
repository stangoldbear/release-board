import { addDaysIso } from '../utils/dateUtils';
import { isWorkingDay, scheduleAssignment } from './assignments';
import { arrangementOf } from './projects';
import { TEAM_PHASES, teamsInPhaseOrder } from './roadmapConfig';
import type { Assignment, Project, RoadmapConfig, TeamPhase } from './types';

// Where the bars of a project start, by its arrangement. The length of each bar comes from its
// days and the calendar of its person: the arrangement sets the starts only.

/** The first working day on or after a day. */
export function firstWorkingDayFrom(iso: string): string {
  let day = iso;
  for (let guard = 0; !isWorkingDay(day) && guard < 30; guard += 1) day = addDaysIso(day, 1);
  return day;
}

/** The first working day after a day. */
export function nextWorkingDay(iso: string): string {
  return firstWorkingDayFrom(addDaysIso(iso, 1));
}

/** An assignment to place: with the id it has, or will have, and its days. */
export interface BarToPlace extends Pick<Assignment, 'id' | 'stakeholderId' | 'manDays'> {
  /** Where the bar is now, kept by the manual arrangement. */
  startDate: string;
}

export interface ArrangedBars {
  starts: Record<string, string>;
  /** Where the contingency starts; null when the project has none. */
  contingencyStart: string | null;
}

const LAST_PHASE: TeamPhase = 'test';

/**
 * The starts of the bars of a project for its arrangement. Standard: the analysis from the
 * start, the developments in parallel from the first working day after the last analysis, the
 * tests after the last development, the contingency after the tests; phases without bars are
 * skipped. Parallel: every bar from the start. Sequence: one bar after the other, in the order of
 * the phases and of the teams. Manual: every bar where it is.
 */
export function arrangeProject(
  project: Pick<Project, 'startDate' | 'arrangement'>,
  bars: readonly BarToPlace[],
  contingencyDays: number | null,
  config: RoadmapConfig,
): ArrangedBars {
  const arrangement = arrangementOf(project);
  const absencesOf = (bar: BarToPlace) =>
    config.stakeholders.find((item) => item.id === bar.stakeholderId)?.absences ?? [];
  const endOf = (bar: BarToPlace, startDate: string) =>
    scheduleAssignment({ startDate, manDays: bar.manDays }, absencesOf(bar)).end;
  const starts: Record<string, string> = {};
  const origin = firstWorkingDayFrom(project.startDate);

  if (arrangement === 'manual') {
    for (const bar of bars) starts[bar.id] = bar.startDate;
    const lastEnd = bars
      .map((bar) => endOf(bar, bar.startDate))
      .sort()
      .at(-1);
    return {
      starts,
      contingencyStart: contingencyDays ? (lastEnd ? nextWorkingDay(lastEnd) : origin) : null,
    };
  }

  // The bars in the order of the work: by the phase of the team, then the team, then as given.
  const teamOrder = teamsInPhaseOrder(config).map((team) => team.id);
  const teamOf = (bar: BarToPlace) =>
    config.stakeholders.find((item) => item.id === bar.stakeholderId)?.teamId;
  const phaseOf = (bar: BarToPlace): TeamPhase =>
    config.teams.find((team) => team.id === teamOf(bar))?.phase ?? 'development';
  const ordered = bars
    .map((bar, index) => ({ bar, index }))
    .sort(
      (a, b) =>
        TEAM_PHASES.indexOf(phaseOf(a.bar)) - TEAM_PHASES.indexOf(phaseOf(b.bar)) ||
        teamOrder.indexOf(teamOf(a.bar) ?? '') - teamOrder.indexOf(teamOf(b.bar) ?? '') ||
        a.index - b.index,
    )
    .map(({ bar }) => bar);

  let cursor = origin;
  let lastEnd: string | null = null;
  if (arrangement === 'parallel') {
    for (const bar of ordered) {
      starts[bar.id] = origin;
      const end = endOf(bar, origin);
      if (!lastEnd || end > lastEnd) lastEnd = end;
    }
  } else if (arrangement === 'sequence') {
    for (const bar of ordered) {
      starts[bar.id] = cursor;
      lastEnd = endOf(bar, cursor);
      cursor = nextWorkingDay(lastEnd);
    }
  } else {
    for (const phase of [...TEAM_PHASES.filter((item) => item !== LAST_PHASE), LAST_PHASE]) {
      const group = ordered.filter((bar) => phaseOf(bar) === phase);
      if (group.length === 0) continue;
      let groupEnd: string | null = null;
      for (const bar of group) {
        starts[bar.id] = cursor;
        const end = endOf(bar, cursor);
        if (!groupEnd || end > groupEnd) groupEnd = end;
      }
      lastEnd = groupEnd;
      cursor = groupEnd ? nextWorkingDay(groupEnd) : cursor;
    }
  }
  return {
    starts,
    contingencyStart: contingencyDays ? (lastEnd ? nextWorkingDay(lastEnd) : origin) : null,
  };
}
