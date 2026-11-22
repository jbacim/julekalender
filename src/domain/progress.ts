import { applyGuess, createRound, giftsSavedFor, markHintUsed, type GuessEffect } from './round';
import {
  CALENDAR_DAYS,
  TOTAL_GIFTS,
  type DayProgress,
  type Difficulty,
  type RewardDefinition,
  type Round,
  type WordEntry,
  type WordSnapshot,
  type YearProgress,
} from './types';
import { snapshot } from './selection';
import type { DoorAccess } from './calendar';

export function createYearProgress(
  profileId: string,
  year: number,
  contentVersion: string,
  calendarWords: WordSnapshot[],
  now: string,
): YearProgress {
  if (calendarWords.length !== CALENDAR_DAYS) throw new Error('Der skal være 24 kalenderord');
  return {
    schema: 1,
    profileId,
    year,
    contentVersion,
    calendarWords: calendarWords.map((w) => ({ ...w })),
    days: {},
    finale: {
      status: 'notStarted',
      roundsPlayed: 0,
      usedWordIds: [],
      giftsRefilled: false,
      presentationSeen: false,
    },
    revision: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function dayProgress(yp: YearProgress, day: number): DayProgress {
  return yp.days[day] ?? { practiceRoundsPlayed: 0 };
}

function bump(yp: YearProgress, now: string): YearProgress {
  return { ...yp, revision: yp.revision + 1, updatedAt: now };
}

export type RoundTarget = { kind: 'day'; day: number } | { kind: 'finale' };

export type StartError = 'invalidDay' | 'alreadyWon';

export type StartResult =
  | { ok: true; yp: YearProgress; round: Round; resumed: boolean }
  | { ok: false; error: StartError };

/**
 * Starter (eller genoptager) en runde for låge 1–23.
 * - Igangværende runde genoptages altid (genindlæsning/profilskift nulstiller intet).
 * - Uden resultat eller efter nederlag: et nyt rigtigt forsøg. Vindes det, gives pynt og
 *   de reddede gaver – så alle børn kan få al pynten til deres træ.
 * - Efter sejr: lågen er klaret (ingen flere belønninger).
 */
export function startDayRound(
  yp: YearProgress,
  day: number,
  difficulty: Difficulty,
  roundId: string,
  now: string,
): StartResult {
  if (!Number.isInteger(day) || day < 1 || day >= CALENDAR_DAYS) return { ok: false, error: 'invalidDay' };
  const dp = dayProgress(yp, day);
  if (dp.round && dp.round.status === 'playing') {
    return { ok: true, yp, round: dp.round, resumed: true };
  }
  if (dp.official?.outcome === 'won') return { ok: false, error: 'alreadyWon' };
  const round = createRound({
    id: roundId,
    mode: 'calendar',
    day,
    year: yp.year,
    word: yp.calendarWords[day - 1],
    difficulty,
    now,
  });
  const next: DayProgress = { ...dp, round };
  return { ok: true, yp: bump({ ...yp, days: { ...yp.days, [day]: next } }, now), round, resumed: false };
}

/**
 * Starter eller genoptager en finalerunde den 24.
 * Første finalerunde bruger lågens eget ord; efter nederlag trækkes et nyt ord fra finalepuljen.
 */
export function startFinaleRound(
  yp: YearProgress,
  difficulty: Difficulty,
  roundId: string,
  now: string,
  finalePool: readonly WordEntry[],
  rng: () => number,
): StartResult {
  const f = yp.finale;
  if (f.status === 'won') return { ok: false, error: 'alreadyWon' };
  if (f.round && f.round.status === 'playing') return { ok: true, yp, round: f.round, resumed: true };

  let word: WordSnapshot;
  if (f.roundsPlayed === 0) {
    word = yp.calendarWords[CALENDAR_DAYS - 1];
  } else {
    const used = new Set(f.usedWordIds);
    let candidates = finalePool.filter((w) => !used.has(w.id));
    if (candidates.length === 0) {
      // Puljen er gennemløbet – bland igen, men undgå det seneste ord.
      const last = f.round?.word.id;
      candidates = finalePool.filter((w) => w.id !== last);
    }
    if (candidates.length === 0) candidates = [...finalePool];
    word = snapshot(candidates[Math.floor(rng() * candidates.length)]);
  }
  // Ved ny gennemgang af puljen nulstilles listen over brugte ord.
  const usedAfter = f.usedWordIds.includes(word.id) ? [word.id] : [...f.usedWordIds, word.id];
  const round = createRound({ id: roundId, mode: 'finale', day: CALENDAR_DAYS, year: yp.year, word, difficulty, now });
  return {
    ok: true,
    yp: bump(
      {
        ...yp,
        finale: { ...f, status: 'inProgress', roundsPlayed: f.roundsPlayed + 1, usedWordIds: usedAfter, round },
      },
      now,
    ),
    round,
    resumed: false,
  };
}

export function roundFor(yp: YearProgress, target: RoundTarget): Round | undefined {
  return target.kind === 'finale' ? yp.finale.round : yp.days[target.day]?.round;
}

export interface YearGuessResult {
  yp: YearProgress;
  round: Round | undefined;
  effect: GuessEffect | { kind: 'stale' };
  finished: boolean;
  /** Sand hvis dette gæt fastlagde et officielt resultat eller vandt finalen. */
  rewardGranted: boolean;
}

/**
 * Anvender et gæt i en kalender-/øvelses-/finalerunde på det NYESTE gemte state.
 * Officielt resultat og finalesejr skrives i samme opdatering som det afgørende gæt,
 * og kun hvis de ikke allerede findes – derfor er belønninger idempotente.
 */
export function guessInYear(
  yp: YearProgress,
  target: RoundTarget,
  roundId: string,
  letter: string,
  now: string,
): YearGuessResult {
  const current = roundFor(yp, target);
  if (!current || current.id !== roundId) {
    return { yp, round: current, effect: { kind: 'stale' }, finished: false, rewardGranted: false };
  }
  const res = applyGuess(current, letter, now);
  if (res.round === current) {
    return { yp, round: current, effect: res.effect, finished: false, rewardGranted: false };
  }
  const round = res.round;
  let rewardGranted = false;

  if (target.kind === 'finale') {
    let finale = { ...yp.finale, round };
    if (round.status === 'won' && yp.finale.status !== 'won') {
      finale = { ...finale, status: 'won', wonAt: now, giftsRefilled: true };
      rewardGranted = true;
    }
    return { yp: bump({ ...yp, finale }, now), round, effect: res.effect, finished: res.finished, rewardGranted };
  }

  const dp = dayProgress(yp, target.day);
  let nextDp: DayProgress = { ...dp, round };
  // Resultatet opdateres, så længe lågen ikke er vundet. En sejr er endelig (idempotent).
  // (Ældre gemte øverunder med mode 'practice' ændrer aldrig resultatet.)
  if (res.finished && round.mode === 'calendar' && dp.official?.outcome !== 'won') {
    nextDp = {
      ...nextDp,
      official: {
        outcome: round.status === 'won' ? 'won' : 'lost',
        giftsSaved: giftsSavedFor(round),
        mistakes: round.mistakes,
        roundId: round.id,
        completedAt: now,
        attempts: (dp.official?.attempts ?? (dp.official ? 1 : 0)) + 1,
      },
    };
    rewardGranted = round.status === 'won';
  }
  return {
    yp: bump({ ...yp, days: { ...yp.days, [target.day]: nextDp } }, now),
    round,
    effect: res.effect,
    finished: res.finished,
    rewardGranted,
  };
}

export function useHintInYear(yp: YearProgress, target: RoundTarget, roundId: string, now: string): YearProgress {
  const current = roundFor(yp, target);
  if (!current || current.id !== roundId || current.status !== 'playing') return yp;
  const round = markHintUsed(current);
  if (round === current) return yp;
  if (target.kind === 'finale') return bump({ ...yp, finale: { ...yp.finale, round } }, now);
  const dp = dayProgress(yp, target.day);
  return bump({ ...yp, days: { ...yp.days, [target.day]: { ...dp, round } } }, now);
}

export function markFinalePresentationSeen(yp: YearProgress, now: string): YearProgress {
  if (yp.finale.status !== 'won' || yp.finale.presentationSeen) return yp;
  return bump({ ...yp, finale: { ...yp.finale, presentationSeen: true } }, now);
}

/**
 * Samlet gaveantal udledt af officielle resultater.
 * Efter finalesejr er totalen altid præcis 240 – også hvis missede låger vindes bagefter.
 */
export function totalGifts(yp: YearProgress | undefined): number {
  if (!yp) return 0;
  if (yp.finale.status === 'won' && yp.finale.giftsRefilled) return TOTAL_GIFTS;
  let sum = 0;
  for (let d = 1; d < CALENDAR_DAYS; d++) sum += yp.days[d]?.official?.giftsSaved ?? 0;
  return Math.min(sum, TOTAL_GIFTS);
}

/** Første-forsøgsgaver (historik), uafhængigt af finaleopfyldning. */
export function firstTryGifts(yp: YearProgress): number {
  let sum = 0;
  for (let d = 1; d < CALENDAR_DAYS; d++) sum += yp.days[d]?.official?.giftsSaved ?? 0;
  return sum;
}

export function hasStar(yp: YearProgress | undefined): boolean {
  return yp?.finale.status === 'won';
}

/** Dekorationer udledes af officielle sejre – derfor kan de aldrig gives dobbelt eller mistes. */
export function earnedRewards(yp: YearProgress | undefined, rewards: readonly RewardDefinition[]): RewardDefinition[] {
  if (!yp) return [];
  return rewards.filter((r) => {
    if (r.day === CALENDAR_DAYS) return yp.finale.status === 'won';
    return yp.days[r.day]?.official?.outcome === 'won';
  });
}

export type DoorStatus = 'locked' | 'available' | 'inProgress' | 'won' | 'lost' | 'missed';

export function doorStatus(yp: YearProgress | undefined, day: number, access: DoorAccess): DoorStatus {
  if (day === CALENDAR_DAYS) {
    const f = yp?.finale;
    if (f?.status === 'won') return 'won';
    if (access === 'locked') return 'locked';
    if (f?.status === 'inProgress') return access === 'playable' ? 'inProgress' : 'missed';
    return access === 'playable' ? 'available' : 'missed';
  }
  const dp = yp?.days[day];
  if (dp?.official) return dp.official.outcome;
  if (access === 'locked') return 'locked';
  if (dp?.round?.status === 'playing') return access === 'playable' ? 'inProgress' : 'missed';
  return access === 'playable' ? 'available' : 'missed';
}
