import type { ContingencySegment, Project, ProjectContingency } from './types';
import { copyAfterAssignment, moveAssignment } from './assignments';
import { CONTINGENCY_SEGMENTS_MAX } from './projects';
import type { DateRange } from './schedule';

export function contingencySegments(
  project: Pick<Project, 'id' | 'contingency'>,
): ContingencySegment[] {
  const reserve = project.contingency;
  if (!reserve) return [];
  return [
    {
      id: project.id,
      startDate: reserve.startDate,
      manDays: reserve.manDays,
      ...(reserve.note ? { note: reserve.note } : {}),
    },
    ...(reserve.segments ?? []),
  ];
}

export function changeContingency(
  project: Pick<Project, 'id' | 'contingency'>,
  segmentId: string,
  changes: Partial<Pick<ContingencySegment, 'startDate' | 'manDays' | 'note'>>,
): ProjectContingency | undefined {
  const reserve = project.contingency;
  if (!reserve) return undefined;
  const update = <T extends { note?: string }>(segment: T) => {
    const changed = { ...segment, ...changes };
    if (!changed.note) delete changed.note;
    return changed;
  };
  if (segmentId === project.id) return update(reserve);
  return {
    ...reserve,
    segments: reserve.segments?.map((segment) =>
      segment.id === segmentId ? update(segment) : segment,
    ),
  };
}

export function removeContingency(
  project: Pick<Project, 'id' | 'contingency'>,
  segmentId: string,
): ProjectContingency | null {
  const remaining = contingencySegments(project).filter((segment) => segment.id !== segmentId);
  const first = remaining[0];
  if (!first) return null;
  const { id: _id, ...reserve } = first;
  return { ...reserve, ...(remaining.length > 1 ? { segments: remaining.slice(1) } : {}) };
}

export function duplicateContingency(
  project: Pick<Project, 'id' | 'contingency'>,
  segmentId: string,
  id: string,
  closures: readonly DateRange[],
): ProjectContingency | null {
  const reserve = project.contingency;
  const segment = contingencySegments(project).find((item) => item.id === segmentId);
  if (!reserve || !segment || (reserve.segments?.length ?? 0) >= CONTINGENCY_SEGMENTS_MAX)
    return null;
  const next = copyAfterAssignment(
    { ...segment, projectId: project.id, stakeholderId: '' },
    [],
    closures,
  );
  if (!next) return null;
  const copy: ContingencySegment = { id, startDate: next.startDate, manDays: next.manDays };
  if (next.note) copy.note = next.note;
  return { ...reserve, segments: [...(reserve.segments ?? []), copy] };
}

export function moveContingency(
  reserve: ProjectContingency,
  days: number,
  closures: readonly DateRange[],
): ProjectContingency {
  return {
    ...reserve,
    ...moveAssignment(reserve, days, closures),
    ...(reserve.segments
      ? {
          segments: reserve.segments.map((segment) => ({
            ...segment,
            ...moveAssignment(segment, days, closures),
          })),
        }
      : {}),
  };
}
