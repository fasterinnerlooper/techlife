import { describe, expect, it } from 'vitest';
import { inferRangeYears, overlapsYear, parseDateHint } from '../src/utils/dates.js';

describe('date parsing', () => {
  it('preserves year uncertainty', () => {
    const parsed = parseDateHint('2004');
    expect(parsed.precision).toBe('YEAR');
    expect(parsed.text).toBe('2004');
  });

  it('supports before/after hints', () => {
    expect(parseDateHint('before 2005').precision).toBe('BEFORE');
    expect(parseDateHint('after 2010').precision).toBe('AFTER');
  });

  it('overlap helper works', () => {
    const range = inferRangeYears('2007', '2009');
    expect(overlapsYear(range.start, range.end, 2008)).toBe(true);
    expect(overlapsYear(range.start, range.end, 2012)).toBe(false);
  });
});
