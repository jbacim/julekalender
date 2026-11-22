import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Profile } from '../../domain/types';
import { useApp } from '../AppContext';
import { Avatar } from '../art/Avatar';
import { Dialog, Notices } from '../components/common';
import { DifficultyPicker } from './ProfilesScreen';
import { IconBack } from '../art/Icons';
import { installState, isIos, onInstallStateChange, promptInstall, type InstallState } from '../../services/pwa';

function InstallCard() {
  const [state, setState] = useState<InstallState>(installState);
  useEffect(() => onInstallStateChange(() => setState(installState())), []);
  return (
    <section className="card">
      <h2>Gem som app</h2>
      {state === 'installed' ? (
        <p>Julekalender kører som app på denne enhed.</p>
      ) : (
        <>
          <p>Læg Julekalender på hjemmeskærmen, så den åbner som en app i fuld skærm – også uden internet.</p>
          {state === 'promptable' && (
            <button type="button" className="btn btn--primary" onClick={() => void promptInstall()}>
              Installer som app
            </button>
          )}
          {state === 'ios' && (
            <ol className="install-steps">
              <li>
                Åbn siden i <strong>Safari</strong>.
              </li>
              <li>
                Tryk på <strong>Del</strong>-knappen (firkanten med en pil op).
              </li>
              <li>
                Vælg <strong>Føj til hjemmeskærm</strong> og tryk <strong>Tilføj</strong>.
              </li>
            </ol>
          )}
          {state === 'manual' && (
            <p>
              Åbn browserens menu (⋮) og vælg <strong>Installer app</strong> eller <strong>Føj til startskærm</strong>.
            </p>
          )}
          {isIos() && (
            <p className="small-print">
              På iPhone og iPad har appen sin egen lagring: fremskridt fra Safari følger ikke med ind i appen. Installer gerne, før
              december begynder.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function ParentGate({ onPass }: { onPass: () => void }) {
  const { a, b } = useMemo(() => ({ a: 3 + Math.floor(Math.random() * 6), b: 4 + Math.floor(Math.random() * 6) }), []);
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (Number(value) === a * b) onPass();
    else {
      setWrong(true);
      setValue('');
    }
  }
  return (
    <form className="card gate" onSubmit={submit}>
      <h2>Kun for voksne</h2>
      <label className="field">
        <span>
          Hvad er {a} gange {b}?
        </span>
        <input type="text" inputMode="numeric" pattern="[0-9]*" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" />
      </label>
      {wrong && <p className="form-error" role="alert">Det var ikke rigtigt – prøv igen.</p>}
      <button type="submit" className="btn btn--primary">
        Fortsæt
      </button>
    </form>
  );
}

function Toggle({ label, help, checked, onChange, disabled }: { label: string; help?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`toggle${disabled ? ' toggle--disabled' : ''}`}>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="toggle-track" aria-hidden="true" />
      <span className="toggle-text">
        <span>{label}</span>
        {help && <small>{help}</small>}
      </span>
    </label>
  );
}

function ProfileEditor({ profile }: { profile: Profile }) {
  const { service, guard, reloadProfiles, notify, settings, selectProfile } = useApp();
  const [nickname, setNickname] = useState(profile.nickname);
  const [difficulty, setDifficulty] = useState(profile.difficulty);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await guard(async () => {
      await service.updateProfile({ ...profile, nickname, difficulty });
      return true;
    });
    if (ok) {
      await reloadProfiles();
      notify('Profilen er gemt.');
    }
  }

  async function doDelete() {
    const ok = await guard(async () => {
      await service.deleteProfile(profile.id);
      return true;
    });
    setConfirmDelete(false);
    if (ok) {
      if (settings.activeProfileId === profile.id) await selectProfile(undefined);
      await reloadProfiles();
      notify(`Profilen ${profile.nickname} er slettet.`);
    }
  }

  return (
    <li className="profile-editor">
      <form onSubmit={save}>
        <div className="profile-editor-head">
          <Avatar id={profile.avatar} size={48} />
          <label className="field field--inline">
            <span>Kaldenavn</span>
            <input value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
          </label>
        </div>
        <DifficultyPicker value={difficulty} onChange={setDifficulty} name={`diff-${profile.id}`} />
        <p className="small-print">Ændret sværhedsgrad gælder fra næste runde – en igangværende runde beholder sine regler.</p>
        <div className="row-actions">
          <button type="submit" className="btn btn--secondary btn--small">
            Gem
          </button>
          <button type="button" className="btn btn--danger btn--small" onClick={() => setConfirmDelete(true)}>
            Slet profil
          </button>
        </div>
      </form>
      {confirmDelete && (
        <Dialog
          title={`Slet ${profile.nickname}?`}
          onClose={() => setConfirmDelete(false)}
          actions={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>
                Behold profilen
              </button>
              <button type="button" className="btn btn--danger" disabled={typed.trim().toUpperCase() !== 'SLET'} onClick={doDelete}>
                Slet for altid
              </button>
            </>
          }
        >
          <p>Alle kalendere, træer, gaver og pynt for denne profil slettes fra enheden. Det kan ikke fortrydes.</p>
          <label className="field">
            <span>Skriv SLET for at bekræfte</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
        </Dialog>
      )}
    </li>
  );
}

export function ParentsScreen() {
  const { settings, updateSettings, profiles, navigate, activeProfile, service, guard, reloadProfiles, selectProfile, notify, speechSupported } = useApp();
  const [passed, setPassed] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [typed, setTyped] = useState('');
  const back = () => navigate(activeProfile ? { name: 'home' } : { name: 'profiles' });

  async function deleteAll() {
    const ok = await guard(async () => {
      await service.clearAll();
      return true;
    });
    setConfirmAll(false);
    if (ok) {
      await reloadProfiles();
      await selectProfile(undefined);
      notify('Alle data er slettet fra enheden.');
    }
  }

  return (
    <div className="screen screen--parents">
      <header className="game-header">
        <button type="button" className="round-btn" onClick={back} aria-label="Tilbage">
          <IconBack />
        </button>
        <h1 className="game-title-small">Forældre</h1>
        <span />
      </header>
      <Notices />
      <main className="parents">
        {!passed ? (
          <ParentGate onPass={() => setPassed(true)} />
        ) : (
          <>
            <section className="card">
              <h2>Lyd og bevægelse</h2>
              <Toggle label="Lyd" help="Små lydeffekter. Spillet virker fuldt uden lyd." checked={settings.soundOn} onChange={(v) => void updateSettings({ soundOn: v })} />
              <Toggle
                label="Oplæsning"
                help={speechSupported ? 'Læser instruktioner, hint og det færdige ord op med dansk stemme.' : 'Denne enhed har ingen dansk stemme, så oplæsning er ikke tilgængelig.'}
                checked={settings.speechOn && speechSupported}
                disabled={!speechSupported}
                onChange={(v) => void updateSettings({ speechOn: v })}
              />
              <Toggle
                label="Færre effekter"
                help="Mindre bevægelse, ingen kameraflyvning og lettere grafik. Følger også enhedens indstilling for reduceret bevægelse."
                checked={settings.reducedEffects}
                onChange={(v) => void updateSettings({ reducedEffects: v })}
              />
            </section>

            <InstallCard />

            <section className="card">
              <h2>Profiler</h2>
              {profiles.length === 0 ? (
                <p>Der er ingen profiler endnu.</p>
              ) : (
                <ul className="profile-editors">
                  {profiles.map((p) => (
                    <ProfileEditor key={p.id} profile={p} />
                  ))}
                </ul>
              )}
            </section>

            <section className="card">
              <h2>Om gemte data</h2>
              <p>
                Alt gemmes kun lokalt i denne browser på denne enhed. Der er ingen konti, ingen server og ingen reklamer, og spillet
                indsamler ingen personoplysninger.
              </p>
              <p>
                <strong>Vær opmærksom:</strong> Data kan forsvinde, hvis browserdata ryddes, ved privat browsing, eller hvis I skifter enhed
                eller browser. Der er endnu ingen sikkerhedskopi eller synkronisering.
              </p>
              {!service.storage.persistent && (
                <p className="form-error">Lige nu kan browseren ikke gemme varigt – fremskridt forsvinder, når siden lukkes.</p>
              )}
              <button type="button" className="btn btn--danger" onClick={() => setConfirmAll(true)}>
                Slet alle data
              </button>
            </section>
          </>
        )}
      </main>
      {confirmAll && (
        <Dialog
          title="Slet alle data?"
          onClose={() => setConfirmAll(false)}
          actions={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmAll(false)}>
                Annullér
              </button>
              <button type="button" className="btn btn--danger" disabled={typed.trim().toUpperCase() !== 'SLET'} onClick={deleteAll}>
                Slet alt
              </button>
            </>
          }
        >
          <p>Alle profiler, kalendere, julealbum og indstillinger slettes fra denne enhed. Det kan ikke fortrydes.</p>
          <label className="field">
            <span>Skriv SLET for at bekræfte</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
        </Dialog>
      )}
    </div>
  );
}
