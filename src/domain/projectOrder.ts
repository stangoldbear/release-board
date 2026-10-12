import { PROJECT_STATUSES } from './projects';
import { fieldValuesOf } from './roadmapConfig';
import type { Project, ProjectField } from './types';

// The order of the projects on the roadmap: the one the members give them by hand, shared in the
// plan as a fractional position, or a criterion this browser applies over it.

export type RoadmapSort = 'custom' | 'start' | 'end' | 'deadline' | 'field' | 'status' | 'title';

export const ROADMAP_SORTS: readonly RoadmapSort[] = [
  'custom',
  'start',
  'end',
  'deadline',
  'field',
  'status',
  'title',
];

/** The name of each criterion; the field's is the label of the field that colors the projects. */
export const ROADMAP_SORT_LABELS: Record<Exclude<RoadmapSort, 'field'>, string> = {
  custom: 'Personalizzato',
  start: 'Inizio',
  end: 'Fine',
  deadline: 'Deadline più vicina',
  status: 'Stato',
  title: 'Titolo',
};

export function isRoadmapSort(value: unknown): value is RoadmapSort {
  return (ROADMAP_SORTS as readonly unknown[]).includes(value);
}

type Positioned = Pick<Project, 'id' | 'title' | 'startDate' | 'endDate' | 'position'>;

/** The order the members gave: by position, the projects without one last in the order of their start. */
function compareCustom(a: Positioned, b: Positioned): number {
  const pa = a.position ?? Number.POSITIVE_INFINITY;
  const pb = b.position ?? Number.POSITIVE_INFINITY;
  return (
    pa - pb ||
    a.startDate.localeCompare(b.startDate) ||
    (a.endDate ?? a.startDate).localeCompare(b.endDate ?? b.startDate) ||
    a.title.localeCompare(b.title) ||
    a.id.localeCompare(b.id)
  );
}

export function customOrder<T extends Positioned>(projects: readonly T[]): T[] {
  return [...projects].sort(compareCustom);
}

/** What a criterion needs besides the projects. */
export interface SortContext {
  today: string;
  /** The effective end of a project: planned end, own days or the work of its team. */
  endOf: (project: Project) => string;
  /** The field whose values order the projects, in the order of its options; null without. */
  field: ProjectField | null;
}

/** Deadlines to come from the nearest, then the projects without one, then the past ones. */
function deadlineRank(project: Project, today: string): [number, string] {
  if (!project.deadline) return [1, ''];
  return project.deadline >= today ? [0, project.deadline] : [2, project.deadline];
}

function fieldRank(project: Project, field: ProjectField | null): number {
  if (!field?.options) return 0;
  const [value] = fieldValuesOf(project, field);
  const at = field.options.findIndex((option) => option.id === value);
  return at === -1 ? field.options.length : at;
}

/** The projects by a criterion; ties keep the order the members gave. */
export function sortProjectsBy<T extends Project>(
  projects: readonly T[],
  sort: RoadmapSort,
  context: SortContext,
): T[] {
  const ordered = customOrder(projects);
  if (sort === 'custom') return ordered;
  const compare = (a: T, b: T): number => {
    switch (sort) {
      case 'start':
        return a.startDate.localeCompare(b.startDate);
      case 'end':
        return context.endOf(a).localeCompare(context.endOf(b));
      case 'deadline': {
        const [ra, da] = deadlineRank(a, context.today);
        const [rb, db] = deadlineRank(b, context.today);
        return ra - rb || (ra === 2 ? db.localeCompare(da) : da.localeCompare(db));
      }
      case 'field':
        return fieldRank(a, context.field) - fieldRank(b, context.field);
      case 'status':
        return PROJECT_STATUSES.indexOf(a.status) - PROJECT_STATUSES.indexOf(b.status);
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  };
  return ordered.sort(compare);
}

/** The position of a new project: after every other. */
export function nextProjectPosition(projects: readonly Pick<Project, 'position'>[]): number {
  return projects.reduce((last, project) => Math.max(last, project.position ?? 0), 0) + 1;
}

/** The project that follows the slot `index` of a list, the moved one left out; null at the end. */
export function followerOf(
  list: readonly Pick<Project, 'id'>[],
  projectId: string,
  index: number,
): string | null {
  const others = list.filter((project) => project.id !== projectId);
  return others[Math.max(index, 0)]?.id ?? null;
}

/** New positions for a whole order, 1, 2, 3…, for the projects whose position differs. */
export function renumberProjects(ordered: readonly Positioned[]): Map<string, number> {
  return new Map(
    ordered.flatMap((project, at) =>
      project.position === at + 1 ? [] : [[project.id, at + 1] as [string, number]],
    ),
  );
}

/**
 * The new positions that put a project right before `beforeId`, or after all the projects when
 * it is null. Usually the moved project alone takes the middle between its new neighbours; when
 * they have no position yet, or are too close for a number between them, every project is
 * numbered again. Empty when nothing moves or a project is missing.
 */
export function projectMoves(
  projects: readonly Positioned[],
  projectId: string,
  beforeId: string | null,
): Map<string, number> {
  const ordered = customOrder(projects);
  const from = ordered.findIndex((project) => project.id === projectId);
  const moved = ordered[from];
  if (!moved || beforeId === projectId) return new Map();
  const others = ordered.filter((project) => project.id !== projectId);
  const to =
    beforeId === null ? others.length : others.findIndex((project) => project.id === beforeId);
  if (to < 0 || to === from) return new Map();

  const before = others[to - 1];
  const after = others[to];
  const numbered = (project: Positioned | undefined) =>
    project === undefined || typeof project.position === 'number';
  if (numbered(before) && numbered(after)) {
    const position =
      before?.position !== undefined && after?.position !== undefined
        ? (before.position + after.position) / 2
        : before?.position !== undefined
          ? before.position + 1
          : after?.position !== undefined
            ? after.position - 1
            : 1;
    const between =
      (before?.position === undefined || position > before.position) &&
      (after?.position === undefined || position < after.position);
    if (between) return new Map([[projectId, position]]);
  }
  return renumberProjects([...others.slice(0, to), moved, ...others.slice(to)]);
}
