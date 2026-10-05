import { describe, expect, it } from 'vitest';
import { strictestLight } from './approval';

describe('strictestLight', () => {
  it('takes the most restrictive light, ignoring days without one', () => {
    expect(strictestLight(['green', undefined, 'orange'])).toBe('orange');
    expect(strictestLight(['red', 'green'])).toBe('red');
    expect(strictestLight([undefined])).toBeUndefined();
  });
});
