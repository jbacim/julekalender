import { GameService } from '../app/gameService';
import { AdjustableDateService, copenhagenInstant } from '../services/dateService';
import { MemoryStorage } from '../services/storage';
import { mulberry32 } from '../domain/selection';
import type { Profile, Round } from '../domain/types';
import { DANISH_ALPHABET } from '../domain/letters';

export function setup(date: [number, number, number, number?] = [2026, 12, 5]) {
  const storage = new MemoryStorage();
  const dates = new AdjustableDateService(copenhagenInstant(date[0], date[1], date[2], date[3] ?? 12));
  const service = new GameService(storage, dates, undefined, mulberry32(42));
  return { storage, dates, service };
}

export function setDate(dates: AdjustableDateService, y: number, m: number, d: number, h = 12, min = 0) {
  dates.setFixed(copenhagenInstant(y, m, d, h, min));
}

export async function makeProfile(service: GameService, nickname = 'Ida', difficulty: Profile['difficulty'] = 'normal') {
  return service.createProfile({ nickname, avatar: 'ræv', difficulty });
}

export function correctLetters(round: Round): string[] {
  return [...new Set([...round.word.normalized].filter((c) => DANISH_ALPHABET.includes(c)))];
}

export function wrongLetters(round: Round, n: number): string[] {
  return DANISH_ALPHABET.filter((l) => !round.word.normalized.includes(l)).slice(0, n);
}
