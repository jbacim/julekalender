import { describe, expect, it } from 'vitest';
import { CALENDAR_WORDS, FINALE_WORDS, FREEPLAY_WORDS } from './words';
import { REWARDS } from './rewards';
import { isValidNormalizedWord, normalizeText } from '../domain/letters';
import { selectCalendarWords } from '../domain/selection';

const pools = { calendar: CALENDAR_WORDS, freeplay: FREEPLAY_WORDS, finale: FINALE_WORDS };

describe('ordindhold', () => {
  it('har store nok puljer', () => {
    expect(CALENDAR_WORDS.length).toBeGreaterThanOrEqual(100);
    expect(FREEPLAY_WORDS.length).toBeGreaterThanOrEqual(50);
    expect(FINALE_WORDS.length).toBeGreaterThanOrEqual(50);
  });

  for (const [name, pool] of Object.entries(pools)) {
    it(`${name}: gyldige tegn, hints og ingen dubletter`, () => {
      const ids = new Set<string>();
      const words = new Set<string>();
      for (const w of pool) {
        expect(ids.has(w.id), `dublet-id ${w.id}`).toBe(false);
        expect(words.has(w.normalized), `dublet-ord ${w.display}`).toBe(false);
        ids.add(w.id);
        words.add(w.normalized);
        expect(isValidNormalizedWord(w.normalized), `ugyldigt ord ${w.display}`).toBe(true);
        expect(w.normalized).toBe(normalizeText(w.display));
        expect(w.hint.trim().length, `tomt hint ${w.id}`).toBeGreaterThan(5);
        expect([...w.normalized].length, `for langt ord ${w.display}`).toBeLessThanOrEqual(14);
        // Hintet må ikke indeholde selve ordet som helt ord
        const hintTokens = normalizeText(w.hint).split(/[^A-ZÆØÅ]+/);
        for (const part of w.normalized.split(/[ -]/)) {
          expect(hintTokens.includes(part), `hint afslører ${w.display}`).toBe(false);
        }
      }
    });
  }

  it('ingen overlap mellem puljer (hverken id eller ord)', () => {
    const seenIds = new Map<string, string>();
    const seenWords = new Map<string, string>();
    for (const [name, pool] of Object.entries(pools)) {
      for (const w of pool) {
        expect(seenIds.get(w.id), `id ${w.id} i både ${seenIds.get(w.id)} og ${name}`).toBeUndefined();
        expect(seenWords.get(w.normalized), `${w.display} i både ${seenWords.get(w.normalized)} og ${name}`).toBeUndefined();
        seenIds.set(w.id, name);
        seenWords.set(w.normalized, name);
      }
    }
  });

  it('kalendervalg er deterministisk, uden dubletter og varierer mellem år', () => {
    const a = selectCalendarWords(CALENDAR_WORDS, 2026, 'v1');
    const b = selectCalendarWords([...CALENDAR_WORDS].reverse(), 2026, 'v1');
    expect(a.map((w) => w.id)).toEqual(b.map((w) => w.id));
    expect(new Set(a.map((w) => w.id)).size).toBe(24);
    const c = selectCalendarWords(CALENDAR_WORDS, 2027, 'v1');
    expect(c.map((w) => w.id)).not.toEqual(a.map((w) => w.id));
  });
});

describe('belønningsoversigt', () => {
  it('har 23 unikke dekorationer og stjernen på dag 24', () => {
    expect(REWARDS).toHaveLength(24);
    expect(new Set(REWARDS.map((r) => r.id)).size).toBe(24);
    expect(REWARDS.map((r) => r.day)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(REWARDS[23].visual).toBe('star');
    expect(new Set(REWARDS.slice(0, 23).map((r) => r.visual)).size).toBeGreaterThanOrEqual(21);
    expect(REWARDS.some((r) => r.placement === 'world')).toBe(true);
    for (const r of REWARDS) expect(r.name.length).toBeGreaterThan(2);
  });
});
