/**
 * Installation som app (PWA). Registrerer service workeren i produktion, fanger Chromes
 * installationsprompt, og beder om varig lagring, så browseren ikke rydder spillets data.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export type InstallState =
  /** Kører allerede som installeret app. */
  | 'installed'
  /** Browseren kan vise sin egen installationsdialog (Android/Chrome/Edge). */
  | 'promptable'
  /** iPhone/iPad: skal installeres via Del → Føj til hjemmeskærm. */
  | 'ios'
  /** Ingen direkte mulighed – brug browserens menu. */
  | 'manual';

export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function installState(): InstallState {
  if (isStandalone()) return 'installed';
  if (deferred) return 'promptable';
  if (isIos()) return 'ios';
  return 'manual';
}

export function onInstallStateChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  notify();
  return outcome === 'accepted';
}

export function setupPwa(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
        .catch(() => undefined);
    });
  }
  // Varig lagring mindsker risikoen for, at browseren rydder spillets data
  void navigator.storage?.persist?.().catch(() => undefined);
}
