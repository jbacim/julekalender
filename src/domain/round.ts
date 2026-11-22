import { isGuessableChar, lettersToGuess, normalizeLetter } from './letters';
import {
  HINT_AFTER_MISTAKES,
  MAX_MISTAKES,
  type Difficulty,
  type Round,
  type RoundMode,
  type WordSnapshot,
} from './types';

export interface CreateRoundInput {
  id: string;
  mode: RoundMode;
  word: WordSnapshot;
  difficulty: Difficulty;
  now: string;
  day?: number;
  year?: number;
}

export function createRound(input: CreateRoundInput): Round {
  return {
    id: input.id,
    mode: input.mode,
    day: input.day,
    year: input.year,
    word: { ...input.word },
    guessed: [],
    mistakes: 0,
    maxMistakes: MAX_MISTAKES,
    difficulty: input.difficulty,
    status: 'playing',
    hintUsed: false,
    startedAt: input.now,
  };
}

export type GuessEffect =
  | { kind: 'correct'; letter: string; occurrences: number }
  | { kind: 'wrong'; letter: string }
  | { kind: 'repeat'; letter: string }
  | { kind: 'invalid' }
  | { kind: 'notPlaying' };

export interface GuessResult {
  round: Round;
  effect: GuessEffect;
  /** Sand hvis netop dette gæt afsluttede runden. */
  finished: boolean;
}

/**
 * Ren funktion: anvender ét gæt på en runde.
 * Gentagne bogstaver og ugyldigt input koster aldrig et forsøg og returnerer samme objekt.
 */
export function applyGuess(round: Round, rawLetter: string, now: string): GuessResult {
  if (round.status !== 'playing') {
    return { round, effect: { kind: 'notPlaying' }, finished: false };
  }
  const letter = normalizeLetter(rawLetter);
  if (!letter) return { round, effect: { kind: 'invalid' }, finished: false };
  if (round.guessed.includes(letter)) {
    return { round, effect: { kind: 'repeat', letter }, finished: false };
  }

  const guessed = [...round.guessed, letter];
  const occurrences = [...round.word.normalized].filter((c) => c === letter).length;
  const mistakes = occurrences > 0 ? round.mistakes : round.mistakes + 1;

  let status: Round['status'] = 'playing';
  if (mistakes >= round.maxMistakes) status = 'lost';
  else if (isSolved(round.word.normalized, guessed)) status = 'won';

  const next: Round = {
    ...round,
    guessed,
    mistakes,
    status,
    finishedAt: status === 'playing' ? undefined : now,
  };
  return {
    round: next,
    effect: occurrences > 0 ? { kind: 'correct', letter, occurrences } : { kind: 'wrong', letter },
    finished: status !== 'playing',
  };
}

export function isSolved(normalized: string, guessed: readonly string[]): boolean {
  const g = new Set(guessed);
  for (const l of lettersToGuess(normalized)) if (!g.has(l)) return false;
  return true;
}

export interface MaskedChar {
  char: string;
  revealed: boolean;
  /** Mellemrum/bindestreg – vises automatisk og skal ikke gættes. */
  auto: boolean;
}

/** Ordet som pladser. Afslørede bogstaver vises med visningsordets bogstav, skjulte som tomme. */
export function maskWord(round: Round, revealAll = false): MaskedChar[] {
  const g = new Set(round.guessed);
  return [...round.word.normalized].map((ch) => {
    if (!isGuessableChar(ch)) return { char: ch, revealed: true, auto: true };
    return { char: ch, revealed: revealAll || g.has(ch), auto: false };
  });
}

export function giftsRemaining(round: Round): number {
  return Math.max(0, round.maxMistakes - round.mistakes);
}

/** Hint er kun tilgængeligt på Nem og først efter præcis fem fejl – resten af runden. */
export function isHintAvailable(round: Round): boolean {
  return round.difficulty === 'easy' && round.mistakes >= HINT_AFTER_MISTAKES;
}

export function markHintUsed(round: Round): Round {
  if (!isHintAvailable(round) || round.hintUsed) return round;
  return { ...round, hintUsed: true };
}

export function wrongLetters(round: Round): string[] {
  return round.guessed.filter((l) => !round.word.normalized.includes(l));
}

/** Gaver reddet ved sejr: 10 - fejl. Nederlag giver 0. */
export function giftsSavedFor(round: Round): number {
  return round.status === 'won' ? round.maxMistakes - round.mistakes : 0;
}

export { MAX_MISTAKES };
