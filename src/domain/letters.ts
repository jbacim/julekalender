/** Det danske alfabet som spillet bruger. Æ, Ø og Å er selvstændige bogstaver. */
export const DANISH_ALPHABET: readonly string[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
  'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Æ', 'Ø', 'Å',
];

const ALPHABET_SET = new Set(DANISH_ALPHABET);

/** Tegn der vises automatisk og ikke skal gættes. */
export const AUTO_REVEALED = new Set([' ', '-']);

/**
 * Normaliserer tekst konsekvent: Unicode NFC (så fx "A" + kombinerende ring bliver "Å"),
 * dansk versalisering og trimning af mellemrum.
 */
export function normalizeText(input: string): string {
  return input.normalize('NFC').toLocaleUpperCase('da-DK').replace(/\s+/g, ' ').trim();
}

/**
 * Normaliserer et enkelt gæt. Returnerer null hvis input ikke er præcis ét gyldigt bogstav.
 * Æ/Ø/Å bevares som selvstændige bogstaver og foldes aldrig til A/O.
 */
export function normalizeLetter(input: string): string | null {
  if (typeof input !== 'string') return null;
  const n = input.normalize('NFC').toLocaleUpperCase('da-DK');
  if ([...n].length !== 1) return null;
  return ALPHABET_SET.has(n) ? n : null;
}

export function isGuessableChar(ch: string): boolean {
  return ALPHABET_SET.has(ch);
}

/** Validerer at en normaliseret form kun indeholder tilladte tegn. */
export function isValidNormalizedWord(word: string): boolean {
  if (word.length === 0 || word !== word.trim()) return false;
  if (/[ -]{2,}/.test(word) || /^[ -]|[ -]$/.test(word)) return false;
  return [...word].every((ch) => ALPHABET_SET.has(ch) || AUTO_REVEALED.has(ch));
}

/** Unikke bogstaver der skal gættes for at løse ordet. */
export function lettersToGuess(normalized: string): Set<string> {
  return new Set([...normalized].filter(isGuessableChar));
}
