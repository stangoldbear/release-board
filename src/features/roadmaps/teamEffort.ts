import { MAN_DAYS_MAX } from '../../domain/assignments';
import { formatLocaleNumber, parseLocaleNumber } from '../../domain/numberFormat';
import {
  compareWorkRank,
  sortByPosition,
  teamOf,
  teamsInOrder,
  workRank,
} from '../../domain/roadmapConfig';
import { suggestedDays } from '../../domain/teamFormula';
import type { TeamRow } from '../../domain/teamPlan';
import type { Assignment, Project, RoadmapConfig, Stakeholder, Team } from '../../domain/types';

// The table of the days of a project while it is edited: a row per person, and the contingency.
// A row follows the formula of its team until days are typed in it; the formulas are fed with the
// days typed for the teams without a formula.

export const CONTINGENCY_KEY = 'contingency';

/** A row of the table of the days of a project. */
export interface EffortRow {
  key: string;
  kind: 'person' | 'contingency';
  stakeholderId?: string;
  /** The assignment the row is, when it is one already. */
  assignmentId?: string;
  name: string;
  team: Team | null;
  /** The formula that can fill the row: the team's, or the contingency's. */
  formula?: string;
  /** What is typed; empty while the row follows its formula or has no days yet. */
  text: string;
  /** The row follows its formula: its days are suggested, not typed. */
  auto: boolean;
}

/** Days as the table shows them: "3", "3,5". */
export function formatDays(days: number): string {
  return formatLocaleNumber(days, Number.isInteger(days) ? 0 : 1);
}

/** The days typed in a row, in half days within the limit; null when blank or not days. */
export function parseDays(text: string): number | null {
  if (text.trim() === '') return null;
  const value = parseLocaleNumber(text.trim());
  if (value === null || value <= 0 || value > MAN_DAYS_MAX) return null;
  // At least half a day: a smaller amount of work still takes a slot.
  return Math.max(0.5, Math.round(value * 2) / 2);
}

function personRow(
  stakeholder: Stakeholder,
  config: RoadmapConfig,
  assignment?: Assignment,
): EffortRow {
  const team = teamOf(config, stakeholder);
  const row: EffortRow = {
    key: assignment?.id ?? `new:${stakeholder.id}`,
    kind: 'person',
    stakeholderId: stakeholder.id,
    name: stakeholder.name,
    team,
    text: assignment ? formatDays(assignment.manDays) : '',
    auto: !assignment && Boolean(team?.formula),
  };
  if (assignment) row.assignmentId = assignment.id;
  if (team?.formula) row.formula = team.formula;
  return row;
}

/** The people in the order of the teams, as the settings give it, then in their own order. */
function inTeamOrder(rows: EffortRow[], config: RoadmapConfig): EffortRow[] {
  return [...rows].sort(
    (a, b) =>
      compareWorkRank(workRank(config, a.stakeholderId), workRank(config, b.stakeholderId)) ||
      a.name.localeCompare(b.name),
  );
}

/**
 * The rows a project opens with: its assignments, in the order of the teams, and for a new
 * project the default member of each team; the contingency last, on its formula while the
 * project has no work yet (a project with its team and no contingency keeps none until asked).
 */
export function initialRows(
  project: Pick<Project, 'contingency'> | null,
  assignments: readonly Assignment[],
  config: RoadmapConfig,
): EffortRow[] {
  const people: EffortRow[] = [];
  for (const assignment of assignments) {
    const stakeholder = config.stakeholders.find((item) => item.id === assignment.stakeholderId);
    if (stakeholder) {
      people.push(personRow(stakeholder, config, assignment));
    } else {
      people.push({
        key: assignment.id,
        kind: 'person',
        stakeholderId: assignment.stakeholderId,
        assignmentId: assignment.id,
        name: 'Persona non in configurazione',
        team: null,
        text: formatDays(assignment.manDays),
        auto: false,
      });
    }
  }
  if (!project) {
    for (const member of sortByPosition(config.stakeholders.filter((item) => item.default))) {
      if (!people.some((row) => row.stakeholderId === member.id)) {
        people.push(personRow(member, config));
      }
    }
  }
  const contingency: EffortRow = {
    key: CONTINGENCY_KEY,
    kind: 'contingency',
    name: 'Contingency',
    team: null,
    text: project?.contingency ? formatDays(project.contingency.manDays) : '',
    auto: !project?.contingency && assignments.length === 0 && Boolean(config.contingencyFormula),
  };
  if (config.contingencyFormula) contingency.formula = config.contingencyFormula;
  return [...inTeamOrder(people, config), contingency];
}

/** The days typed for each team without a formula: what the formulas are fed with. */
export function daysByTeam(rows: readonly EffortRow[]): Record<string, number> {
  const days: Record<string, number> = {};
  for (const row of rows) {
    if (row.kind !== 'person' || !row.team || row.team.formula) continue;
    const typed = parseDays(row.text) ?? 0;
    days[row.team.id] = (days[row.team.id] ?? 0) + typed;
  }
  return days;
}

/** The days of a row: typed, or suggested by its formula from the days of the other teams. */
export function rowDays(
  row: EffortRow,
  rows: readonly EffortRow[],
  config: RoadmapConfig,
): number | null {
  if (!row.auto) return parseDays(row.text);
  return suggestedDays(row.formula, config.teams, daysByTeam(rows));
}

/** The rows as the plan of the team takes them: people with days, and the days of the contingency. */
export function toTeamRows(
  rows: readonly EffortRow[],
  config: RoadmapConfig,
): { team: TeamRow[]; contingency: number | null } {
  const team: TeamRow[] = [];
  let contingency: number | null = null;
  for (const row of rows) {
    const days = rowDays(row, rows, config);
    if (row.kind === 'contingency') {
      contingency = days;
    } else if (row.stakeholderId && days) {
      const item: TeamRow = { stakeholderId: row.stakeholderId, manDays: days };
      if (row.assignmentId) item.assignmentId = row.assignmentId;
      team.push(item);
    }
  }
  return { team, contingency };
}

/** The sum of the days of every row. */
export function totalDays(rows: readonly EffortRow[], config: RoadmapConfig): number {
  return rows.reduce((sum, row) => sum + (rowDays(row, rows, config) ?? 0), 0);
}

/** The people of the configuration not in the table, in the order of the teams. */
export function peopleNotInRows(rows: readonly EffortRow[], config: RoadmapConfig): Stakeholder[] {
  const taken = new Set(rows.map((row) => row.stakeholderId));
  return teamsInOrder(config).flatMap((team) =>
    sortByPosition(
      config.stakeholders.filter((item) => item.teamId === team.id && !taken.has(item.id)),
    ),
  );
}

/** The next person of a team not in the table, by position; null when the team is all in. */
export function nextOfTeam(
  rows: readonly EffortRow[],
  team: Team,
  config: RoadmapConfig,
): Stakeholder | null {
  return peopleNotInRows(rows, config).find((item) => item.teamId === team.id) ?? null;
}

/** The rows with a person added, in the order of the teams; the contingency stays last. */
export function addRow(
  rows: readonly EffortRow[],
  stakeholder: Stakeholder,
  config: RoadmapConfig,
): EffortRow[] {
  if (rows.some((row) => row.stakeholderId === stakeholder.id)) return [...rows];
  const people = rows.filter((row) => row.kind === 'person');
  const rest = rows.filter((row) => row.kind !== 'person');
  return [...inTeamOrder([...people, personRow(stakeholder, config)], config), ...rest];
}

export function removeRow(rows: readonly EffortRow[], key: string): EffortRow[] {
  return rows.filter((row) => row.key !== key);
}

/** The rows with days typed in one of them, which then no longer follows its formula. */
export function typeDays(rows: readonly EffortRow[], key: string, text: string): EffortRow[] {
  return rows.map((row) => (row.key === key ? { ...row, text, auto: false } : row));
}

/** The rows with one of them back on its formula. */
export function resetRow(rows: readonly EffortRow[], key: string): EffortRow[] {
  return rows.map((row) => (row.key === key ? { ...row, text: '', auto: true } : row));
}
