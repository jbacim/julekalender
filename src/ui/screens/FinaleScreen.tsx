import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { earnedRewards, firstTryGifts, totalGifts } from '../../domain/progress';
import { REWARDS } from '../../content/rewards';
import { useApp, useYear } from '../AppContext';
import { GiftCounter, Notices, TopBar } from '../components/common';
import { WorldView, type FinaleRequest } from '../world/WorldView';

/**
 * Finalepræsentation. Sejren og alle belønninger er gemt FØR denne skærm vises,
 * så lukkes fanen undervejs, mistes intet – og finalen kan ses igen uden nye belønninger.
 */
export function FinaleScreen({ year, replay }: { year: number; replay: boolean }) {
  const { activeProfile, service, navigate, play, speak, reducedMotion } = useApp();
  const { year: yp, loading } = useYear(activeProfile?.id, year);
  const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro');
  const [key, setKey] = useState(1);
  const doneOnce = useRef(false);

  const rewards = useMemo(() => earnedRewards(yp, REWARDS), [yp]);
  const gifts = totalGifts(yp);
  const fromGifts = yp ? Math.min(firstTryGifts(yp), 239) : 0;

  const onDone = useCallback(() => {
    if (doneOnce.current) return;
    doneOnce.current = true;
    setPhase('done');
    if (activeProfile) void service.markFinaleSeen(activeProfile.id, year).catch(() => undefined);
    speak('Glædelig jul! Alle gaverne er tilbage, og stjernen lyser i toppen af dit træ.');
  }, [activeProfile, service, year, speak]);

  const finale: FinaleRequest | null = useMemo(
    () => (phase === 'playing' ? { key, fromGifts, onDone } : null),
    [phase, key, fromGifts, onDone],
  );

  const won = yp?.finale.status === 'won';
  // Direkte fra sejren: start præsentationen med det samme (knaptrykket var brugerhandlingen).
  useEffect(() => {
    if (!replay && won && phase === 'intro') {
      play('finale');
      setPhase('playing');
    }
  }, [replay, won, phase, play]);

  if (!activeProfile) return null;
  if (loading) return <div className="loading" role="status">Henter dit træ …</div>;
  if (!yp || yp.finale.status !== 'won') {
    return (
      <div className="screen">
        <TopBar showHome />
        <main className="center-card card">
          <h1>Finalen er ikke vundet endnu</h1>
          <p>Stjernen venter på dig den 24. december.</p>
          <button type="button" className="btn btn--primary" onClick={() => navigate({ name: 'home' })}>
            Til kalenderen
          </button>
        </main>
      </div>
    );
  }

  function startShow() {
    doneOnce.current = false;
    play('finale');
    setKey((k) => k + 1);
    setPhase('playing');
  }

  return (
    <div className="screen screen--finale">
      <TopBar showHome>
        <GiftCounter gifts={gifts} />
      </TopBar>
      <Notices />
      <main className="finale-layout">
        <div className="finale-world">
          <WorldView
            rewards={rewards}
            gifts={gifts}
            lit={phase !== 'playing'}
            interactive={phase === 'done' || (phase === 'intro' && replay)}
            finale={finale}
            label={`Dit personlige juletræ ${year} med stjerne, ${rewards.length - 1} dekorationer og 240 gaver`}
          />
        </div>
        <section className="finale-panel" aria-live="polite">
          {phase === 'intro' && (
            <>
              <h1>{replay ? `Juleaften ${year}` : 'Glædelig jul!'}</h1>
              <p>
                {replay
                  ? 'Se igen, når nissen afleverer gaverne og stjernen kommer på plads.'
                  : 'Du vandt stjernen! Nissen kommer nu med alle gaverne tilbage.'}
              </p>
              <button type="button" className="btn btn--primary btn--big" onClick={startShow}>
                {replay ? 'Se finalen igen' : 'Se finalen'}
              </button>
            </>
          )}
          {phase === 'playing' && (
            <>
              <h1>Nissen kommer med gaverne …</h1>
              <button type="button" className="btn btn--ghost" onClick={() => onDone()}>
                Spring over
              </button>
            </>
          )}
          {phase === 'done' && (
            <>
              <h1>Alle 240 gaver er tilbage!</h1>
              <p>
                Stjernen lyser i toppen af dit træ. {reducedMotion ? 'Brug knapperne' : 'Drej træet med fingeren eller knapperne'} for at se det
                hele.
              </p>
              <div className="row-actions">
                <button type="button" className="btn btn--secondary" onClick={startShow}>
                  Se finalen igen
                </button>
                <button type="button" className="btn btn--primary" onClick={() => navigate({ name: 'home' })}>
                  Til kalenderen
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
