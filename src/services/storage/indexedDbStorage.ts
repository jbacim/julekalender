import type { AppSettings, FreeplayProgress, Profile, YearProgress } from '../../domain/types';
import { StorageWriteError, type GameStorage, type Update } from './types';
import { isFreeplay, isProfile, isYearProgress, normalizeSettings } from './validate';

export const DB_NAME = 'julekalender';
/** IndexedDB-skemaversion. Hæv og tilføj trin i onupgradeneeded ved strukturændringer. */
export const DB_VERSION = 1;

const S = {
  profiles: 'profiles',
  years: 'years',
  freeplay: 'freeplay',
  settings: 'settings',
  quarantine: 'quarantine',
} as const;

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new StorageWriteError(tx.error));
    tx.onabort = () => reject(new StorageWriteError(tx.error));
  });
}

export function openDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let r: IDBOpenDBRequest;
    try {
      r = factory.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(e);
      return;
    }
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(S.profiles)) db.createObjectStore(S.profiles);
      if (!db.objectStoreNames.contains(S.years)) db.createObjectStore(S.years);
      if (!db.objectStoreNames.contains(S.freeplay)) db.createObjectStore(S.freeplay);
      if (!db.objectStoreNames.contains(S.settings)) db.createObjectStore(S.settings);
      if (!db.objectStoreNames.contains(S.quarantine)) db.createObjectStore(S.quarantine, { autoIncrement: true });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('Databasen er blokeret af en anden fane'));
  });
}

const yearKey = (profileId: string, year: number) => `${profileId}|${year}`;

/**
 * IndexedDB-lagring. Hver opdatering kører i én readwrite-transaktion (læs → ren funktion → skriv),
 * som browseren serialiserer på tværs af faner. Derfor arbejder en opdatering altid på nyeste data.
 */
export class IndexedDbStorage implements GameStorage {
  readonly kind = 'indexeddb' as const;
  readonly persistent = true;
  private quarantined = 0;

  constructor(private db: IDBDatabase) {
    db.onversionchange = () => db.close();
  }

  static async open(factory?: IDBFactory): Promise<IndexedDbStorage> {
    return new IndexedDbStorage(await openDatabase(factory));
  }

  private quarantine(tx: IDBTransaction, store: string, key: string, raw: unknown): void {
    this.quarantined++;
    try {
      tx.objectStore(S.quarantine).add({ store, key, raw, at: new Date().toISOString() });
      tx.objectStore(store).delete(key);
    } catch {
      /* sæt til side er best effort */
    }
  }

  async listProfiles(): Promise<Profile[]> {
    const tx = this.db.transaction([S.profiles, S.quarantine], 'readwrite');
    const store = tx.objectStore(S.profiles);
    const [keys, values] = await Promise.all([req(store.getAllKeys()), req(store.getAll())]);
    const out: Profile[] = [];
    values.forEach((v, i) => {
      if (isProfile(v)) out.push(v);
      else this.quarantine(tx, S.profiles, String(keys[i]), v);
    });
    await done(tx).catch(() => undefined);
    return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async putProfile(profile: Profile): Promise<void> {
    const tx = this.db.transaction(S.profiles, 'readwrite');
    tx.objectStore(S.profiles).put(profile, profile.id);
    await done(tx);
  }

  async deleteProfile(profileId: string): Promise<void> {
    const tx = this.db.transaction([S.profiles, S.years, S.freeplay], 'readwrite');
    tx.objectStore(S.profiles).delete(profileId);
    tx.objectStore(S.years).delete(IDBKeyRange.bound(`${profileId}|`, `${profileId}|￿`));
    tx.objectStore(S.freeplay).delete(profileId);
    await done(tx);
  }

  async getYear(profileId: string, year: number): Promise<YearProgress | undefined> {
    const tx = this.db.transaction([S.years, S.quarantine], 'readwrite');
    const key = yearKey(profileId, year);
    const raw = await req(tx.objectStore(S.years).get(key));
    let result: YearProgress | undefined;
    if (raw !== undefined) {
      if (isYearProgress(raw)) result = raw;
      else this.quarantine(tx, S.years, key, raw);
    }
    await done(tx).catch(() => undefined);
    return result;
  }

  async listYears(profileId: string): Promise<YearProgress[]> {
    const tx = this.db.transaction([S.years, S.quarantine], 'readwrite');
    const range = IDBKeyRange.bound(`${profileId}|`, `${profileId}|￿`);
    const store = tx.objectStore(S.years);
    const [keys, values] = await Promise.all([req(store.getAllKeys(range)), req(store.getAll(range))]);
    const out: YearProgress[] = [];
    values.forEach((v, i) => {
      if (isYearProgress(v)) out.push(v);
      else this.quarantine(tx, S.years, String(keys[i]), v);
    });
    await done(tx).catch(() => undefined);
    return out.sort((a, b) => a.year - b.year);
  }

  private async update<R, T>(
    storeName: string,
    key: string,
    validate: (v: unknown) => v is R,
    fn: (current: R | undefined) => Update<R, T>,
  ): Promise<T> {
    const tx = this.db.transaction([storeName, S.quarantine], 'readwrite');
    const store = tx.objectStore(storeName);
    const completion = done(tx);
    let result!: T;
    let fnError: unknown;
    await new Promise<void>((resolve, reject) => {
      const r = store.get(key);
      r.onerror = () => reject(new StorageWriteError(r.error));
      r.onsuccess = () => {
        try {
          let cur: R | undefined;
          if (r.result !== undefined) {
            if (validate(r.result)) cur = r.result;
            else this.quarantine(tx, storeName, key, r.result);
          }
          const u = fn(cur);
          result = u.result;
          if (u.next && u.next !== cur) store.put(u.next, key);
        } catch (e) {
          fnError = e;
          tx.abort();
        }
        resolve();
      };
    });
    try {
      await completion;
    } catch (e) {
      if (fnError) throw fnError;
      throw e;
    }
    if (fnError) throw fnError;
    return result;
  }

  updateYear<T>(
    profileId: string,
    year: number,
    fn: (current: YearProgress | undefined) => Update<YearProgress, T>,
  ): Promise<T> {
    return this.update(S.years, yearKey(profileId, year), isYearProgress, fn);
  }

  async getFreeplay(profileId: string): Promise<FreeplayProgress | undefined> {
    const raw = await req(this.db.transaction(S.freeplay).objectStore(S.freeplay).get(profileId));
    return isFreeplay(raw) ? raw : undefined;
  }

  updateFreeplay<T>(
    profileId: string,
    fn: (current: FreeplayProgress | undefined) => Update<FreeplayProgress, T>,
  ): Promise<T> {
    return this.update(S.freeplay, profileId, isFreeplay, fn);
  }

  async getSettings(): Promise<AppSettings> {
    const raw = await req(this.db.transaction(S.settings).objectStore(S.settings).get('app'));
    return normalizeSettings(raw);
  }

  async putSettings(settings: AppSettings): Promise<void> {
    const tx = this.db.transaction(S.settings, 'readwrite');
    tx.objectStore(S.settings).put(settings, 'app');
    await done(tx);
  }

  quarantinedCount(): number {
    return this.quarantined;
  }

  async clearAll(): Promise<void> {
    const tx = this.db.transaction([S.profiles, S.years, S.freeplay, S.settings], 'readwrite');
    for (const s of [S.profiles, S.years, S.freeplay, S.settings]) tx.objectStore(s).clear();
    await done(tx);
  }
}
