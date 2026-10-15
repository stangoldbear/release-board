import { TASK_COLOR_IDS } from './colors';
import type { TaskColorId } from './colors';
import { moveBefore } from './listOrder';
import {
  FIELD_OPTION_LABEL_MAX,
  FIELD_OPTIONS_MAX,
  fieldValuesOf,
  nextPosition,
} from './roadmapConfig';
import type { FieldOption, Project, ProjectField, RoadmapConfig } from './types';

// The labels of the projects (0.19): colored names, as many as a project needs, to sort the
// projects out and filter the timeline. They are a list of several values among the fields of the
// roadmap, with an id of their own, so that the security rules, the backups, the history and the
// search know them already; the generic editor of the fields leaves them out, and the settings
// have a section for them.

/** The id of the field of the labels: an underscore, which no id made from a label has. */
export const LABELS_FIELD_ID = 'project_labels';
export const LABELS_FIELD_LABEL = 'Etichette';
export const LABEL_NAME_MAX = FIELD_OPTION_LABEL_MAX;
/** As many as a list of the fields can hold: the security rules enforce the same. */
export const LABELS_MAX = FIELD_OPTIONS_MAX;

const FIRST_LABEL_COLOR: TaskColorId = 'blue';

export function isLabelsField(field: Pick<ProjectField, 'id'>): boolean {
  return field.id === LABELS_FIELD_ID;
}

/** The field of the labels; null while the plan has none. */
export function labelsFieldOf(config: Pick<RoadmapConfig, 'fields'>): ProjectField | null {
  const field = config.fields.find(isLabelsField);
  return field?.type === 'choice' && field.multiple ? field : null;
}

/** The labels of the plan, in their order. */
export function labelsOf(config: Pick<RoadmapConfig, 'fields'>): FieldOption[] {
  return labelsFieldOf(config)?.options ?? [];
}

/** The labels of a project, in the order of the list; those no longer in it are left out. */
export function projectLabels(
  project: Pick<Project, 'fields'>,
  config: Pick<RoadmapConfig, 'fields'>,
): FieldOption[] {
  const field = labelsFieldOf(config);
  if (!field) return [];
  const ids = new Set(fieldValuesOf(project, field));
  return (field.options ?? []).filter((label) => ids.has(label.id));
}

/** The fields the editors of the fields show: all of them but the labels. */
export function customFields<T extends Pick<ProjectField, 'id'>>(fields: readonly T[]): T[] {
  return fields.filter((field) => !isLabelsField(field));
}

/**
 * Why a name cannot be the name of a label, in words, or null when it can: not empty, not too
 * long, not the name of another label whatever the case. `labelId` is the label being renamed,
 * which may keep its own name.
 */
export function labelNameError(
  name: string,
  labels: readonly FieldOption[],
  labelId: string | null = null,
): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'Scrivi il nome dell’etichetta.';
  if (trimmed.length > LABEL_NAME_MAX) return `Al massimo ${LABEL_NAME_MAX} caratteri.`;
  const key = trimmed.toLocaleLowerCase('it');
  const taken = labels.some(
    (label) => label.id !== labelId && label.label.trim().toLocaleLowerCase('it') === key,
  );
  return taken ? 'C’è già un’etichetta con questo nome.' : null;
}

/** The label with a name, whatever the case: the one a typed name means. */
export function labelNamed(labels: readonly FieldOption[], name: string): FieldOption | null {
  const key = name.trim().toLocaleLowerCase('it');
  return labels.find((label) => label.label.trim().toLocaleLowerCase('it') === key) ?? null;
}

/** The color of a new label: the one after the color of the last label. */
export function nextLabelColor(labels: readonly FieldOption[]): TaskColorId {
  const last = labels.at(-1)?.colorId;
  if (!last) return FIRST_LABEL_COLOR;
  return TASK_COLOR_IDS[(TASK_COLOR_IDS.indexOf(last) + 1) % TASK_COLOR_IDS.length] ?? last;
}

/**
 * The field of the labels with a new one at the end, and the new label; the field itself when the
 * plan has none yet. Null when the name is not good or the list is full. The id comes from outside,
 * never from the name: a label deleted and written again must not find the projects of the old one.
 */
export function withLabelAdded(
  config: Pick<RoadmapConfig, 'fields'>,
  name: string,
  id: string,
  colorId: TaskColorId = nextLabelColor(labelsOf(config)),
): { field: ProjectField; label: FieldOption } | null {
  const field = labelsFieldOf(config);
  const labels = field?.options ?? [];
  if (labels.length >= LABELS_MAX || labelNameError(name, labels) !== null) return null;
  if (labels.some((label) => label.id === id)) return null;
  const label: FieldOption = { id, label: name.trim(), colorId };
  const base: ProjectField = field ?? {
    id: LABELS_FIELD_ID,
    label: LABELS_FIELD_LABEL,
    type: 'choice',
    multiple: true,
    required: false,
    main: false,
    position: nextPosition(config.fields),
  };
  return { field: { ...base, options: [...labels, label] }, label };
}

/** The field with a label renamed or colored; the name is trimmed. */
export function withLabelChanged(
  field: ProjectField,
  labelId: string,
  changes: { label?: string; colorId?: TaskColorId },
): ProjectField {
  return {
    ...field,
    options: (field.options ?? []).map((label) =>
      label.id === labelId
        ? {
            ...label,
            ...(changes.label !== undefined && { label: changes.label.trim() }),
            ...(changes.colorId !== undefined && { colorId: changes.colorId }),
          }
        : label,
    ),
  };
}

/** The field with a label put right before another, or last. */
export function withLabelMoved(
  field: ProjectField,
  labelId: string,
  beforeId: string | null,
): ProjectField {
  return { ...field, options: moveBefore(field.options ?? [], labelId, beforeId) };
}

/**
 * The field without a label; null when it was the last one, since a list needs a value: the field
 * goes with it. The projects keep the id, which no longer means anything and goes at their next
 * save.
 */
export function withLabelRemoved(field: ProjectField, labelId: string): ProjectField | null {
  const options = (field.options ?? []).filter((label) => label.id !== labelId);
  return options.length > 0 ? { ...field, options } : null;
}

/** How many projects have a label. */
export function projectsWithLabel(
  projects: readonly Pick<Project, 'fields'>[],
  field: ProjectField,
  labelId: string,
): number {
  return projects.filter((project) => fieldValuesOf(project, field).includes(labelId)).length;
}

// The filter of the timeline by the labels.

/** A project passes with at least one of the labels chosen, or with all of them. */
export type LabelsMatch = 'any' | 'all';

export interface LabelsFilter {
  /** The labels chosen; none filters nothing, unless `unlabeled` is on. */
  ids: string[];
  match: LabelsMatch;
  /** The projects without labels pass too. */
  unlabeled: boolean;
}

export const NO_LABELS_FILTER: LabelsFilter = { ids: [], match: 'any', unlabeled: false };

/** A filter as a browser saved it; null when the saved value is not one. */
export function parseLabelsFilter(value: unknown): LabelsFilter | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const saved = value as Record<string, unknown>;
  const ids = Array.isArray(saved.ids)
    ? saved.ids.filter((id): id is string => typeof id === 'string').slice(0, LABELS_MAX)
    : [];
  return {
    ids: [...new Set(ids)],
    match: saved.match === 'all' ? 'all' : 'any',
    unlabeled: saved.unlabeled === true,
  };
}

/** The filter as it applies to the labels there are: those deleted since are left out. */
export function activeLabelsFilter(
  filter: LabelsFilter,
  labels: readonly FieldOption[],
): LabelsFilter {
  const ids = filter.ids.filter((id) => labels.some((label) => label.id === id));
  return ids.length === filter.ids.length ? filter : { ...filter, ids };
}

export function isFilteringLabels(filter: LabelsFilter): boolean {
  return filter.ids.length > 0 || filter.unlabeled;
}

/** Whether a project with these labels passes the filter. */
export function matchesLabels(labelIds: readonly string[], filter: LabelsFilter): boolean {
  if (!isFilteringLabels(filter)) return true;
  if (filter.unlabeled && labelIds.length === 0) return true;
  if (filter.ids.length === 0) return false;
  return filter.match === 'any'
    ? filter.ids.some((id) => labelIds.includes(id))
    : filter.ids.every((id) => labelIds.includes(id));
}

/** The projects the filter lets pass, in their order. */
export function filterByLabels<T extends Pick<Project, 'fields'>>(
  projects: readonly T[],
  config: Pick<RoadmapConfig, 'fields'>,
  filter: LabelsFilter,
): T[] {
  const active = activeLabelsFilter(filter, labelsOf(config));
  if (!isFilteringLabels(active)) return [...projects];
  return projects.filter((project) =>
    matchesLabels(
      projectLabels(project, config).map((label) => label.id),
      active,
    ),
  );
}

/** «Mobile o Web», «Mobile e Web», «senza etichette»: what the filter keeps, in words. */
export function describeLabelsFilter(filter: LabelsFilter, labels: readonly FieldOption[]): string {
  const names = filter.ids
    .map((id) => labels.find((label) => label.id === id)?.label)
    .filter((name): name is string => name !== undefined);
  const joined =
    names.length < 2
      ? (names[0] ?? '')
      : `${names.slice(0, -1).join(', ')} ${filter.match === 'any' ? 'o' : 'e'} ${names.at(-1)}`;
  if (!filter.unlabeled) return joined;
  return joined ? `${joined}, o senza etichette` : 'senza etichette';
}
