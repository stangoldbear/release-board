import { describe, expect, it } from 'vitest';
import { readProjectDetails } from './projectUi';

describe('the details of the projects a browser shows', () => {
  it('keeps the known ones and leaves out the rest', () => {
    expect(readProjectDetails(['owner', 'dates', 'colour', 3])).toEqual(['owner', 'dates']);
    expect(readProjectDetails('owner')).toBeNull();
  });
});
