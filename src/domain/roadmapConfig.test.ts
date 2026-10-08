import { describe, expect, it } from 'vitest';
import {
  coloredValueOf,
  colorsProjects,
  defaultRoadmapConfig,
  fieldValuesOf,
  fitsField,
  formatFieldValue,
  groupProjects,
  idFromLabel,
  isGroupable,
  isRoadmapId,
  missingRequiredFields,
  nextPosition,
  parseFieldInput,
  parseFieldValues,
  parseProjectField,
  parseStakeholder,
  parseTeam,
  stakeholdersByTeam,
  uniqueId,
} from './roadmapConfig';
import type { ProjectField, ProjectFieldValues } from './types';

const defaults = defaultRoadmapConfig();

describe('the default configuration', () => {
  it('has the teams, the people and the fields of the request, each with a valid id', () => {
    expect(defaults.teams.map((team) => team.tag)).toEqual([
      'ServerSide',
      'iOSDev',
      'AndDev',
      'QA',
      'BA',
      'CONTENT',
    ]);
    expect(defaults.stakeholders).toHaveLength(16);
    expect(defaults.stakeholders.map((item) => item.name)).toContain('iOS Dev #3');
    expect(defaults.fields.map((field) => field.id)).toEqual([
      'projectSize',
      'impactedTeams',
      'jiraRequest',
      'jiraEpics',
      'figma',
      'confluence',
      'stakeholders',
      'rawEstimationTotal',
      'rawEstimationElapsed',
    ]);
    for (const list of [defaults.teams, defaults.stakeholders, defaults.fields]) {
      expect(new Set(list.map((item) => item.id)).size).toBe(list.length);
      for (const item of list) expect(isRoadmapId(item.id)).toBe(true);
    }
  });

  it('keeps every person in a team that exists, each team in a different color', () => {
    const teamIds = new Set(defaults.teams.map((team) => team.id));
    for (const person of defaults.stakeholders) expect(teamIds.has(person.teamId)).toBe(true);
    expect(new Set(defaults.teams.map((team) => team.colorId)).size).toBe(defaults.teams.length);
    expect(stakeholdersByTeam(defaults).map((group) => group.stakeholders.length)).toEqual([
      3, 3, 3, 3, 2, 2,
    ]);
  });

  it('marks the main fields and the lists as the request says', () => {
    const byId = Object.fromEntries(defaults.fields.map((field) => [field.id, field]));
    expect(byId.impactedTeams).toMatchObject({ type: 'choice', multiple: true, main: true });
    expect(byId.impactedTeams?.options?.map((option) => option.label)).toEqual([
      'iOS Dev',
      'Android Dev',
      'Backend Dev',
      'Backend Config',
      'Content',
      'QA',
      'BA',
    ]);
    expect(byId.jiraRequest).toMatchObject({ type: 'url', multiple: false, main: false });
    expect(byId.jiraEpics).toMatchObject({ type: 'url', multiple: true, main: true });
    expect(byId.confluence).toMatchObject({ type: 'url', multiple: true, main: true });
    expect(byId.stakeholders).toMatchObject({ type: 'text', multiple: true });
    expect(byId.rawEstimationElapsed).toMatchObject({ type: 'text', main: true });
    expect(defaults.fields.every((field) => field.description)).toBe(true);
  });

  it('groups by the size of the projects, and colors the values of the lists', () => {
    const groupable = defaults.fields.filter(isGroupable);
    expect(groupable.map((field) => field.label)).toEqual(['Dimensione']);
    expect(groupable[0]?.options?.map((option) => option.label)).toEqual([
      'Big project',
      'Medium project',
      'Small project',
    ]);
    for (const field of defaults.fields.filter((item) => item.type === 'choice')) {
      const colors = field.options?.map((option) => option.colorId) ?? [];
      expect(colors.every(Boolean), field.id).toBe(true);
      expect(new Set(colors).size, field.id).toBe(colors.length);
    }
  });
});

describe('the fields that group the projects', () => {
  const size: ProjectField = {
    id: 'size',
    label: 'Dimensione',
    type: 'choice',
    multiple: false,
    required: false,
    main: true,
    group: true,
    position: 0,
    options: [
      { id: 'big', label: 'Big project', colorId: 'purple' },
      { id: 'small', label: 'Small project' },
    ],
  };

  it('are lists of exclusive values marked so', () => {
    expect(isGroupable(size)).toBe(true);
    expect(isGroupable({ ...size, group: undefined })).toBe(false);
    expect(isGroupable({ ...size, multiple: true })).toBe(false);
    expect(isGroupable({ ...size, type: 'text' })).toBe(false);
  });

  it('keep the flag only where it can group, and the colors the app knows', () => {
    const { id, ...data } = size;
    expect(parseProjectField(id, data, 0)).toEqual(size);
    expect(parseProjectField(id, { ...data, multiple: true }, 0)?.group).toBeUndefined();
    expect(parseProjectField(id, { ...data, group: 'yes' }, 0)?.group).toBeUndefined();
    const options = [{ id: 'big', label: 'Big project', colorId: 'pink' }];
    expect(parseProjectField(id, { ...data, options }, 0)?.options).toEqual([
      { id: 'big', label: 'Big project' },
    ]);
  });

  it('put the projects in the order of the values, then those without one', () => {
    const projects: { id: string; fields: ProjectFieldValues }[] = [
      { id: 'a', fields: { size: ['small'] } },
      { id: 'b', fields: {} },
      { id: 'c', fields: { size: ['big'] } },
      { id: 'd', fields: { size: ['gone'] } },
      { id: 'e', fields: { size: ['small'] } },
    ];
    const groups = groupProjects(projects, size);
    expect(groups.map((group) => group.option?.id ?? null)).toEqual(['big', 'small', null]);
    expect(groups.map((group) => group.projects.map((project) => project.id))).toEqual([
      ['c'],
      ['a', 'e'],
      ['b', 'd'],
    ]);
    expect(groupProjects([], size)).toEqual([]);
  });

  it('color the projects when they are exclusive and have a colored value, group or not', () => {
    expect(colorsProjects(size)).toBe(true);
    expect(colorsProjects({ ...size, group: undefined })).toBe(true);
    expect(colorsProjects({ ...size, multiple: true })).toBe(false);
    expect(colorsProjects({ ...size, options: [{ id: 'small', label: 'Small project' }] })).toBe(
      false,
    );
    expect(colorsProjects({ ...size, type: 'text', options: undefined })).toBe(false);
  });

  it('give a project the colored value it has, and nothing for a value without color', () => {
    expect(coloredValueOf({ fields: { size: ['big'] } }, size)).toEqual({
      id: 'big',
      label: 'Big project',
      colorId: 'purple',
    });
    expect(coloredValueOf({ fields: { size: ['small'] } }, size)).toBeNull();
    expect(coloredValueOf({ fields: { size: ['gone'] } }, size)).toBeNull();
    expect(coloredValueOf({ fields: {} }, size)).toBeNull();
  });
});

describe('parsing the configuration', () => {
  it('reads teams, people and fields, and refuses what does not fit', () => {
    expect(parseTeam('qa', { name: 'QA', tag: 'QA', colorId: 'ice' }, 3)).toEqual({
      id: 'qa',
      name: 'QA',
      tag: 'QA',
      colorId: 'ice',
      position: 3,
    });
    expect(parseTeam('qa', { name: 'QA', tag: 'QA', colorId: 'pink' }, 0)).toBeNull();
    expect(parseTeam('bad id!', { name: 'QA', tag: 'QA', colorId: 'ice' }, 0)).toBeNull();

    const person = parseStakeholder(
      'qa-1',
      {
        name: 'QA #1',
        teamId: 'qa',
        info: 'Part time',
        absences: [
          { start: '2026-12-20', end: '2027-01-20', reason: 'Ferie' },
          { start: '2026-08-10', end: '2026-08-14' },
          { start: '2026-08-14', end: '2026-08-10' },
          'not an absence',
        ],
        position: 7,
      },
      0,
    );
    expect(person?.absences).toEqual([
      { start: '2026-08-10', end: '2026-08-14' },
      { start: '2026-12-20', end: '2027-01-20', reason: 'Ferie' },
    ]);
    expect(person?.position).toBe(7);
    expect(parseStakeholder('qa-1', { name: 'QA #1' }, 0)).toBeNull();

    expect(parseProjectField('figma', { label: 'Figma', type: 'url', multiple: true }, 2)).toEqual({
      id: 'figma',
      label: 'Figma',
      type: 'url',
      multiple: true,
      required: false,
      main: false,
      position: 2,
    });
    expect(parseProjectField('x', { label: 'X', type: 'attachment' }, 0)).toBeNull();
    expect(parseProjectField('x', { label: 'X', type: 'choice' }, 0)).toBeNull();
    expect(
      parseProjectField(
        'x',
        {
          label: 'X',
          type: 'choice',
          options: [
            { id: 'a', label: 'A' },
            { id: 'a', label: 'B' },
          ],
        },
        0,
      ),
    ).toBeNull();
  });

  it('keeps the values of the fields that have the shape of values, and drops the rest', () => {
    expect(
      parseFieldValues({
        jiraEpics: ['https://jira.example.com/E-1', '', 42, { amount: 3, currency: 'EUR' }],
        broken: 'not a list',
        'bad id!': ['x'],
        price: [{ amount: '3', currency: 'EUR' }],
      }),
    ).toEqual({ jiraEpics: ['https://jira.example.com/E-1', 42, { amount: 3, currency: 'EUR' }] });
    expect(parseFieldValues([])).toBeNull();
  });
});

describe('field values', () => {
  const url: ProjectField = {
    id: 'jiraEpics',
    label: 'Jira epics',
    type: 'url',
    multiple: true,
    required: true,
    main: true,
    position: 0,
  };
  const choice = defaults.fields.find((field) => field.id === 'impactedTeams')!;
  const price: ProjectField = { ...url, id: 'budget', type: 'price', multiple: false };
  const date: ProjectField = { ...url, id: 'kickoff', type: 'date', multiple: false };
  const amount: ProjectField = { ...url, id: 'days', type: 'number', multiple: false };

  it('fit their field by type, and a choice by its options', () => {
    expect(fitsField(url, 'https://example.com')).toBe(true);
    expect(fitsField(url, 'ftp://example.com')).toBe(false);
    expect(fitsField(choice, 'qa')).toBe(true);
    expect(fitsField(choice, 'marketing')).toBe(false);
    expect(fitsField(price, { amount: 1, currency: 'EUR' })).toBe(true);
    expect(fitsField(date, '2026-02-30')).toBe(false);
    expect(fitsField(amount, '3')).toBe(false);
  });

  it('take one value from a single field and only the fitting ones from a list', () => {
    const fields = {
      budget: [
        { amount: 1, currency: 'EUR' },
        { amount: 2, currency: 'EUR' },
      ],
      jiraEpics: ['https://a.example', 'nope', 'https://b.example'],
    };
    expect(fieldValuesOf({ fields }, price)).toEqual([{ amount: 1, currency: 'EUR' }]);
    expect(fieldValuesOf({ fields }, url)).toEqual(['https://a.example', 'https://b.example']);
    expect(
      missingRequiredFields([url, { ...price, required: true }], { jiraEpics: ['nope'] }),
    ).toEqual([url, { ...price, required: true }]);
  });

  it('are written for people and read from what is typed', () => {
    expect(formatFieldValue(price, { amount: 12000, currency: 'EUR' })).toBe('12.000 EUR');
    expect(formatFieldValue(price, { amount: 12.5, currency: 'USD' })).toBe('12,50 USD');
    expect(formatFieldValue(date, '2026-12-15')).toBe('15/12/2026');
    expect(formatFieldValue(choice, 'backend-config')).toBe('Backend Config');
    expect(formatFieldValue(amount, 12345.5)).toBe('12.345,50');
    expect(parseFieldInput(amount, ' 1.250,5 ')).toBe(1250.5);
    expect(parseFieldInput(amount, 'dodici')).toBeNull();
    expect(parseFieldInput(price, '12.000', 'EUR')).toEqual({ amount: 12000, currency: 'EUR' });
    expect(parseFieldInput(price, '12', 'euro')).toBeNull();
    expect(parseFieldInput(url, 'example.com')).toBeNull();
    expect(parseFieldInput(url, 'https://example.com/x')).toBe('https://example.com/x');
    expect(parseFieldInput(date, '2026-13-01')).toBeNull();
    expect(parseFieldInput(choice, 'qa')).toBe('qa');
    expect(parseFieldInput({ ...url, type: 'text' }, '  ')).toBeNull();
  });
});

describe('ids', () => {
  it('come from the label, without accents, and get a number when taken', () => {
    expect(idFromLabel('Team impattati')).toBe('team-impattati');
    expect(idFromLabel('  Perché? ')).toBe('perche');
    expect(idFromLabel('***')).toBe('');
    expect(uniqueId('QA', [{ id: 'qa' }, { id: 'qa-2' }])).toBe('qa-3');
    expect(uniqueId('***', [])).toBe('voce');
    expect(nextPosition([{ position: 2 }, { position: 5 }])).toBe(6);
    expect(nextPosition([])).toBe(0);
  });
});
