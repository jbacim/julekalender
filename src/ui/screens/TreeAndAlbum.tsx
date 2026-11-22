import { useEffect, useMemo, useState } from 'react';
import { displayYear } from '../../domain/calendar';
import { earnedRewards, hasStar, totalGifts } from '../../domain/progress';
import type { YearProgress } from '../../domain/types';
import { REWARDS } from '../../content/rewards';
import { useApp, useYear } from '../AppContext';
import { GiftCounter, Notices, TopBar } from '../components/common';
import { WorldView } from '../world/WorldView';
import { World2D } from '../world/World2D';

/** Interaktiv visning af et års træ (kun visning – intet kan spilles herfra). */
export function TreeScreen({ year }: { year: number }) {
  const { activeProfile, navigate, today } = useApp();
  const santaDay = today.year === year && today.month === 12 && today.day === 24;
  const { year: yp, loading } = useYear(activeProfile?.id, year);
  const rewards = useMemo(() => earnedRewards(yp, REWARDS), [yp]);
  const gifts = totalGifts(yp);
  if (!activeProfile) return null;
  return (
    <div className="screen screen--tree">
      <TopBar showHome>
        <GiftCounter gifts={gifts} />
      </TopBar>
      <Notices />
      <main className="tree-layout">
        <div className="tree-world">
          {!loading && (
            <WorldView
              rewards={rewards}
              gifts={gifts}
              lit={hasStar(yp)}
              santa={santaDay}
              visitorButtons
              interactive
              label={`Juletræ ${year} med ${rewards.length} ${rewards.length === 1 ? 'dekoration' : 'dekorationer'}`}
            />
          )}
        </div>
        <section className="tree-panel">
          <h1>Mit træ {year}</h1>
          <p>
            {rewards.length === 0
              ? 'Træet venter på sin første pynt. Vind en låge for at pynte det!'
              : `${rewards.length} ${rewards.length === 1 ? 'dekoration' : 'dekorationer'} og ${gifts} gaver.`}
          </p>
          {rewards.length > 0 && (
            <ul className="reward-chips">
              {rewards.map((r) => (
                <li key={r.id}>{r.name}</li>
              ))}
            </ul>
          )}
          <div className="row-actions">
            {yp?.finale.status === 'won' && (
              <button type="button" className="btn btn--secondary" onClick={() => navigate({ name: 'finale', year, replay: true })}>
                Se finalen igen
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={() => navigate({ name: 'album' })}>
              Julealbum
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

/** Julealbum: tidligere års træer – kun til visning. */
export function AlbumScreen() {
  const { activeProfile, service, navigate, today, dataVersion } = useApp();
  const [years, setYears] = useState<YearProgress[] | null>(null);
  useEffect(() => {
    if (!activeProfile) return;
    let alive = true;
    service
      .listYears(activeProfile.id)
      .then((y) => alive && setYears(y))
      .catch(() => alive && setYears([]));
    return () => {
      alive = false;
    };
  }, [service, activeProfile, dataVersion]);
  if (!activeProfile) return null;
  const current = displayYear(today);
  const list = (years ?? []).slice().sort((a, b) => b.year - a.year);
  return (
    <div className="screen screen--album">
      <TopBar showHome />
      <Notices />
      <main className="album">
        <h1>Julealbum</h1>
        <p className="lead">Her gemmes {activeProfile.nickname}s juletræer fra hvert år.</p>
        {years === null ? (
          <p role="status">Henter …</p>
        ) : list.length === 0 ? (
          <p className="card">Der er ingen træer endnu. Når du åbner din første låge, kommer årets træ her.</p>
        ) : (
          <ul className="album-grid">
            {list.map((y) => {
              const rewards = earnedRewards(y, REWARDS);
              const gifts = totalGifts(y);
              return (
                <li key={y.year}>
                  <button type="button" className="album-card" onClick={() => navigate({ name: 'tree', year: y.year })}>
                    <World2D rewards={rewards} gifts={gifts} lit={hasStar(y)} label={`Træ ${y.year}`} />
                    <span className="album-card-title">
                      {y.year}
                      {y.year === current ? ' (i år)' : ''}
                    </span>
                    <span className="album-card-sub">
                      {rewards.length} pynt · {gifts} gaver{hasStar(y) ? ' · stjerne' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
