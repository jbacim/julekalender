import type { AppSettings, FreeplayProgress, Profile, YearProgress } from '../../domain/types';

export interface Update<R, T> {
  /** Ny værdi der skal gemmes, eller samme objekt / undefined for ingen ændring. */
  next: R | undefined;
  result: T;
}

/**
 * Versionsstyret lokal lagring. Opdateringer er atomare read-modify-write på den NYESTE
 * gemte værdi, så en forældet fane aldrig kan overskrive et afsluttet resultat.
 */
export interface GameStorage {
  readonly kind: 'indexeddb' | 'memory';
  /** Sand hvis data overlever genindlæsning. */
  readonly persistent: boolean;

  listProfiles(): Promise<Profile[]>;
  putProfile(profile: Profile): Promise<void>;
  /** Sletter profil og alle dens data. */
  deleteProfile(profileId: string): Promise<void>;

  getYear(profileId: string, year: number): Promise<YearProgress | undefined>;
  listYears(profileId: string): Promise<YearProgress[]>;
  updateYear<T>(
    profileId: string,
    year: number,
    fn: (current: YearProgress | undefined) => Update<YearProgress, T>,
  ): Promise<T>;

  getFreeplay(profileId: string): Promise<FreeplayProgress | undefined>;
  updateFreeplay<T>(
    profileId: string,
    fn: (current: FreeplayProgress | undefined) => Update<FreeplayProgress, T>,
  ): Promise<T>;

  getSettings(): Promise<AppSettings>;
  putSettings(settings: AppSettings): Promise<void>;

  /** Antal beskadigede poster, der er sat til side siden start. */
  quarantinedCount(): number;
  clearAll(): Promise<void>;
}

export class StorageWriteError extends Error {
  constructor(cause?: unknown) {
    super('Kunne ikke gemme');
    this.name = 'StorageWriteError';
    this.cause = cause;
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  schema: 1,
  soundOn: true,
  speechOn: false,
  reducedEffects: false,
};
