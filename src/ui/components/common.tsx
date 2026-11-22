import { useEffect, useRef, type ReactNode } from 'react';
import { useApp } from '../AppContext';
import { Avatar } from '../art/Avatar';
import { Gift } from '../art/Gift';
import { IconGear, IconHome, IconSoundOff, IconSoundOn } from '../art/Icons';

export function GiftCounter({ gifts, label = 'gaver i alt' }: { gifts: number; label?: string }) {
  return (
    <div className="gift-counter" role="status" aria-live="polite" aria-label={`${gifts} ${label}`}>
      <Gift index={0} size={30} />
      <span className="gift-counter-num">{gifts}</span>
      <span className="gift-counter-label">{label}</span>
    </div>
  );
}

export function MuteButton() {
  const { settings, updateSettings } = useApp();
  return (
    <button
      type="button"
      className="round-btn"
      aria-pressed={!settings.soundOn}
      aria-label={settings.soundOn ? 'Slå lyd fra' : 'Slå lyd til'}
      onClick={() => void updateSettings({ soundOn: !settings.soundOn })}
    >
      {settings.soundOn ? <IconSoundOn /> : <IconSoundOff />}
    </button>
  );
}

export function TopBar({ children, showHome = false }: { children?: ReactNode; showHome?: boolean }) {
  const { activeProfile, navigate } = useApp();
  return (
    <header className="topbar">
      <div className="topbar-left">
        {showHome && (
          <button type="button" className="round-btn" onClick={() => navigate({ name: 'home' })} aria-label="Til forsiden">
            <IconHome />
          </button>
        )}
        {activeProfile && (
          <button
            type="button"
            className="profile-chip"
            onClick={() => navigate({ name: 'profiles' })}
            aria-label={`Aktiv profil: ${activeProfile.nickname}. Skift profil`}
          >
            <Avatar id={activeProfile.avatar} size={40} />
            <span className="profile-chip-name">{activeProfile.nickname}</span>
          </button>
        )}
      </div>
      <div className="topbar-center">{children}</div>
      <div className="topbar-right">
        <MuteButton />
        <button type="button" className="round-btn" onClick={() => navigate({ name: 'parents' })} aria-label="Forældre og indstillinger">
          <IconGear />
        </button>
      </div>
    </header>
  );
}

export function Notices() {
  const { notices, dismissNotice, storageWarning } = useApp();
  return (
    <div className="notices" aria-live="polite">
      {storageWarning && (
        <div className="notice notice--error" role="alert">
          {storageWarning}
        </div>
      )}
      {notices.map((n) => (
        <div key={n.id} className={`notice notice--${n.tone}`} role={n.tone === 'error' ? 'alert' : 'status'}>
          <span>{n.text}</span>
          <button type="button" className="notice-close" onClick={() => dismissNotice(n.id)} aria-label="Luk besked">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/** Tilgængelig dialog med fokusfælde light: fokus flyttes ind og Escape lukker. */
export function Dialog({
  title,
  children,
  onClose,
  actions,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, input')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" ref={ref} onClick={(e) => e.stopPropagation()}>
        <h2 id="dialog-title">{title}</h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
