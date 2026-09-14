import { describe, expect, it } from 'vitest';
import { overlapsYear } from '../src/utils/dates.js';

describe('authorization regression placeholders', () => {
  it('timeline year overlap stays deterministic', () => {
    expect(overlapsYear(2010, 2012, 2011)).toBe(true);
  });
});
