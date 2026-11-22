import { describe, expect, it } from 'vitest';
import { applyGuess, createRound, giftsSavedFor, isHintAvailable, maskWord, markHintUsed } from './round';
import { isValidNormalizedWord, normalizeLetter, normalizeText } from './letters';
import type { Difficulty, Round } from './types';

const NOW = '2026-12-05T10:00:00.000Z';

function round(display: string, difficulty: Difficulty = 'normal'): Round {
  return createRound({
    id: 'r1',
    mode: 'calendar',
    word: { id: 'w', display, normalized: normalizeText(display), hint: 'hint' },
    difficulty,
    now: NOW,
  });
}

function play(r: Round, letters: string[]): Round {
  return letters.reduce((acc, l) => applyGuess(acc, l, NOW).round, r);
}

describe('ordgætning', () => {
  it('korrekt bogstav afslører alle forekomster', () => {
    const r = applyGuess(round('Kakao'), 'k', NOW);
    expect(r.effect).toEqual({ kind: 'correct', letter: 'K', occurrences: 2 });
    const mask = maskWord(r.round);
    expect(mask.filter((m) => m.revealed).map((m) => m.char)).toEqual(['K', 'K']);
    expect(r.round.mistakes).toBe(0);
  });

  it('gentaget bogstav koster intet og ændrer intet', () => {
    const r1 = applyGuess(round('Nisse'), 'X', NOW).round;
    expect(r1.mistakes).toBe(1);
    const again = applyGuess(r1, 'x', NOW);
    expect(again.effect.kind).toBe('repeat');
    expect(again.round).toBe(r1);
    expect(again.round.mistakes).toBe(1);
    const correct = applyGuess(r1, 'S', NOW).round;
    const correctAgain = applyGuess(correct, 'S', NOW);
    expect(correctAgain.round.mistakes).toBe(1);
    expect(correctAgain.round.guessed).toEqual(['X', 'S']);
  });

  it('præcis 10 fejl giver nederlag – 9 gør ikke', () => {
    const wrong = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'L', 'M', 'P'];
    const nine = play(round('Nisse'), wrong.slice(0, 9));
    expect(nine.status).toBe('playing');
    expect(nine.mistakes).toBe(9);
    const ten = applyGuess(nine, wrong[9], NOW);
    expect(ten.finished).toBe(true);
    expect(ten.round.status).toBe('lost');
    expect(giftsSavedFor(ten.round)).toBe(0);
    expect(applyGuess(ten.round, 'N', NOW).effect.kind).toBe('notPlaying');
  });

  it('10 fejlmuligheder – ikke 10 samlede valg', () => {
    const r = play(round('Juletræ'), ['J', 'U', 'L', 'E', 'T', 'R', 'B', 'C']);
    expect(r.guessed.length).toBe(8);
    expect(r.mistakes).toBe(2);
    expect(r.status).toBe('playing');
  });

  it('korrekt sidste bogstav giver sejr og 10 - fejl gaver', () => {
    const r = play(round('Sne'), ['S', 'X', 'Q', 'N']);
    expect(r.status).toBe('playing');
    const last = applyGuess(r, 'E', NOW);
    expect(last.finished).toBe(true);
    expect(last.round.status).toBe('won');
    expect(giftsSavedFor(last.round)).toBe(8);
  });

  it('sejr med 9 fejl giver 1 gave', () => {
    const r = play(round('Is'), ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'I', 'S']);
    expect(r.status).toBe('won');
    expect(giftsSavedFor(r)).toBe(1);
  });

  it('Æ, Ø og Å er selvstændige bogstaver', () => {
    const r = round('Æbleskive');
    expect(applyGuess(r, 'A', NOW).effect.kind).toBe('wrong');
    expect(applyGuess(r, 'æ', NOW).effect.kind).toBe('correct');
    const b = round('Bånd');
    expect(applyGuess(b, 'A', NOW).effect.kind).toBe('wrong');
    expect(applyGuess(b, 'å', NOW).effect.kind).toBe('correct');
    const o = round('Pebernød');
    expect(applyGuess(o, 'O', NOW).effect.kind).toBe('wrong');
    expect(applyGuess(o, 'Ø', NOW).effect.kind).toBe('correct');
  });

  it('normaliserer Unicode (NFD → NFC) og små/store bogstaver', () => {
    const decomposedAa = 'å'; // a + kombinerende ring
    expect(normalizeLetter(decomposedAa)).toBe('Å');
    expect(normalizeLetter('ø')).toBe('Ø');
    expect(normalizeLetter('Æ')).toBe('Æ');
    expect(normalizeLetter('1')).toBeNull();
    expect(normalizeLetter('ab')).toBeNull();
    expect(normalizeLetter('')).toBeNull();
    expect(normalizeLetter('é')).toBeNull();
    expect(normalizeText('måne')).toBe('MÅNE');
    const r = round('Måne');
    expect(applyGuess(r, decomposedAa, NOW).effect.kind).toBe('correct');
  });

  it('mellemrum og bindestreg vises automatisk og skal ikke gættes', () => {
    const r = round('God jul');
    const mask = maskWord(r);
    expect(mask[3]).toEqual({ char: ' ', revealed: true, auto: true });
    const won = play(r, ['G', 'O', 'D', 'J', 'U', 'L']);
    expect(won.status).toBe('won');
    const h = play(round('Kling-klang'), ['K', 'L', 'I', 'N', 'G', 'A']);
    expect(h.status).toBe('won');
    expect(isValidNormalizedWord('KLING-KLANG')).toBe(true);
    expect(isValidNormalizedWord('KLING--KLANG')).toBe(false);
    expect(isValidNormalizedWord('ABC1')).toBe(false);
  });

  it('ugyldigt input koster intet', () => {
    const r = round('Sne');
    const res = applyGuess(r, '7', NOW);
    expect(res.effect.kind).toBe('invalid');
    expect(res.round).toBe(r);
  });
});

describe('hint', () => {
  it('på Nem efter præcis fem fejl, ikke før', () => {
    let r = round('Nisse', 'easy');
    for (const [i, l] of ['B', 'C', 'D', 'F'].entries()) {
      r = applyGuess(r, l, NOW).round;
      expect(r.mistakes).toBe(i + 1);
      expect(isHintAvailable(r)).toBe(false);
    }
    r = applyGuess(r, 'G', NOW).round;
    expect(isHintAvailable(r)).toBe(true);
    r = applyGuess(r, 'N', NOW).round; // korrekt – stadig tilgængeligt
    expect(isHintAvailable(r)).toBe(true);
    r = applyGuess(r, 'H', NOW).round;
    expect(isHintAvailable(r)).toBe(true);
    const used = markHintUsed(r);
    expect(used.hintUsed).toBe(true);
    expect(used.mistakes).toBe(r.mistakes); // koster ikke gaver
  });

  it('aldrig på Normal', () => {
    const r = play(round('Nisse', 'normal'), ['B', 'C', 'D', 'F', 'G', 'H', 'J']);
    expect(isHintAvailable(r)).toBe(false);
    expect(markHintUsed(r)).toBe(r);
  });

  it('sværhedsgraden er låst i runden', () => {
    const r = round('Nisse', 'easy');
    expect(r.difficulty).toBe('easy');
    // Runden har sit eget snapshot; profilskift påvirker den ikke.
    const after = play(r, ['B', 'C', 'D', 'F', 'G']);
    expect(after.difficulty).toBe('easy');
  });
});
