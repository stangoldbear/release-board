import { describe, expect, it } from 'vitest';
import { defaultRoadmapConfig } from '../../domain/roadmapConfig';
import type { ProjectField } from '../../domain/types';
import { REQUIRED_PROBLEM, draftsFrom, valuesFrom } from './fieldDrafts';

const defaults = defaultRoadmapConfig();
const impactedTeams = defaults.fields.find((field) => field.id === 'impactedTeams')!;
const jiraEpics = defaults.fields.find((field) => field.id === 'jiraEpics')!;
const estimate = defaults.fields.find((field) => field.id === 'rawEstimationTotal')!;
const budget: ProjectField = {
  id: 'budget',
  label: 'Budget',
  type: 'price',
  multiple: false,
  required: true,
  main: false,
  position: 9,
};
const dates: ProjectField = {
  ...budget,
  id: 'dates',
  type: 'date',
  multiple: true,
  required: false,
};
const count: ProjectField = { ...budget, id: 'count', type: 'number', required: false };

describe('the drafts of the custom fields', () => {
  it('show the values of a project as text, one per line, choices by id and a price apart', () => {
    const drafts = draftsFrom([impactedTeams, jiraEpics, estimate, budget, dates, count], {
      impactedTeams: ['qa', 'ba', 'marketing'],
      jiraEpics: ['https://jira.example.com/E-1', 'https://jira.example.com/E-2'],
      estimate: [],
      budget: [{ amount: 12000.5, currency: 'EUR' }],
      dates: ['2026-10-05', '2026-11-02'],
      count: [1250.5],
    });
    expect(drafts.impactedTeams).toEqual({ kind: 'choice', ids: ['qa', 'ba'] });
    expect(drafts.jiraEpics).toEqual({
      kind: 'text',
      text: 'https://jira.example.com/E-1\nhttps://jira.example.com/E-2',
    });
    expect(drafts.rawEstimationTotal).toEqual({ kind: 'text', text: '' });
    expect(drafts.budget).toEqual({ kind: 'price', amount: '12.000,50', currency: 'EUR' });
    expect(drafts.dates).toEqual({ kind: 'text', text: '2026-10-05\n2026-11-02' });
    expect(drafts.count).toEqual({ kind: 'text', text: '1250,50' });
  });

  it('turn the drafts back into values, and say what does not fit', () => {
    const { values, problems } = valuesFrom(
      [impactedTeams, jiraEpics, estimate, budget, dates, count],
      {
        impactedTeams: { kind: 'choice', ids: ['ba', 'nope'] },
        jiraEpics: {
          kind: 'text',
          text: ' https://jira.example.com/E-1 \n\nhttps://jira.example.com/E-2',
        },
        rawEstimationTotal: { kind: 'text', text: '  55 giorni  ' },
        budget: { kind: 'price', amount: '12.000,50', currency: 'eur' },
        dates: { kind: 'text', text: '2026-10-05\n2026-11-02' },
        count: { kind: 'text', text: '1.250,5' },
      },
    );
    expect(problems).toEqual({});
    expect(values).toEqual({
      impactedTeams: ['ba'],
      jiraEpics: ['https://jira.example.com/E-1', 'https://jira.example.com/E-2'],
      rawEstimationTotal: ['55 giorni'],
      budget: [{ amount: 12000.5, currency: 'EUR' }],
      dates: ['2026-10-05', '2026-11-02'],
      count: [1250.5],
    });

    const broken = valuesFrom([jiraEpics, budget, dates, count], {
      jiraEpics: { kind: 'text', text: 'jira.example.com/E-1' },
      budget: { kind: 'price', amount: '', currency: 'EUR' },
      dates: { kind: 'text', text: '05/10/2026' },
      count: { kind: 'text', text: 'dodici' },
    });
    expect(broken.values).toEqual({});
    expect(broken.problems.jiraEpics).toMatch(/^Link non valido/);
    expect(broken.problems.budget).toBe(REQUIRED_PROBLEM);
    expect(broken.problems.dates).toMatch(/^Data non valida/);
    expect(broken.problems.count).toMatch(/^Numero non valido/);
  });

  it('read several prices, each with its currency or the default one', () => {
    const prices: ProjectField = { ...budget, multiple: true, required: false };
    expect(
      valuesFrom([prices], { budget: { kind: 'text', text: '12.000 EUR\n300 usd\n50' } }),
    ).toEqual({
      values: {
        budget: [
          { amount: 12000, currency: 'EUR' },
          { amount: 300, currency: 'USD' },
          { amount: 50, currency: 'EUR' },
        ],
      },
      problems: {},
    });
  });
});
