import { describe, expect, it } from 'vitest';
import { formatShortDate } from '@/lib/format';

describe('formatShortDate', () => {
  it('formats date as "Feb 5, 2026"', () => {
    const date = new Date('2026-02-05T12:00:00.000Z');
    expect(formatShortDate(date)).toBe('Feb 5, 2026');
  });

  it('single-digit day, no leading zero', () => {
    const date = new Date('2026-03-03T12:00:00.000Z');
    expect(formatShortDate(date)).toBe('Mar 3, 2026');
  });

  it('end-of-year boundary', () => {
    const date = new Date('2026-12-31T12:00:00.000Z');
    expect(formatShortDate(date)).toBe('Dec 31, 2026');
  });
});
