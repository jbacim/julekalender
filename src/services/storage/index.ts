import { IndexedDbStorage } from './indexedDbStorage';
import { MemoryStorage } from './memoryStorage';
import type { GameStorage } from './types';

export * from './types';
export { MemoryStorage } from './memoryStorage';
export { IndexedDbStorage } from './indexedDbStorage';

export interface StorageInit {
  storage: GameStorage;
  /** Forståelig dansk besked, hvis vi måtte falde tilbage til midlertidig lagring. */
  warning?: string;
}

export async function createStorage(): Promise<StorageInit> {
  if (typeof indexedDB === 'undefined') {
    return {
      storage: new MemoryStorage(),
      warning: 'Browseren kan ikke gemme spillet. Du kan godt spille, men fremskridt forsvinder, når siden lukkes.',
    };
  }
  try {
    return { storage: await IndexedDbStorage.open() };
  } catch {
    return {
      storage: new MemoryStorage(),
      warning:
        'Spillet kunne ikke åbne sin lokale lagring (måske privat browsing). Du kan godt spille, men fremskridt forsvinder, når siden lukkes.',
    };
  }
}
