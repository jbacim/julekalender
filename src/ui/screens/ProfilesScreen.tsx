import { useState, type FormEvent } from 'react';
import type { AvatarId, Difficulty } from '../../domain/types';
import { useApp } from '../AppContext';
import { AVATARS, Avatar } from '../art/Avatar';
import { MuteButton } from '../components/common';
import { IconGear } from '../art/Icons';

export function DifficultyPicker({ value, onChange, name }: { value: Difficulty; onChange: (d: Difficulty) => void; name: string }) {
  return (
    <fieldset className="choice-group">
      <legend>Sværhedsgrad</legend>
      <label className={`choice${value === 'easy' ? ' choice--on' : ''}`}>
        <input type="radio" name={name} value="easy" checked={value === 'easy'} onChange={() => onChange('easy')} />
        <span className="choice-title">Nem</span>
        <span className="choice-sub">Få et hint efter 5 forkerte</span>
      </label>
      <label className={`choice${value === 'normal' ? ' choice--on' : ''}`}>
        <input type="radio" name={name} value="normal" checked={value === 'normal'} onChange={() => onChange('normal')} />
        <span className="choice-title">Normal</span>
        <span className="choice-sub">Uden hint</span>
      </label>
    </fieldset>
  );
}

function CreateProfile({ onCancel, canCancel }: { onCancel: () => void; canCancel: boolean }) {
  const { service, guard, reloadProfiles, selectProfile, play } = useApp();
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState<AvatarId>('ræv');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    play('door');
    const p = await guard(() => service.createProfile({ nickname, avatar, difficulty }));
    setBusy(false);
    if (p) {
      await reloadProfiles();
      await selectProfile(p.id);
    }
  }

  return (
    <form className="card create-profile" onSubmit={submit} aria-labelledby="create-title">
      <h2 id="create-title">Ny profil</h2>
      <label className="field">
        <span>Kaldenavn</span>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          autoComplete="off"
          placeholder="fx Nissestjerne"
          aria-describedby="nick-help"
        />
        <small id="nick-help">Brug gerne et kaldenavn – ikke dit rigtige navn.</small>
      </label>
      <fieldset className="avatar-grid">
        <legend>Vælg en figur</legend>
        {AVATARS.map((a) => (
          <label key={a.id} className={`avatar-choice${avatar === a.id ? ' avatar-choice--on' : ''}`}>
            <input type="radio" name="avatar" value={a.id} checked={avatar === a.id} onChange={() => setAvatar(a.id)} />
            <Avatar id={a.id} size={56} />
            <span>{a.label}</span>
          </label>
        ))}
      </fieldset>
      <DifficultyPicker value={difficulty} onChange={setDifficulty} name="difficulty-new" />
      <div className="row-actions">
        {canCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Tilbage
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          Lav profil
        </button>
      </div>
    </form>
  );
}

export function ProfilesScreen() {
  const { profiles, selectProfile, activeProfile, navigate, play } = useApp();
  const [creating, setCreating] = useState(profiles.length === 0);

  return (
    <main className="screen screen--profiles">
      <div className="profiles-top">
        <MuteButton />
        <button type="button" className="round-btn" onClick={() => navigate({ name: 'parents' })} aria-label="Forældre og indstillinger">
          <IconGear />
        </button>
      </div>
      <div className="title-block">
        <p className="kicker">Velkommen til</p>
        <h1 className="game-title">Julekalender</h1>
        <p className="lead">Gæt ordene og red gaverne fra den drilske nisse!</p>
      </div>
      {creating ? (
        <CreateProfile onCancel={() => setCreating(false)} canCancel={profiles.length > 0} />
      ) : (
        <section className="card" aria-labelledby="who-title">
          <h2 id="who-title">Hvem spiller?</h2>
          <ul className="profile-list">
            {profiles.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`profile-card${activeProfile?.id === p.id ? ' profile-card--active' : ''}`}
                  onClick={() => {
                    play('tap');
                    void selectProfile(p.id);
                  }}
                >
                  <Avatar id={p.avatar} size={72} />
                  <span className="profile-card-name">{p.nickname}</span>
                  <span className="profile-card-sub">{p.difficulty === 'easy' ? 'Nem' : 'Normal'}</span>
                </button>
              </li>
            ))}
            <li>
              <button type="button" className="profile-card profile-card--new" onClick={() => setCreating(true)}>
                <span className="plus" aria-hidden="true">+</span>
                <span className="profile-card-name">Ny profil</span>
              </button>
            </li>
          </ul>
        </section>
      )}
    </main>
  );
}
