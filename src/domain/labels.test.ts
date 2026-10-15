import { describe, expect, it } from 'vitest';
import {
  LABELS_FIELD_ID,
  LABELS_MAX,
  NO_LABELS_FILTER,
  customFields,
  describeLabelsFilter,
  filterByLabels,
  labelNameError,
  labelNamed,
  labelsFieldOf,
  matchesLabels,
  nextLabelColor,
  parseLabelsFilter,
  projectLabels,
  projectsWithLabel,
  withLabelAdded,
  withLabelChanged,
  withLabelMoved,
  withLabelRemoved,
} from './labels';
import type { LabelsFilter } from './labels';
import { idFromLabel, isRoadmapId } from './roadmapConfig';
import type { Project, ProjectField } from './types';

const size: ProjectField = {
  id: 'size',
  label: 'Dimensione',
  type: 'choice',
  multiple: false,
  required: false,
  main: false,
  position: 0,
  options: [{ id: 'big', label: 'Big project', colorId: 'purple' }],
};

const labels: ProjectField = {
  id: LABELS_FIELD_ID,
  label: 'Etichette',
  type: 'choice',
  multiple: true,
  required: false,
  main: false,
  position: 1,
  options: [
    { id: 'l-mobile', label: 'Mobile', colorId: 'blue' },
    { id: 'l-web', label: 'Web', colorId: 'teal' },
    { id: 'l-q4', label: 'Q4', colorId: 'amber' },
  ],
};

const config = { fields: [size, labels] };

const project = (id: string, ids: string[]): Project => ({
  id,
  title: id,
  startDate: '2026-10-15',
  colorId: 'blue',
  status: 'planned',
  fields: ids.length > 0 ? { [LABELS_FIELD_ID]: ids, size: ['big'] } : { size: ['big'] },
});

const names = (field: ProjectField | null) => field?.options?.map((label) => label.label);

describe('the field of the labels', () => {
  it('has an id no label can give, which the rules accept', () => {
    expect(isRoadmapId(LABELS_FIELD_ID)).toBe(true);
    expect(idFromLabel('Project labels')).not.toBe(LABELS_FIELD_ID);
  });

  it('is found by its id when it is a list of several values', () => {
    expect(labelsFieldOf(config)).toBe(labels);
    expect(labelsFieldOf({ fields: [size] })).toBeNull();
    expect(labelsFieldOf({ fields: [{ ...labels, multiple: false }] })).toBeNull();
    expect(customFields(config.fields)).toEqual([size]);
  });

  it('gives the labels of a project in the order of the list, without the deleted ones', () => {
    const tagged = project('a', ['l-q4', 'gone', 'l-mobile']);
    expect(projectLabels(tagged, config).map((label) => label.label)).toEqual(['Mobile', 'Q4']);
    expect(projectLabels(tagged, { fields: [size] })).toEqual([]);
    expect(projectsWithLabel([tagged, project('b', [])], labels, 'l-q4')).toBe(1);
  });
});

describe('the names of the labels', () => {
  it('wants a name, not too long, of no other label whatever the case', () => {
    const options = labels.options ?? [];
    expect(labelNameError('Cliente', options)).toBeNull();
    expect(labelNameError('  ', options)).toBe('Scrivi il nome dell’etichetta.');
    expect(labelNameError('x'.repeat(61), options)).toBe('Al massimo 60 caratteri.');
    expect(labelNameError(' mobile ', options)).toBe('C’è già un’etichetta con questo nome.');
    expect(labelNameError('MOBILE', options, 'l-mobile')).toBeNull();
    expect(labelNamed(options, 'web ')?.id).toBe('l-web');
    expect(labelNamed(options, 'Cliente')).toBeNull();
  });
});

describe('changing the labels', () => {
  it('creates the field with the first label, then adds at the end with the next color', () => {
    const first = withLabelAdded({ fields: [size] }, ' Mobile ', 'id-1');
    expect(first?.field).toMatchObject({
      id: LABELS_FIELD_ID,
      label: 'Etichette',
      type: 'choice',
      multiple: true,
      required: false,
      main: false,
      position: 1,
    });
    expect(first?.label).toEqual({ id: 'id-1', label: 'Mobile', colorId: 'blue' });
    const second = withLabelAdded(config, 'Cliente', 'id-2');
    expect(names(second?.field ?? null)).toEqual(['Mobile', 'Web', 'Q4', 'Cliente']);
    expect(second?.label.colorId).toBe(nextLabelColor(labels.options ?? []));
    expect(withLabelAdded(config, 'cliente', 'id-3', 'pink')?.label.colorId).toBe('pink');
  });

  it('refuses a bad name, a taken id and a full list', () => {
    expect(withLabelAdded(config, 'web', 'id-2')).toBeNull();
    expect(withLabelAdded(config, 'Cliente', 'l-web')).toBeNull();
    const full: ProjectField = {
      ...labels,
      options: Array.from({ length: LABELS_MAX }, (_, index) => ({
        id: `l-${index}`,
        label: `L${index}`,
      })),
    };
    expect(withLabelAdded({ fields: [full] }, 'Altra', 'id-x')).toBeNull();
  });

  it('renames, colors, moves and removes, the field going with the last label', () => {
    expect(
      withLabelChanged(labels, 'l-web', { label: ' Sito ', colorId: 'green' }).options?.[1],
    ).toEqual({ id: 'l-web', label: 'Sito', colorId: 'green' });
    expect(names(withLabelMoved(labels, 'l-q4', 'l-mobile'))).toEqual(['Q4', 'Mobile', 'Web']);
    expect(names(withLabelMoved(labels, 'l-mobile', null))).toEqual(['Web', 'Q4', 'Mobile']);
    expect(names(withLabelRemoved(labels, 'l-web'))).toEqual(['Mobile', 'Q4']);
    expect(
      withLabelRemoved({ ...labels, options: [{ id: 'only', label: 'Sola' }] }, 'only'),
    ).toBeNull();
  });

  it('starts the colors from blue and wraps around the palette', () => {
    expect(nextLabelColor([])).toBe('blue');
    expect(nextLabelColor([{ id: 'x', label: 'X' }])).toBe('blue');
    expect(nextLabelColor([{ id: 'x', label: 'X', colorId: 'slate' }])).not.toBe('slate');
  });
});

describe('the filter by labels', () => {
  const projects = [
    project('app', ['l-mobile', 'l-q4']),
    project('site', ['l-web', 'l-q4']),
    project('cloud', []),
  ];
  const kept = (filter: LabelsFilter) =>
    filterByLabels(projects, config, filter).map((item) => item.id);

  it('keeps everything without labels chosen', () => {
    expect(kept(NO_LABELS_FILTER)).toEqual(['app', 'site', 'cloud']);
  });

  it('keeps the projects with one of the labels, or with all of them', () => {
    expect(kept({ ids: ['l-mobile', 'l-web'], match: 'any', unlabeled: false })).toEqual([
      'app',
      'site',
    ]);
    expect(kept({ ids: ['l-mobile', 'l-q4'], match: 'all', unlabeled: false })).toEqual(['app']);
  });

  it('adds the projects without labels when asked', () => {
    expect(kept({ ids: [], match: 'any', unlabeled: true })).toEqual(['cloud']);
    expect(kept({ ids: ['l-web'], match: 'any', unlabeled: true })).toEqual(['site', 'cloud']);
  });

  it('forgets the labels deleted since the filter was chosen', () => {
    expect(kept({ ids: ['gone'], match: 'all', unlabeled: false })).toEqual([
      'app',
      'site',
      'cloud',
    ]);
    expect(matchesLabels([], { ids: ['l-web'], match: 'any', unlabeled: false })).toBe(false);
  });

  it('reads a saved filter leniently', () => {
    expect(parseLabelsFilter({ ids: ['a', 'a', 3], match: 'all', unlabeled: true })).toEqual({
      ids: ['a'],
      match: 'all',
      unlabeled: true,
    });
    expect(parseLabelsFilter({})).toEqual(NO_LABELS_FILTER);
    expect(parseLabelsFilter('Mobile')).toBeNull();
  });

  it('says what it keeps in words', () => {
    const options = labels.options ?? [];
    expect(
      describeLabelsFilter({ ids: ['l-mobile'], match: 'any', unlabeled: false }, options),
    ).toBe('Mobile');
    expect(
      describeLabelsFilter(
        { ids: ['l-mobile', 'l-web', 'l-q4'], match: 'any', unlabeled: false },
        options,
      ),
    ).toBe('Mobile, Web o Q4');
    expect(
      describeLabelsFilter({ ids: ['l-mobile', 'l-web'], match: 'all', unlabeled: true }, options),
    ).toBe('Mobile e Web, o senza etichette');
    expect(describeLabelsFilter({ ids: [], match: 'any', unlabeled: true }, options)).toBe(
      'senza etichette',
    );
  });
});
