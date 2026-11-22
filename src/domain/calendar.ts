import { CALENDAR_DAYS } from './types';

/** En kalenderdato i Europe/Copenhagen. */
export interface LocalDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export type SeasonState =
  /** 1.–24. december: dagens og tidligere låger er spilbare. */
  | { kind: 'inSeason'; year: number; today: number }
  /** 25. december og frem til næste 1. december: kun Freeplay. */
  | { kind: 'offSeason'; lastYear: number; nextYear: number };

export function seasonFor(date: LocalDate): SeasonState {
  if (date.month === 12 && date.day >= 1 && date.day <= CALENDAR_DAYS) {
    return { kind: 'inSeason', year: date.year, today: date.day };
  }
  if (date.month === 12) {
    return { kind: 'offSeason', lastYear: date.year, nextYear: date.year + 1 };
  }
  return { kind: 'offSeason', lastYear: date.year - 1, nextYear: date.year };
}

export type DoorAccess = 'playable' | 'locked' | 'closedSeason';

/** Kan en låge spilles i et givent år på en given dato? */
export function doorAccess(date: LocalDate, year: number, day: number): DoorAccess {
  const s = seasonFor(date);
  if (s.kind !== 'inSeason' || s.year !== year) {
    if (s.kind === 'inSeason' && year > s.year) return 'locked';
    if (s.kind === 'offSeason' && year >= s.nextYear) return 'locked';
    return 'closedSeason';
  }
  return day <= s.today ? 'playable' : 'locked';
}

/** Finalen kan kun spilles den 24. december. */
export function isFinaleDay(date: LocalDate, year: number): boolean {
  return date.year === year && date.month === 12 && date.day === CALENDAR_DAYS;
}

/** Det kalenderår, der vises på forsiden. */
export function displayYear(date: LocalDate): number {
  const s = seasonFor(date);
  if (s.kind === 'inSeason') return s.year;
  // Efter jul vises årets (nu lukkede) kalender; før december den kommende.
  return date.month === 12 ? s.lastYear : s.nextYear;
}

export function daysUntilSeason(date: LocalDate): number {
  const s = seasonFor(date);
  if (s.kind === 'inSeason') return 0;
  const from = Date.UTC(date.year, date.month - 1, date.day);
  const to = Date.UTC(s.nextYear, 11, 1);
  return Math.round((to - from) / 86_400_000);
}
