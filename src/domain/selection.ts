import { CALENDAR_DAYS, type PoolCycle, type WordEntry, type WordSnapshot } from './types';

/** Simpel, stabil strenghash (FNV-1a 32 bit). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministisk PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function snapshot(w: WordEntry): WordSnapshot {
  return { id: w.id, display: w.display, normalized: w.normalized, hint: w.hint };
}

/**
 * Vælger årets 24 kalenderord deterministisk ud fra indholdsversion og år.
 * Profil-id og sværhedsgrad indgår bevidst ikke, så alle profiler får samme ord.
 * Puljen sorteres efter id først, så rækkefølgen i kildefilen ikke påvirker resultatet.
 */
export function selectCalendarWords(
  pool: readonly WordEntry[],
  year: number,
  contentVersion: string,
  /** Håndvalgte ord: lågenummer → ord-id. Erstatter kun de nævnte låger. */
  overrides: Readonly<Record<number, string>> = {},
): WordSnapshot[] {
  if (pool.length < CALENDAR_DAYS) throw new Error('Kalenderpuljen er for lille');
  const sorted = [...pool].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const rng = mulberry32(hashString(`julekalender:${contentVersion}:${year}`));
  const picked = shuffle(sorted, rng).slice(0, CALENDAR_DAYS);
  const byId = new Map(pool.map((w) => [w.id, w]));
  for (const [dayStr, id] of Object.entries(overrides)) {
    const day = Number(dayStr);
    const word = byId.get(id);
    if (!word || day < 1 || day > CALENDAR_DAYS) throw new Error(`Ugyldigt håndvalgt ord: låge ${dayStr} → ${id}`);
    const existing = picked.findIndex((w) => w.id === id);
    // Står ordet allerede på en anden låge, byttes de, så der aldrig opstår dubletter.
    if (existing >= 0) [picked[existing], picked[day - 1]] = [picked[day - 1], picked[existing]];
    else picked[day - 1] = word;
  }
  return picked.map(snapshot);
}

/** Starter en ny blandet gennemgang og undgår at begynde med det senest viste ord. */
export function newCycle(ids: readonly string[], rng: () => number, lastId?: string): PoolCycle {
  const order = shuffle(ids, rng);
  if (order.length > 1 && lastId !== undefined && order[0] === lastId) {
    const swap = 1 + Math.floor(rng() * (order.length - 1));
    [order[0], order[swap]] = [order[swap], order[0]];
  }
  return { order, index: 0, lastId };
}

/**
 * Trækker næste ord fra en puljegennemgang. Ingen gentagelser før puljen er brugt;
 * derefter blandes igen uden straks at gentage seneste ord.
 * Ord-id'er som ikke længere findes i puljen (fx efter indholdsopdatering) springes over,
 * og nye ord i puljen kommer med ved næste gennemgang.
 */
export function drawFromCycle(
  cycle: PoolCycle | undefined,
  pool: readonly WordEntry[],
  rng: () => number,
  exclude: ReadonlySet<string> = new Set(),
): { word: WordEntry; cycle: PoolCycle } {
  const byId = new Map(pool.map((w) => [w.id, w]));
  const allIds = pool.map((w) => w.id);
  let c: PoolCycle = cycle ?? newCycle(allIds, rng);
  for (let attempts = 0; attempts < 3; attempts++) {
    while (c.index < c.order.length) {
      const id = c.order[c.index];
      c = { ...c, index: c.index + 1 };
      const w = byId.get(id);
      if (w && !exclude.has(id)) return { word: w, cycle: { ...c, lastId: id } };
    }
    c = newCycle(allIds, rng, c.lastId);
  }
  // Alt er ekskluderet – fald tilbage til et vilkårligt ord.
  const w = pool[Math.floor(rng() * pool.length)];
  return { word: w, cycle: { ...c, lastId: w.id } };
}
