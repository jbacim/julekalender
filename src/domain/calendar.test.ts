import { describe, expect, it } from 'vitest';
import { daysUntilSeason, displayYear, doorAccess, isFinaleDay, seasonFor } from './calendar';
import { copenhagenInstant, toCopenhagenDate } from '../services/dateService';

describe('kalenderdatoer', () => {
  it('fremtidige låger er låst, dagens og missede er spilbare', () => {
    const d = { year: 2026, month: 12, day: 5 };
    expect(doorAccess(d, 2026, 1)).toBe('playable');
    expect(doorAccess(d, 2026, 5)).toBe('playable');
    expect(doorAccess(d, 2026, 6)).toBe('locked');
    expect(doorAccess(d, 2026, 24)).toBe('locked');
  });

  it('den 24. er alle låger spilbare', () => {
    const d = { year: 2026, month: 12, day: 24 };
    for (let i = 1; i <= 24; i++) expect(doorAccess(d, 2026, i)).toBe('playable');
    expect(isFinaleDay(d, 2026)).toBe(true);
  });

  it('fra 25. december er kalenderen lukket', () => {
    const d = { year: 2026, month: 12, day: 25 };
    expect(seasonFor(d).kind).toBe('offSeason');
    expect(doorAccess(d, 2026, 1)).toBe('closedSeason');
    expect(isFinaleDay(d, 2026)).toBe(false);
    expect(displayYear(d)).toBe(2026);
  });

  it('i november er næste kalender låst', () => {
    const d = { year: 2027, month: 11, day: 30 };
    expect(doorAccess(d, 2027, 1)).toBe('locked');
    expect(doorAccess(d, 2026, 1)).toBe('closedSeason');
    expect(displayYear(d)).toBe(2027);
    expect(daysUntilSeason(d)).toBe(1);
  });

  it('30/11 → 1/12 skifter ved midnat i dansk tid', () => {
    const before = toCopenhagenDate(copenhagenInstant(2026, 11, 30, 23, 59));
    const after = toCopenhagenDate(copenhagenInstant(2026, 12, 1, 0, 0));
    expect(doorAccess(before, 2026, 1)).toBe('locked');
    expect(doorAccess(after, 2026, 1)).toBe('playable');
    // 23:30 UTC den 30/11 er allerede 1/12 i København
    expect(toCopenhagenDate(new Date(Date.UTC(2026, 10, 30, 23, 30)))).toEqual({ year: 2026, month: 12, day: 1 });
  });

  it('24/12 → 25/12 lukker ved midnat i dansk tid', () => {
    const before = toCopenhagenDate(copenhagenInstant(2026, 12, 24, 23, 59));
    const after = toCopenhagenDate(copenhagenInstant(2026, 12, 25, 0, 0));
    expect(doorAccess(before, 2026, 10)).toBe('playable');
    expect(doorAccess(after, 2026, 10)).toBe('closedSeason');
    // 23:10 UTC den 24/12 er allerede 25/12 i København
    expect(toCopenhagenDate(new Date(Date.UTC(2026, 11, 24, 23, 10))).day).toBe(25);
  });
});
