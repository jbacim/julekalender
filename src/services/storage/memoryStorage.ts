import type { AppSettings, FreeplayProgress, Profile, YearProgress } from '../../domain/types';
import { DEFAULT_SETTINGS, StorageWriteError, type GameStorage, type Update } from './types';
import { isFreeplay, isProfile, isYearProgress, normalizeSettings } from './validate';

const clone = <T>(v: T): T => (v === undefined ? v : structuredClone(v));

/**
 * Hukommelsesbaseret lagring. Bruges i tests og som nødløsning, når IndexedDB ikke er tilgængelig
 * (data forsvinder så ved genindlæsning – det fortæller UI'et tydeligt).
 */
export class MemoryStorage implements GameStorage {
  readonly kind = 'memory' as const;
  readonly persistent = false;
  /** Sæt til true i tests for at simulere skrivefejl. */
  failWrites = false;

  private profiles = new Map<string, unknown>();
  private years = new Map<string, unknown>();
  private freeplay = new Map<string, unknown>();
  private settings: unknown = { ...DEFAULT_SETTINGS };
  private quarantine: unknown[] = [];

  /** Kun til tests: indsæt rå (evt. beskadigede) data. */
  injectRaw(store: 'profiles' | 'years' | 'freeplay', key: string, value: unknown): void {
    ({ profiles: this.profiles, years: this.years, freeplay: this.freeplay })[store].set(key, value);
  }

  private check(): void {
    if (this.failWrites) throw new StorageWriteError(new Error('simuleret skrivefejl'));
  }

  async listProfiles(): Promise<Profile[]> {
    const out: Profile[] = [];
    for (const [k, v] of this.profiles) {
      if (isProfile(v)) out.push(clone(v));
      else {
        this.quarantine.push(v);
        this.profiles.delete(k);
      }
    }
    return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async putProfile(profile: Profile): Promise<void> {
    this.check();
    this.profiles.set(profile.id, clone(profile));
  }

  async deleteProfile(profileId: string): Promise<void> {
    this.check();
    this.profiles.delete(profileId);
    for (const k of [...this.years.keys()]) if (k.startsWith(`${profileId}|`)) this.years.delete(k);
    this.freeplay.delete(profileId);
  }

  private readYear(key: string): YearProgress | undefined {
    const raw = this.years.get(key);
    if (raw === undefined) return undefined;
    if (isYearProgress(raw)) return clone(raw);
    this.quarantine.push(raw);
    this.years.delete(key);
    return undefined;
  }

  async getYear(profileId: string, year: number): Promise<YearProgress | undefined> {
    return this.readYear(`${profileId}|${year}`);
  }

  async listYears(profileId: string): Promise<YearProgress[]> {
    const out: YearProgress[] = [];
    for (const k of [...this.years.keys()]) {
      if (!k.startsWith(`${profileId}|`)) continue;
      const y = this.readYear(k);
      if (y) out.push(y);
    }
    return out.sort((a, b) => a.year - b.year);
  }

  async updateYear<T>(
    profileId: string,
    year: number,
    fn: (current: YearProgress | undefined) => Update<YearProgress, T>,
  ): Promise<T> {
    const key = `${profileId}|${year}`;
    const cur = this.readYear(key);
    const { next, result } = fn(cur);
    if (next && next !== cur) {
      this.check();
      this.years.set(key, clone(next));
    }
    return result;
  }

  async getFreeplay(profileId: string): Promise<FreeplayProgress | undefined> {
    const raw = this.freeplay.get(profileId);
    if (raw === undefined) return undefined;
    if (isFreeplay(raw)) return clone(raw);
    this.quarantine.push(raw);
    this.freeplay.delete(profileId);
    return undefined;
  }

  async updateFreeplay<T>(
    profileId: string,
    fn: (current: FreeplayProgress | undefined) => Update<FreeplayProgress, T>,
  ): Promise<T> {
    const cur = await this.getFreeplay(profileId);
    const { next, result } = fn(cur);
    if (next && next !== cur) {
      this.check();
      this.freeplay.set(profileId, clone(next));
    }
    return result;
  }

  async getSettings(): Promise<AppSettings> {
    return normalizeSettings(clone(this.settings));
  }

  async putSettings(settings: AppSettings): Promise<void> {
    this.check();
    this.settings = clone(settings);
  }

  quarantinedCount(): number {
    return this.quarantine.length;
  }

  async clearAll(): Promise<void> {
    this.check();
    this.profiles.clear();
    this.years.clear();
    this.freeplay.clear();
    this.settings = { ...DEFAULT_SETTINGS };
  }
}
