import { doorAccess, isFinaleDay, seasonFor, type LocalDate } from '../domain/calendar';
import {
  createYearProgress,
  guessInYear,
  markFinalePresentationSeen,
  startDayRound,
  startFinaleRound,
  useHintInYear,
  type RoundTarget,
  type StartError,
} from '../domain/progress';
import { applyGuess, createRound, markHintUsed, type GuessEffect } from '../domain/round';
import { drawFromCycle, newCycle, selectCalendarWords, snapshot } from '../domain/selection';
import type {
  AppSettings,
  AvatarId,
  Difficulty,
  FreeplayProgress,
  Profile,
  Round,
  WordEntry,
  YearProgress,
} from '../domain/types';
import { calendarOverridesFor, CALENDAR_WORDS, CONTENT_VERSION, FINALE_WORDS, FREEPLAY_WORDS } from '../content/words';
import type { DateService } from '../services/dateService';
import type { GameStorage } from '../services/storage';

export interface ContentSet {
  version: string;
  calendar: readonly WordEntry[];
  freeplay: readonly WordEntry[];
  finale: readonly WordEntry[];
  /** Håndvalgte kalenderord: år → låge → ord-id. */
  overridesFor?: (year: number) => Readonly<Record<number, string>>;
}

export const DEFAULT_CONTENT: ContentSet = {
  version: CONTENT_VERSION,
  calendar: CALENDAR_WORDS,
  freeplay: FREEPLAY_WORDS,
  finale: FINALE_WORDS,
  overridesFor: calendarOverridesFor,
};

export type ServiceError =
  | 'locked'
  | 'seasonClosed'
  | 'notFinaleDay'
  | 'alreadyWon'
  | 'invalidDay'
  | 'noProfile'
  | 'stale';

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: ServiceError };

export interface GuessOutcome {
  round: Round;
  effect: GuessEffect | { kind: 'stale' };
  finished: boolean;
  rewardGranted: boolean;
  year?: YearProgress;
}

export type ChangeListener = (change: { profileId?: string; source: 'local' | 'remote' }) => void;

const CHANNEL = 'julekalender-sync';

let idCounter = 0;
export function makeId(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  idCounter++;
  return `${prefix}-${rnd}-${idCounter}`;
}

/**
 * Applikationslag: forbinder ren domænelogik med lagring og datotjeneste.
 * Alle spilhandlinger tjekker tilgængelighed mod datoen igen, før de udføres.
 */
export class GameService {
  private listeners = new Set<ChangeListener>();
  private channel: BroadcastChannel | null = null;

  constructor(
    readonly storage: GameStorage,
    readonly dates: DateService,
    readonly content: ContentSet = DEFAULT_CONTENT,
    private rng: () => number = Math.random,
  ) {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL);
        this.channel.onmessage = (e: MessageEvent) => {
          const profileId = typeof e.data?.profileId === 'string' ? e.data.profileId : undefined;
          this.emit({ profileId, source: 'remote' });
        };
      } catch {
        this.channel = null;
      }
    }
  }

  dispose(): void {
    this.channel?.close();
    this.listeners.clear();
  }

  subscribe(fn: ChangeListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(change: { profileId?: string; source: 'local' | 'remote' }): void {
    for (const l of this.listeners) l(change);
  }

  private changed(profileId?: string): void {
    this.emit({ profileId, source: 'local' });
    try {
      this.channel?.postMessage({ profileId });
    } catch {
      /* ignorer */
    }
  }

  today(): LocalDate {
    return this.dates.today();
  }

  // ---------- Profiler og indstillinger ----------

  listProfiles(): Promise<Profile[]> {
    return this.storage.listProfiles();
  }

  async createProfile(input: { nickname: string; avatar: AvatarId; difficulty: Difficulty }): Promise<Profile> {
    const nickname = input.nickname.trim().slice(0, 20);
    const profile: Profile = {
      schema: 1,
      id: makeId('p'),
      nickname: nickname || 'Nissebarn',
      avatar: input.avatar,
      difficulty: input.difficulty,
      createdAt: this.dates.nowIso(),
    };
    await this.storage.putProfile(profile);
    this.changed(profile.id);
    return profile;
  }

  async updateProfile(profile: Profile): Promise<void> {
    await this.storage.putProfile({ ...profile, nickname: profile.nickname.trim().slice(0, 20) || 'Nissebarn' });
    this.changed(profile.id);
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.storage.deleteProfile(profileId);
    this.changed(profileId);
  }

  getSettings(): Promise<AppSettings> {
    return this.storage.getSettings();
  }

  async saveSettings(s: AppSettings): Promise<void> {
    await this.storage.putSettings(s);
    this.changed();
  }

  // ---------- Kalender ----------

  getYear(profileId: string, year: number): Promise<YearProgress | undefined> {
    return this.storage.getYear(profileId, year);
  }

  listYears(profileId: string): Promise<YearProgress[]> {
    return this.storage.listYears(profileId);
  }

  /** Opretter årets kalender for profilen, hvis den mangler. Ordene gemmes som snapshot. */
  async ensureYear(profileId: string, year: number): Promise<YearProgress> {
    const existing = await this.storage.getYear(profileId, year);
    if (existing) return existing;
    const words = selectCalendarWords(this.content.calendar, year, this.content.version, this.content.overridesFor?.(year));
    const yp = await this.storage.updateYear(profileId, year, (cur) => {
      if (cur) return { next: cur, result: cur };
      const created = createYearProgress(profileId, year, this.content.version, words, this.dates.nowIso());
      return { next: created, result: created };
    });
    this.changed(profileId);
    return yp;
  }

  /** Låger der kan spilles nu (bruges før enhver spilhandling). */
  private checkDayAccess(year: number, day: number): ServiceError | null {
    const a = doorAccess(this.dates.today(), year, day);
    if (a === 'locked') return 'locked';
    if (a === 'closedSeason') return 'seasonClosed';
    return null;
  }

  private checkFinaleAccess(year: number): ServiceError | null {
    const today = this.dates.today();
    if (isFinaleDay(today, year)) return null;
    return seasonFor(today).kind === 'inSeason' && today.year === year ? 'notFinaleDay' : 'seasonClosed';
  }

  async startDay(profile: Profile, year: number, day: number): Promise<ActionResult<Round>> {
    const access = this.checkDayAccess(year, day);
    if (access) return { ok: false, error: access };
    await this.ensureYear(profile.id, year);
    const roundId = makeId('r');
    const now = this.dates.nowIso();
    const res = await this.storage.updateYear(profile.id, year, (cur) => {
      if (!cur) return { next: undefined, result: { ok: false as const, error: 'invalidDay' as StartError } };
      const r = startDayRound(cur, day, profile.difficulty, roundId, now);
      return { next: r.ok ? r.yp : undefined, result: r };
    });
    if (!res.ok) return { ok: false, error: res.error };
    if (!res.resumed) this.changed(profile.id);
    return { ok: true, value: res.round };
  }

  async startFinale(profile: Profile, year: number): Promise<ActionResult<Round>> {
    const access = this.checkFinaleAccess(year);
    if (access) return { ok: false, error: access };
    await this.ensureYear(profile.id, year);
    const roundId = makeId('r');
    const now = this.dates.nowIso();
    const res = await this.storage.updateYear(profile.id, year, (cur) => {
      if (!cur) return { next: undefined, result: { ok: false as const, error: 'invalidDay' as StartError } };
      const r = startFinaleRound(cur, profile.difficulty, roundId, now, this.content.finale, this.rng);
      return { next: r.ok ? r.yp : undefined, result: r };
    });
    if (!res.ok) return { ok: false, error: res.error };
    if (!res.resumed) this.changed(profile.id);
    return { ok: true, value: res.round };
  }

  /**
   * Gæt i kalender-/øvelses-/finalerunde. Tilgængelighed tjekkes igen, så en åben fane
   * ikke kan omgå sæsonlukningen. Belønning skrives i samme transaktion som gættet.
   */
  async guessCalendar(
    profileId: string,
    year: number,
    target: RoundTarget,
    roundId: string,
    letter: string,
  ): Promise<ActionResult<GuessOutcome>> {
    const access = target.kind === 'finale' ? this.checkFinaleAccess(year) : this.checkDayAccess(year, target.day);
    if (access) return { ok: false, error: access };
    const now = this.dates.nowIso();
    const res = await this.storage.updateYear(profileId, year, (cur) => {
      if (!cur) return { next: undefined, result: null };
      const r = guessInYear(cur, target, roundId, letter, now);
      return { next: r.yp, result: r };
    });
    if (!res || !res.round) return { ok: false, error: 'stale' };
    if (res.effect.kind === 'stale') return { ok: false, error: 'stale' };
    if (res.effect.kind === 'correct' || res.effect.kind === 'wrong') this.changed(profileId);
    return {
      ok: true,
      value: { round: res.round, effect: res.effect, finished: res.finished, rewardGranted: res.rewardGranted, year: res.yp },
    };
  }

  async useHintCalendar(profileId: string, year: number, target: RoundTarget, roundId: string): Promise<YearProgress | undefined> {
    const now = this.dates.nowIso();
    const yp = await this.storage.updateYear(profileId, year, (cur) => {
      if (!cur) return { next: undefined, result: undefined };
      const n = useHintInYear(cur, target, roundId, now);
      return { next: n, result: n };
    });
    this.changed(profileId);
    return yp;
  }

  async markFinaleSeen(profileId: string, year: number): Promise<void> {
    const now = this.dates.nowIso();
    await this.storage.updateYear(profileId, year, (cur) => {
      if (!cur) return { next: undefined, result: undefined };
      return { next: markFinalePresentationSeen(cur, now), result: undefined };
    });
    this.changed(profileId);
  }

  // ---------- Freeplay (påvirker aldrig kalenderdata) ----------

  getFreeplay(profileId: string): Promise<FreeplayProgress | undefined> {
    return this.storage.getFreeplay(profileId);
  }

  async startFreeplay(profile: Profile, forceNew = false): Promise<Round> {
    const roundId = makeId('fr');
    const now = this.dates.nowIso();
    const ids = this.content.freeplay.map((w) => w.id);
    const round = await this.storage.updateFreeplay(profile.id, (cur) => {
      if (cur?.round?.status === 'playing' && !forceNew) return { next: cur, result: cur.round };
      const base: FreeplayProgress = cur ?? {
        schema: 1,
        profileId: profile.id,
        cycle: newCycle(ids, this.rng),
        wordsSolved: 0,
        revision: 0,
      };
      const { word, cycle } = drawFromCycle(base.cycle, this.content.freeplay, this.rng);
      const r = createRound({ id: roundId, mode: 'freeplay', word: snapshot(word), difficulty: profile.difficulty, now });
      return { next: { ...base, cycle, round: r, revision: base.revision + 1 }, result: r };
    });
    return round;
  }

  async guessFreeplay(profileId: string, roundId: string, letter: string): Promise<ActionResult<GuessOutcome>> {
    const now = this.dates.nowIso();
    const res = await this.storage.updateFreeplay(profileId, (cur) => {
      if (!cur?.round || cur.round.id !== roundId) return { next: undefined, result: null };
      const g = applyGuess(cur.round, letter, now);
      if (g.round === cur.round) return { next: undefined, result: g };
      const solved = g.finished && g.round.status === 'won' ? 1 : 0;
      return {
        next: { ...cur, round: g.round, wordsSolved: cur.wordsSolved + solved, revision: cur.revision + 1 },
        result: g,
      };
    });
    if (!res) return { ok: false, error: 'stale' };
    return { ok: true, value: { round: res.round, effect: res.effect, finished: res.finished, rewardGranted: false } };
  }

  async useHintFreeplay(profileId: string, roundId: string): Promise<Round | undefined> {
    return this.storage.updateFreeplay(profileId, (cur) => {
      if (!cur?.round || cur.round.id !== roundId) return { next: undefined, result: undefined };
      const r = markHintUsed(cur.round);
      return { next: r === cur.round ? undefined : { ...cur, round: r, revision: cur.revision + 1 }, result: r };
    });
  }

  async clearAll(): Promise<void> {
    await this.storage.clearAll();
    this.changed();
  }
}
