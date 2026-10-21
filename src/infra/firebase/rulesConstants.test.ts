import { describe, expect, it } from 'vitest';
import rules from '../../../firestore/firestore.rules?raw';
import { APPROVAL_LIGHTS } from '../../domain/approval';
import { ASSIGNMENT_NOTE_MAX, MAN_DAYS_MAX } from '../../domain/assignments';
import { TASK_COLOR_IDS } from '../../domain/colors';
import { HISTORY_ACTIONS, HISTORY_ENTITIES, HISTORY_SUMMARY_MAX } from '../../domain/history';
import { LANE_NAME_MAX } from '../../domain/lanes';
import { MEMO_BODY_MAX, MEMO_TITLE_MAX } from '../../domain/memos';
import {
  NOTE_LIST_ITEM_MAX,
  NOTE_LIST_MAX,
  PROJECT_NOTE_STATUSES,
  PROJECT_NOTE_TEXT_MAX,
} from '../../domain/projectNotes';
import { BORDER_STYLES, TASK_STATUSES } from '../../domain/plan';
import {
  PROJECT_ARRANGEMENTS,
  CONTINGENCY_SEGMENTS_MAX,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_OWNER_MAX,
  PROJECT_STATUSES,
  PROJECT_TITLE_MAX,
} from '../../domain/projects';
import { REMIND_DAYS_MAX } from '../../domain/projectReminders';
import {
  ABSENCES_MAX,
  CLOSURES_MAX,
  FIELD_DESCRIPTION_MAX,
  FIELD_LABEL_MAX,
  FIELD_OPTIONS_MAX,
  FIELD_TYPES,
  PROJECT_COLORS_MODES,
  PROJECT_FIELDS_MAX,
  STAKEHOLDER_INFO_MAX,
  STAKEHOLDER_NAME_MAX,
  TEAM_NAME_MAX,
  TEAM_PHASES,
  TEAM_TAG_MAX,
} from '../../domain/roadmapConfig';
import { FORMULA_MAX } from '../../domain/teamFormula';
import { MILESTONE_BODY_MAX, MILESTONE_TITLE_MAX } from '../../domain/milestones';
import { METRIC_ID, PLAN_ID } from './planDocs';

// The security rules repeat some lists and limits of the app. When they part, saving in a shared
// instance fails, and only there: these tests compare the two without the emulator.

/** Each list of strings the rules allow for a field, as in `data.colorId in ['yellow', …]`. */
function allowedLists(field: string): string[][] {
  const lists = rules.matchAll(new RegExp(`\\.${field}\\s+in\\s+\\[([^\\]]*)\\]`, 'g'));
  return [...lists].map(([, values = '']) =>
    [...values.matchAll(/'([^']*)'/g)].map(([, value = '']) => value).sort(),
  );
}

const sorted = (values: readonly string[]) => [...values].sort();

describe('the security rules', () => {
  it('allow the colors of tasks, free notes, projects, notes on the timeline and teams that the app has', () => {
    expect(allowedLists('colorId')).toEqual([
      sorted(TASK_COLOR_IDS),
      sorted(TASK_COLOR_IDS),
      sorted(TASK_COLOR_IDS),
      sorted(TASK_COLOR_IDS),
      sorted(TASK_COLOR_IDS),
    ]);
  });

  it('allow the states, borders and approval lights that the app has', () => {
    expect(allowedLists('status')).toEqual([
      sorted(TASK_STATUSES),
      sorted(PROJECT_STATUSES),
      sorted(PROJECT_NOTE_STATUSES),
    ]);
    expect(allowedLists('type')).toEqual([sorted(FIELD_TYPES)]);
    expect(allowedLists('phase')).toEqual([sorted(TEAM_PHASES)]);
    expect(allowedLists('arrangement')).toEqual([sorted(PROJECT_ARRANGEMENTS)]);
    expect(allowedLists('borderStyle')).toEqual([sorted(BORDER_STYLES)]);
    expect(allowedLists('approval')).toEqual([sorted(APPROVAL_LIGHTS)]);
  });

  it('allow the history entries that the app writes', () => {
    expect(allowedLists('entity')).toEqual([sorted(HISTORY_ENTITIES)]);
    expect(allowedLists('action')).toEqual([sorted(HISTORY_ACTIONS)]);
    expect(rules).toContain(`isText(data.summary, ${HISTORY_SUMMARY_MAX})`);
  });

  it('know the one plan and the one metric of the app', () => {
    expect(rules).toContain(`return planId == '${PLAN_ID}';`);
    expect(rules.match(new RegExp(`metricId == '${METRIC_ID}'`, 'g'))).toHaveLength(2);
  });

  it('limit the names of the lanes as the app does', () => {
    const lanes = rules.slice(rules.indexOf('match /lanes/'), rules.indexOf('match /tasks/'));
    expect(lanes).toContain(`isText(data.name, ${LANE_NAME_MAX})`);
  });

  it('limit the free notes as the app does', () => {
    expect(rules).toContain(`isText(data.title, ${MEMO_TITLE_MAX})`);
    expect(rules).toContain(`isText(data.body, ${MEMO_BODY_MAX})`);
  });

  it('limit the projects as the app does', () => {
    // Only the block of the projects: the notes have a title limit of their own.
    const projects = rules.slice(
      rules.indexOf('match /projects/'),
      rules.indexOf('match /history/'),
    );
    expect(projects).toContain(`isText(data.title, ${PROJECT_TITLE_MAX})`);
    expect(projects).toContain(`isText(data.owner, ${PROJECT_OWNER_MAX})`);
    expect(projects).toContain(`isText(data.description, ${PROJECT_DESCRIPTION_MAX})`);
    expect(projects).toContain(`data.fields.size() <= ${PROJECT_FIELDS_MAX}`);
    expect(projects).toContain(`data.contingency.manDays <= ${MAN_DAYS_MAX}`);
    expect(projects).toContain(`segments.size() <= ${CONTINGENCY_SEGMENTS_MAX}`);
    expect(projects).toContain(`isText(segment.note, ${ASSIGNMENT_NOTE_MAX})`);
    expect(projects).toContain(`isText(data.contingency.note, ${ASSIGNMENT_NOTE_MAX})`);
  });

  it('limit the notes of the projects, the assignments and the configuration as the app does', () => {
    const block = (start: string, end: string) =>
      rules.slice(rules.indexOf(`match /${start}/`), rules.indexOf(`match /${end}/`));
    const notes = block('projectNotes', 'milestones');
    expect(notes).toContain(`isText(data.text, ${PROJECT_NOTE_TEXT_MAX})`);
    for (const list of ['owners', 'tags']) {
      expect(notes).toContain(
        `isTextList(data.${list}, ${NOTE_LIST_MAX}, ${NOTE_LIST_MAX * NOTE_LIST_ITEM_MAX})`,
      );
    }
    const milestones = block('milestones', 'assignments');
    expect(milestones).toContain(`isText(data.title, ${MILESTONE_TITLE_MAX})`);
    expect(milestones).toContain(`isText(data.body, ${MILESTONE_BODY_MAX})`);
    const assignments = block('assignments', 'projectFields');
    expect(assignments).toContain(`data.manDays <= ${MAN_DAYS_MAX}`);
    expect(assignments).toContain(`isText(data.note, ${ASSIGNMENT_NOTE_MAX})`);
    const fields = block('projectFields', 'teams');
    expect(fields).toContain(`isText(data.label, ${FIELD_LABEL_MAX})`);
    expect(fields).toContain(`isText(data.description, ${FIELD_DESCRIPTION_MAX})`);
    expect(fields).toContain(`data.options.size() <= ${FIELD_OPTIONS_MAX}`);
    const teams = block('teams', 'stakeholders');
    expect(teams).toContain(`isText(data.name, ${TEAM_NAME_MAX})`);
    expect(teams).toContain(`isText(data.tag, ${TEAM_TAG_MAX})`);
    expect(teams).toContain(`isText(data.formula, ${FORMULA_MAX})`);
    const stakeholders = block('stakeholders', 'settings');
    expect(stakeholders).toContain(`isText(data.name, ${STAKEHOLDER_NAME_MAX})`);
    expect(stakeholders).toContain(`isText(data.info, ${STAKEHOLDER_INFO_MAX})`);
    expect(stakeholders).toContain(`data.absences.size() <= ${ABSENCES_MAX}`);
    expect(block('projects', 'projectNotes')).toContain(
      `data.remindDaysBefore <= ${REMIND_DAYS_MAX}`,
    );
    expect(block('settings', 'history')).toContain(
      `isText(data.contingencyFormula, ${FORMULA_MAX})`,
    );
    expect(block('settings', 'history')).toContain(`data.closures.size() <= ${CLOSURES_MAX}`);
    expect(block('settings', 'history')).toContain(
      `data.projectColors in [${PROJECT_COLORS_MODES.map((mode) => `'${mode}'`).join(', ')}]`,
    );
  });
});
