import type { WorkSchedule } from '../../domain/assignments';
import type { TaskColorId } from '../../domain/colors';
import { formatLocaleNumber } from '../../domain/numberFormat';
import type { ProjectSpan } from '../../domain/projectSpan';
import {
  DEFAULT_TEAM_PHASE,
  TEAM_PHASES,
  TEAM_PHASE_INFO,
  compareWorkRank,
  teamOf,
  workRank,
} from '../../domain/roadmapConfig';
import type { DateRange } from '../../domain/schedule';
import type {
  Absence,
  Project,
  RoadmapConfig,
  Stakeholder,
  Team,
  TeamPhase,
} from '../../domain/types';
import { addDaysIso } from '../../utils/dateUtils';

// How the roadmap draws the work of the team of a project: in rows under the project, as lanes
// inside its bar, or as the phases of one bar. Pure: the components only place what is here.

export type BarRendering = 'rows' | 'lanes' | 'phases';

export const BAR_RENDERINGS: readonly { id: BarRendering; label: string; description: string }[] = [
  {
    id: 'rows',
    label: 'Righe sotto il progetto',
    description:
      'Una barra sola per progetto. Al livello «Team» le persone e la contingency stanno in righe sotto, con nome e giorni uomo.',
  },
  {
    id: 'lanes',
    label: 'Lane dentro la barra',
    description:
      'La barra del progetto contiene una striscia sottile per persona, nel colore del team, e una grigia per la contingency: la forma del lavoro si legge in una riga.',
  },
  {
    id: 'phases',
    label: 'Fasi su una barra',
    description:
      'Sotto il titolo una striscia divisa per fase, Analisi, Sviluppo, Test e contingency, nei colori dei team e con i giorni uomo di ogni fase.',
  },
];
export const DEFAULT_BAR_RENDERING: BarRendering = 'lanes';
export const BAR_RENDERING_IDS: readonly BarRendering[] = BAR_RENDERINGS.map((item) => item.id);

export function isBarRendering(value: unknown): value is BarRendering {
  return (BAR_RENDERING_IDS as readonly unknown[]).includes(value);
}

/** Days as the bars show them: "12 gg", "3,5 gg", "1 g". */
export function formatManDays(manDays: number): string {
  return `${formatLocaleNumber(manDays, Number.isInteger(manDays) ? 0 : 1)} ${
    manDays === 1 ? 'g' : 'gg'
  }`;
}

export const CONTINGENCY_NAME = 'Contingency';
export const CONTINGENCY_TAG = 'CONT';

/** The phase of a bar of work: that of its team, or the contingency after them all. */
export type WorkPhase = TeamPhase | 'contingency';
export const WORK_PHASES: readonly WorkPhase[] = [...TEAM_PHASES, 'contingency'];

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
  phase: WorkPhase;
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
      phase: contingency ? 'contingency' : (team?.phase ?? DEFAULT_TEAM_PHASE),
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

/** A segment of the bar of a project: a phase, from the first day of its bars to the last. */
export interface PhaseSegment {
  phase: WorkPhase;
  label: string;
  start: string;
  end: string;
  manDays: number;
  /** The color of the first team of the phase; null for the contingency. */
  colorId: TaskColorId | null;
  items: WorkItem[];
  late: boolean;
}

/** The phases of the work, in their order, each over the days of its bars; empty phases skipped. */
export function phaseSegmentsOf(items: readonly WorkItem[]): PhaseSegment[] {
  return WORK_PHASES.flatMap((phase) => {
    const own = items.filter((item) => item.phase === phase);
    if (own.length === 0) return [];
    const starts = own.map((item) => item.schedule.start).sort();
    const ends = own.map((item) => item.schedule.end).sort();
    return [
      {
        phase,
        label: phase === 'contingency' ? CONTINGENCY_NAME : TEAM_PHASE_INFO[phase].label,
        start: starts[0]!,
        end: ends.at(-1)!,
        manDays: own.reduce((sum, item) => sum + item.manDays, 0),
        colorId: own[0]!.colorId,
        items: own,
        late: own.some((item) => item.late),
      },
    ];
  });
}

/** Space between the lanes of a bar, and around them. */
export const LANE_GAP = 2;
/** The strip of the phases under the title: one line of small text. */
export const PHASE_STRIP_HEIGHT = 16;

/**
 * The height of the bar of a project: its line of text and, under it, a lane for each bar of the
 * work or the strip of the phases, when the rendering draws them and there are bars.
 */
export function projectBarHeight(
  rendering: BarRendering,
  titleHeight: number,
  laneHeight: number,
  bars: number,
): number {
  if (bars === 0 || rendering === 'rows') return titleHeight;
  if (rendering === 'lanes') return titleHeight + bars * (laneHeight + LANE_GAP) + LANE_GAP;
  return titleHeight + PHASE_STRIP_HEIGHT + LANE_GAP * 2;
}
