import type { AppSettings, FreeplayProgress, Profile, Round, WordSnapshot, YearProgress } from '../../domain/types';
import { CALENDAR_DAYS } from '../../domain/types';
import { DEFAULT_SETTINGS } from './types';

/**
 * Strukturel validering af gemte data. Beskadigede poster sættes til side frem for at
 * vælte appen. Når skemaet ændres, tilføjes migrering her (schema 1 → 2 osv.).
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isWord(v: unknown): v is WordSnapshot {
  return isObj(v) && isStr(v.id) && isStr(v.display) && isStr(v.normalized) && v.normalized.length > 0 && isStr(v.hint);
}

function isRound(v: unknown): v is Round {
  return (
    isObj(v) &&
    isStr(v.id) &&
    ['calendar', 'practice', 'finale', 'freeplay'].includes(v.mode as string) &&
    isWord(v.word) &&
    Array.isArray(v.guessed) &&
    v.guessed.every(isStr) &&
    isNum(v.mistakes) &&
    isNum(v.maxMistakes) &&
    v.mistakes >= 0 &&
    v.mistakes <= v.maxMistakes &&
    (v.difficulty === 'easy' || v.difficulty === 'normal') &&
    ['playing', 'won', 'lost'].includes(v.status as string)
  );
}

export function isProfile(v: unknown): v is Profile {
  return (
    isObj(v) &&
    v.schema === 1 &&
    isStr(v.id) &&
    isStr(v.nickname) &&
    isStr(v.avatar) &&
    (v.difficulty === 'easy' || v.difficulty === 'normal')
  );
}

export function isYearProgress(v: unknown): v is YearProgress {
  if (!isObj(v) || v.schema !== 1 || !isStr(v.profileId) || !isNum(v.year) || !isStr(v.contentVersion)) return false;
  if (!Array.isArray(v.calendarWords) || v.calendarWords.length !== CALENDAR_DAYS || !v.calendarWords.every(isWord)) return false;
  if (!isObj(v.days) || !isObj(v.finale) || !isNum(v.revision)) return false;
  for (const [k, d] of Object.entries(v.days)) {
    const day = Number(k);
    if (!Number.isInteger(day) || day < 1 || day > CALENDAR_DAYS || !isObj(d)) return false;
    if (d.round !== undefined && !isRound(d.round)) return false;
    if (d.official !== undefined) {
      const o = d.official;
      if (!isObj(o) || (o.outcome !== 'won' && o.outcome !== 'lost') || !isNum(o.giftsSaved)) return false;
      if (o.giftsSaved < 0 || o.giftsSaved > 10) return false;
    }
  }
  const f = v.finale;
  if (!['notStarted', 'inProgress', 'won'].includes(f.status as string) || !Array.isArray(f.usedWordIds)) return false;
  if (f.round !== undefined && !isRound(f.round)) return false;
  return true;
}

export function isFreeplay(v: unknown): v is FreeplayProgress {
  return (
    isObj(v) &&
    v.schema === 1 &&
    isStr(v.profileId) &&
    isObj(v.cycle) &&
    Array.isArray(v.cycle.order) &&
    isNum(v.cycle.index) &&
    (v.round === undefined || isRound(v.round))
  );
}

export function normalizeSettings(v: unknown): AppSettings {
  if (!isObj(v) || v.schema !== 1) return { ...DEFAULT_SETTINGS };
  return {
    schema: 1,
    soundOn: typeof v.soundOn === 'boolean' ? v.soundOn : DEFAULT_SETTINGS.soundOn,
    speechOn: typeof v.speechOn === 'boolean' ? v.speechOn : DEFAULT_SETTINGS.speechOn,
    reducedEffects: typeof v.reducedEffects === 'boolean' ? v.reducedEffects : DEFAULT_SETTINGS.reducedEffects,
    activeProfileId: isStr(v.activeProfileId) ? v.activeProfileId : undefined,
    installPromptSeen: v.installPromptSeen === true ? true : undefined,
  };
}
