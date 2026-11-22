/**
 * Domænetyper for Julekalender.
 * Ingen afhængigheder til rendering, storage, dato eller lyd.
 */

export type Difficulty = 'easy' | 'normal';

export type WordPool = 'calendar' | 'freeplay' | 'finale';

/** Redigerbart ordindhold (se src/content/words.ts). */
export interface WordEntry {
  /** Stabilt id – må aldrig genbruges til et andet ord. */
  id: string;
  /** Ord som det vises, fx "Risengrød". */
  display: string;
  /** Normaliseret form: NFC, store bogstaver (dansk), kun A–Z, Æ, Ø, Å, mellemrum og bindestreg. */
  normalized: string;
  /** Håndskrevet dansk hint, der ikke afslører ordet. */
  hint: string;
  category?: string;
}

/** Snapshot af et ord gemt sammen med runder og årsprogression, så indholdsopdateringer ikke ødelægger gemte spil. */
export interface WordSnapshot {
  id: string;
  display: string;
  normalized: string;
  hint: string;
}

export type RoundMode = 'calendar' | 'practice' | 'finale' | 'freeplay';

export type RoundStatus = 'playing' | 'won' | 'lost';

export interface Round {
  id: string;
  mode: RoundMode;
  /** Lågenummer for kalender-, øvelses- og finalerunder. */
  day?: number;
  /** Kalenderår for kalender-, øvelses- og finalerunder. */
  year?: number;
  word: WordSnapshot;
  /** Gættede bogstaver i gætterækkefølge (normaliserede, unikke). */
  guessed: string[];
  mistakes: number;
  maxMistakes: number;
  /** Fastlåst sværhedsgrad for runden. */
  difficulty: Difficulty;
  status: RoundStatus;
  hintUsed: boolean;
  startedAt: string;
  finishedAt?: string;
}

export type DayOutcome = 'won' | 'lost';

/** Officielt (første-forsøgs) resultat for en låge 1–23. Uforanderligt når sat. */
export interface DayResult {
  outcome: DayOutcome;
  /** 10 - fejl ved sejr, 0 ved nederlag. */
  giftsSaved: number;
  mistakes: number;
  roundId: string;
  completedAt: string;
}

export interface DayProgress {
  official?: DayResult;
  /** Igangværende eller senest afsluttede runde (officiel eller øvelse). */
  round?: Round;
  practiceRoundsPlayed: number;
}

export type FinaleStatus = 'notStarted' | 'inProgress' | 'won';

export interface FinaleProgress {
  status: FinaleStatus;
  roundsPlayed: number;
  /** Ord-id'er brugt i finalen i år (til at undgå gentagelser). */
  usedWordIds: string[];
  round?: Round;
  wonAt?: string;
  /** Sat i samme skrivning som sejren: nissen har returneret alle gaver. */
  giftsRefilled: boolean;
  /** Om finalepræsentationen er vist mindst én gang (kun præsentation). */
  presentationSeen: boolean;
}

export interface YearProgress {
  schema: 1;
  profileId: string;
  year: number;
  contentVersion: string;
  /** De 24 valgte ord for året (snapshot). Indeks 0 = låge 1. */
  calendarWords: WordSnapshot[];
  days: Record<number, DayProgress>;
  finale: FinaleProgress;
  /** Monoton tæller – hjælper med at opdage forældet state på tværs af faner. */
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type AvatarId =
  | 'ræv'
  | 'bjørn'
  | 'ugle'
  | 'pingvin'
  | 'rensdyr'
  | 'kanin'
  | 'kat'
  | 'snemand';

export interface Profile {
  schema: 1;
  id: string;
  nickname: string;
  avatar: AvatarId;
  difficulty: Difficulty;
  createdAt: string;
}

export interface AppSettings {
  schema: 1;
  soundOn: boolean;
  speechOn: boolean;
  reducedEffects: boolean;
  activeProfileId?: string;
  /** Sand når "Gem som app?" er vist én gang på denne enhed. */
  installPromptSeen?: boolean;
}

export interface PoolCycle {
  /** Rækkefølge af ord-id'er i den aktuelle gennemgang. */
  order: string[];
  index: number;
  lastId?: string;
}

export interface FreeplayProgress {
  schema: 1;
  profileId: string;
  cycle: PoolCycle;
  round?: Round;
  /** Kun til sjov – påvirker aldrig kalenderen. */
  wordsSolved: number;
  revision: number;
}

export type RewardPlacement = 'tree' | 'world';

export type DecorationVisual =
  | 'ball'
  | 'candyCane'
  | 'heart'
  | 'pinecone'
  | 'bell'
  | 'icicle'
  | 'flagGarland'
  | 'lightString'
  | 'drum'
  | 'gingerbread'
  | 'bird'
  | 'snowflake'
  | 'angel'
  | 'cone'
  | 'lantern'
  | 'snowman'
  | 'sled'
  | 'wreath'
  | 'reindeer'
  | 'birdFeeder'
  | 'porridge'
  | 'lampPost'
  | 'star';

export interface RewardDefinition {
  day: number;
  id: string;
  name: string;
  description: string;
  placement: RewardPlacement;
  visual: DecorationVisual;
  /** Primær og sekundær farve (hex). */
  colors: [string, string];
  /** 3D-placering. For træpynt: [vinkel i grader rundt om stammen, højde 0..1 op ad træet]. For verden: [x, z]. */
  position: [number, number];
  /** 2D-fallbackplacering i viewBox 0..400 x 0..300. */
  position2D: [number, number];
}

export const MAX_MISTAKES = 10;
export const GIFTS_PER_DAY = 10;
export const CALENDAR_DAYS = 24;
export const TOTAL_GIFTS = GIFTS_PER_DAY * CALENDAR_DAYS; // 240
export const HINT_AFTER_MISTAKES = 5;
