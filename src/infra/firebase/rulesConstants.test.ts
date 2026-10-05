import { describe, expect, it } from 'vitest';
import rules from '../../../firestore/firestore.rules?raw';
import { APPROVAL_LIGHTS } from '../../domain/approval';
import { TASK_COLOR_IDS } from '../../domain/colors';
import { HISTORY_ACTIONS, HISTORY_ENTITIES } from '../../domain/history';
import { MEMO_BODY_MAX, MEMO_TITLE_MAX } from '../../domain/memos';
import { BORDER_STYLES, TASK_STATUSES } from '../../domain/plan';

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
  it('allow the colors of tasks and free notes that the app has', () => {
    expect(allowedLists('colorId')).toEqual([sorted(TASK_COLOR_IDS), sorted(TASK_COLOR_IDS)]);
  });

  it('allow the states, borders and approval lights that the app has', () => {
    expect(allowedLists('status')).toEqual([sorted(TASK_STATUSES)]);
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
});
