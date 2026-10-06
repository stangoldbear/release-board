import { describe, expect, it } from 'vitest';
import rules from '../../../firestore/firestore.rules?raw';
import { APPROVAL_LIGHTS } from '../../domain/approval';
import { ASSIGNMENT_NOTE_MAX, MAN_DAYS_MAX } from '../../domain/assignments';
import { TASK_COLOR_IDS } from '../../domain/colors';
import { HISTORY_ACTIONS, HISTORY_ENTITIES } from '../../domain/history';
import { MEMO_BODY_MAX, MEMO_TITLE_MAX } from '../../domain/memos';
import { PROJECT_NOTE_STATUSES, PROJECT_NOTE_TEXT_MAX } from '../../domain/projectNotes';
import { BORDER_STYLES, TASK_STATUSES } from '../../domain/plan';
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_OWNER_MAX,
  PROJECT_STATUSES,
  PROJECT_TITLE_MAX,
} from '../../domain/projects';
import {
  ABSENCES_MAX,
  FIELD_DESCRIPTION_MAX,
  FIELD_LABEL_MAX,
  FIELD_OPTIONS_MAX,
  FIELD_TYPES,
  PROJECT_FIELDS_MAX,
  STAKEHOLDER_INFO_MAX,
  STAKEHOLDER_NAME_MAX,
  TEAM_NAME_MAX,
  TEAM_TAG_MAX,
} from '../../domain/roadmapConfig';

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
  it('allow the colors of tasks, free notes, projects and teams that the app has', () => {
    expect(allowedLists('colorId')).toEqual([
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
    expect(allowedLists('borderStyle')).toEqual([sorted(BORDER_STYLES)]);
    expect(allowedLists('approval')).toEqual([sorted(APPROVAL_LIGHTS)]);
  });

  it('allow the history entries that the app writes', () => {
    expect(allowedLists('entity')).toEqual([sorted(HISTORY_ENTITIES)]);
    expect(allowedLists('action')).toEqual([sorted(HISTORY_ACTIONS)]);
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
  });

  it('limit the notes of the projects, the assignments and the configuration as the app does', () => {
    const block = (start: string, end: string) =>
      rules.slice(rules.indexOf(`match /${start}/`), rules.indexOf(`match /${end}/`));
    expect(block('projectNotes', 'assignments')).toContain(
      `isText(data.text, ${PROJECT_NOTE_TEXT_MAX})`,
    );
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
    const stakeholders = block('stakeholders', 'history');
    expect(stakeholders).toContain(`isText(data.name, ${STAKEHOLDER_NAME_MAX})`);
    expect(stakeholders).toContain(`isText(data.info, ${STAKEHOLDER_INFO_MAX})`);
    expect(stakeholders).toContain(`data.absences.size() <= ${ABSENCES_MAX}`);
  });
});
