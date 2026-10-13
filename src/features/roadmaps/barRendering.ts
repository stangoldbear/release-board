import type { WorkSchedule } from '../../domain/assignments';
import type { TaskColorId } from '../../domain/colors';
import { formatLocaleNumber } from '../../domain/numberFormat';
import type { ProjectSpan } from '../../domain/projectSpan';
import { compareWorkRank, teamOf, workRank } from '../../domain/roadmapConfig';
import type { DateRange } from '../../domain/schedule';
import type { Absence, Project, RoadmapConfig, Stakeholder, Team } from '../../domain/types';
import { addDaysIso } from '../../utils/dateUtils';
import type { DetailLevel } from './projectUi';
import type { RoadmapMetrics } from './roadmapLayout';

// How the roadmap draws the work of the team of a project: a lane inside its bar for each bar of
// the work, or, at the Team level, a row for each. Pure: the components only place what is here.

/** Days as the bars show them: "12 gg", "3,5 gg", "1 g". */
export function formatManDays(manDays: number): string {
  return `${formatLocaleNumber(manDays, Number.isInteger(manDays) ? 0 : 1)} ${
    manDays === 1 ? 'g' : 'gg'
  }`;
}

export const CONTINGENCY_NAME = 'Contingency';
export const CONTINGENCY_TAG = 'CONT';

/** A bar of the work of a project as the roadmap draws it: a person's assignment, or the contingency. */
export interface WorkItem {
  kind: 'assignment' | 'contingency';
  /** The id of the assignment; for the contingency, the id of the project. */
  id: string;
  projectId: string;
  startDate: string;
  manDays: number;
  stakeholder: Stakeholder | null;
  team: Team | null;
  name: string;
  tag: string | null;
  /** The color of the team; null for the contingency and for a person without a team. */
  colorId: TaskColorId | null;
  absences: readonly Absence[];
  schedule: WorkSchedule;
  /** Its last day is past the hard deadline of the project. */
  late: boolean;
}

/**
 * The bars of the work of a project, in the order of the work: by the phase and the position of
 * the team, then of the person; the contingency last.
 */
export function workItemsOf(
  project: Pick<Project, 'id' | 'deadline'>,
  span: ProjectSpan,
  config: RoadmapConfig,
): WorkItem[] {
  const items = span.bars.map((bar): WorkItem => {
    const stakeholder =
      bar.kind === 'assignment'
        ? (config.stakeholders.find((item) => item.id === bar.stakeholderId) ?? null)
        : null;
    const team = stakeholder ? teamOf(config, stakeholder) : null;
    const contingency = bar.kind === 'contingency';
    return {
      kind: bar.kind,
      id: bar.id,
      projectId: project.id,
      startDate: bar.startDate,
      manDays: bar.manDays,
      stakeholder,
      team,
      name: contingency ? CONTINGENCY_NAME : (stakeholder?.name ?? 'Persona non in configurazione'),
      tag: contingency ? CONTINGENCY_TAG : (team?.tag ?? null),
      colorId: contingency ? null : (team?.colorId ?? null),
      absences: stakeholder?.absences ?? [],
      schedule: bar.schedule,
      late: project.deadline !== undefined && bar.schedule.end > project.deadline,
    };
  });
  return items.sort(
    (a, b) =>
      Number(a.kind === 'contingency') - Number(b.kind === 'contingency') ||
      compareWorkRank(workRank(config, a.stakeholder?.id), workRank(config, b.stakeholder?.id)) ||
      a.schedule.start.localeCompare(b.schedule.start) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * The days of a project without work, drawn faded: before the first bar, the gaps between the
 * bars, and after the last bar up to the end. Without bars the whole bar is work.
 */
export function fadedParts(span: ProjectSpan): DateRange[] {
  if (!span.work) return [];
  const parts: DateRange[] = [];
  if (span.work.start > span.start) {
    parts.push({ start: span.start, end: addDaysIso(span.work.start, -1) });
  }
  parts.push(...span.gaps);
  if (span.end > span.work.end) parts.push({ start: addDaysIso(span.work.end, 1), end: span.end });
  return parts;
}

/** The teams at work on a project, in the order of the work, each once; the contingency has none. */
export function teamsOf(items: readonly WorkItem[]): Team[] {
  const teams: Team[] = [];
  for (const item of items) {
    if (item.team && !teams.some((team) => team.id === item.team?.id)) teams.push(item.team);
  }
  return teams;
}

/** Space between the lanes of a bar, and around them. */
export const LANE_GAP = 2;
/** The sliver under the title that the lanes share with the titles alone: no room for words. */
export const TITLES_BAND = 6;

/** The lanes of a bar share its band: thinner with more of them, never under a pixel. */
export function laneLayout(band: number, bars: number): { height: number; gap: number } {
  const gap = bars > 4 ? 1 : LANE_GAP;
  return { height: Math.max(1, Math.floor((band - (bars - 1) * gap) / bars)), gap };
}

/** The lanes inside the bar of a project: the height of each, the space between, and their words. */
export interface Lanes {
  height: number;
  gap: number;
  /** Each lane carries the name of its person: it is a line of text tall. */
  labeled: boolean;
}

/** The row of a project at a level: the line of the title in its bar, the lanes, the bar, the row. */
export interface ProjectRowGeometry {
  titleHeight: number;
  /** Null when the bar has no lanes: no work, or the people in rows of their own. */
  lanes: Lanes | null;
  barHeight: number;
  rowHeight: number;
}

/**
 * The row of a project with `bars` bars of work, by its level, whether the timeline or the project
 * alone chose it, tight at every level so that many projects fit the screen: a tight line of
 * title and little room around the bar. With the titles alone, the title over a sliver that the
 * lanes share, the same for every project, bars or not; with the main information, under the
 * title a lane for each bar of the work, a line of text tall with the name of the person, so that
 * the row grows with the team, and two lines in the column, the title and the teams; at the Team
 * level the people have rows of their own under it, and the row of the title is the line of the
 * bar, which goes on around the people, with a pixel above.
 */
export function projectRowGeometry(
  level: DetailLevel,
  bars: number,
  metrics: RoadmapMetrics,
): ProjectRowGeometry {
  const { lineHeight, cellPadding } = metrics;
  const titleHeight = metrics.tightBarHeight;
  const padding = Math.round(metrics.rowPadding / 2);
  const rowHeight = (barHeight: number, lines: number) =>
    Math.max(barHeight + padding * 2, lineHeight * lines + cellPadding * 2);
  if (level === 'titles') {
    const barHeight = titleHeight + TITLES_BAND + LANE_GAP;
    return {
      titleHeight,
      lanes: bars > 0 ? { ...laneLayout(TITLES_BAND, bars), labeled: false } : null,
      barHeight,
      rowHeight: rowHeight(barHeight, 1),
    };
  }
  const labeled = level === 'main' && bars > 0;
  const band = labeled ? bars * metrics.laneHeight + (bars - 1) * LANE_GAP : 0;
  const barHeight = labeled ? titleHeight + band + LANE_GAP : titleHeight;
  return {
    titleHeight,
    lanes: labeled ? { height: metrics.laneHeight, gap: LANE_GAP, labeled: true } : null,
    barHeight,
    // At the Team level the bar goes on around the people: the row of its title is as tight as
    // the bar, and its cell has half the padding.
    rowHeight:
      level === 'team'
        ? Math.max(barHeight + 2, lineHeight + cellPadding)
        : rowHeight(barHeight, level === 'main' ? 2 : 1),
  };
}
