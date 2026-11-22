import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GameService } from '../app/gameService';
import type { LocalDate } from '../domain/calendar';
import type { AppSettings, Profile, YearProgress } from '../domain/types';
import { DEFAULT_SETTINGS, StorageWriteError } from '../services/storage';
import { prefersReducedMotion } from '../services/capabilities';
import { sound, type SoundName } from '../services/sound';
import { isSpeechAvailable, onVoicesChanged, speak as speakText } from '../services/speech';

export type Screen =
  | { name: 'profiles' }
  | { name: 'home' }
  | { name: 'game'; target: GameTarget }
  | { name: 'finale'; year: number; replay: boolean }
  | { name: 'album' }
  | { name: 'tree'; year: number }
  | { name: 'parents' };

export type GameTarget =
  | { kind: 'day'; year: number; day: number }
  | { kind: 'finale'; year: number }
  | { kind: 'freeplay' };

export interface Notice {
  id: number;
  text: string;
  tone: 'info' | 'error';
}

interface AppContextValue {
  service: GameService;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  profiles: Profile[];
  activeProfile: Profile | undefined;
  selectProfile: (id: string | undefined) => Promise<void>;
  reloadProfiles: () => Promise<void>;
  today: LocalDate;
  /** Tæller der øges ved enhver dataændring (også fra andre faner). */
  dataVersion: number;
  screen: Screen;
  navigate: (s: Screen) => void;
  notify: (text: string, tone?: Notice['tone']) => void;
  notices: Notice[];
  dismissNotice: (id: number) => void;
  /** Kører en handling og viser en forståelig besked, hvis lagringen fejler. */
  guard: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  reducedMotion: boolean;
  play: (s: SoundName) => void;
  speak: (text: string) => void;
  /** Oplæsning er slået til OG en dansk stemme findes. */
  canSpeak: boolean;
  speechSupported: boolean;
  storageWarning?: string;
}

const Ctx = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp uden AppProvider');
  return v;
}

function sameDate(a: LocalDate, b: LocalDate) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function AppProvider({
  service,
  storageWarning,
  children,
}: {
  service: GameService;
  storageWarning?: string;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState<LocalDate>(() => service.today());
  const [dataVersion, setDataVersion] = useState(0);
  const [screen, setScreen] = useState<Screen>({ name: 'profiles' });
  const [notices, setNotices] = useState<Notice[]>([]);
  const [osReduced, setOsReduced] = useState(prefersReducedMotion);
  const noticeId = useRef(0);
  const [speechSupported, setSpeechSupported] = useState(isSpeechAvailable);

  useEffect(() => onVoicesChanged(() => setSpeechSupported(isSpeechAvailable())), []);

  const notify = useCallback((text: string, tone: Notice['tone'] = 'info') => {
    const id = ++noticeId.current;
    setNotices((n) => [...n.filter((x) => x.text !== text), { id, text, tone }]);
    if (tone === 'info') setTimeout(() => setNotices((n) => n.filter((x) => x.id !== id)), 4500);
  }, []);

  const dismissNotice = useCallback((id: number) => setNotices((n) => n.filter((x) => x.id !== id)), []);

  const guard = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (e) {
        if (e instanceof StorageWriteError || (e instanceof DOMException && e.name === 'QuotaExceededError')) {
          notify('Ups! Spillet kunne ikke gemme det seneste. Prøv igen – dit tidligere fremskridt er der stadig.', 'error');
        } else {
          console.error(e);
          notify('Noget gik galt. Prøv igen om lidt.', 'error');
        }
        return undefined;
      }
    },
    [notify],
  );

  const reloadProfiles = useCallback(async () => {
    try {
      const list = await service.listProfiles();
      setProfiles(list);
    } catch {
      notify('Gemte profiler kunne ikke læses.', 'error');
    }
  }, [service, notify]);

  // Første indlæsning
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, list] = await Promise.all([service.getSettings(), service.listProfiles()]);
        if (!alive) return;
        sound.enabled = s.soundOn;
        setSettings(s);
        setProfiles(list);
        const active = list.find((p) => p.id === s.activeProfileId);
        setScreen(active ? { name: 'home' } : { name: 'profiles' });
        if (service.storage.quarantinedCount() > 0) {
          notify('Nogle gemte data var beskadigede og er sat til side. Resten af spillet virker som normalt.', 'error');
        }
      } catch {
        notify('Gemte data kunne ikke læses. Du kan stadig spille.', 'error');
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [service, notify]);

  // Ændringer – også fra andre faner
  useEffect(() => {
    return service.subscribe((change) => {
      setDataVersion((v) => v + 1);
      if (change.source === 'remote') {
        void reloadProfiles();
        void service.getSettings().then((s) => {
          sound.enabled = s.soundOn;
          setSettings((cur) => ({ ...s, activeProfileId: cur.activeProfileId }));
        });
      }
    });
  }, [service, reloadProfiles]);

  // Dato: tjek igen ved genoptagelse af fanen og jævnligt
  useEffect(() => {
    const check = () => {
      const d = service.today();
      setToday((cur) => (sameDate(cur, d) ? cur : d));
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        check();
        setDataVersion((v) => v + 1);
      } else sound.suspend();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', check);
    const t = setInterval(check, 15_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', check);
      clearInterval(t);
    };
  }, [service]);

  useEffect(() => {
    let mq: MediaQueryList | undefined;
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const on = () => setOsReduced(mq!.matches);
    mq.addEventListener?.('change', on);
    return () => mq?.removeEventListener?.('change', on);
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch };
      sound.enabled = next.soundOn;
      setSettings(next);
      await guard(() => service.saveSettings(next));
    },
    [settings, service, guard],
  );

  const selectProfile = useCallback(
    async (id: string | undefined) => {
      const next = { ...settings, activeProfileId: id };
      setSettings(next);
      await guard(() => service.saveSettings(next));
      setScreen(id ? { name: 'home' } : { name: 'profiles' });
    },
    [settings, service, guard],
  );

  const activeProfile = profiles.find((p) => p.id === settings.activeProfileId);

  // Hvis aktiv profil forsvinder (slettet i anden fane), gå til profilvalg
  useEffect(() => {
    if (loaded && !activeProfile && screen.name !== 'profiles' && screen.name !== 'parents') {
      setScreen({ name: 'profiles' });
    }
  }, [loaded, activeProfile, screen.name]);

  const reducedMotion = osReduced || settings.reducedEffects;

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
  }, [reducedMotion]);

  const play = useCallback((s: SoundName) => {
    if (sound.enabled) sound.play(s);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (settings.speechOn) speakText(text);
    },
    [settings.speechOn],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      service,
      settings,
      updateSettings,
      profiles,
      activeProfile,
      selectProfile,
      reloadProfiles,
      today,
      dataVersion,
      screen,
      navigate: setScreen,
      notify,
      notices,
      dismissNotice,
      guard,
      reducedMotion,
      play,
      speak,
      canSpeak: settings.speechOn && speechSupported,
      speechSupported,
      storageWarning,
    }),
    [service, settings, updateSettings, profiles, activeProfile, selectProfile, reloadProfiles, today, dataVersion, screen, notify, notices, dismissNotice, guard, reducedMotion, play, speak, speechSupported, storageWarning],
  );

  if (!loaded) {
    return (
      <div className="boot" role="status">
        <div className="boot-star" aria-hidden="true" />
        <p>Nissen pakker gaver …</p>
      </div>
    );
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Indlæser en profils årsprogression og genindlæser ved ændringer. */
export function useYear(profileId: string | undefined, year: number): { year: YearProgress | undefined; loading: boolean } {
  const { service, dataVersion } = useApp();
  const [state, setState] = useState<{ key: string; year: YearProgress | undefined } | null>(null);
  const key = `${profileId}|${year}`;
  useEffect(() => {
    if (!profileId) return;
    let alive = true;
    service
      .getYear(profileId, year)
      .then((y) => alive && setState({ key, year: y }))
      .catch(() => alive && setState({ key, year: undefined }));
    return () => {
      alive = false;
    };
  }, [service, profileId, year, key, dataVersion]);
  return { year: state?.key === key ? state.year : undefined, loading: state?.key !== key };
}
