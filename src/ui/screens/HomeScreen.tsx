import { useMemo } from 'react';
import { daysUntilSeason, displayYear, doorAccess, seasonFor } from '../../domain/calendar';
import { doorStatus, earnedRewards, hasStar, totalGifts, type DoorStatus } from '../../domain/progress';
import { REWARDS, rewardForDay } from '../../content/rewards';
import { useApp, useYear } from '../AppContext';
import { CalendarBoard } from '../components/CalendarBoard';
import { GiftCounter, Notices, TopBar } from '../components/common';
import { WorldView } from '../world/WorldView';
import { Nisse } from '../art/Nisse';
import { InstallPrompt } from '../components/InstallPrompt';

export function HomeScreen() {
  const { activeProfile, today, navigate, notify, play, speak, canSpeak } = useApp();
  const year = displayYear(today);
  const season = seasonFor(today);
  const { year: yp } = useYear(activeProfile?.id, year);

  const statuses = useMemo(() => {
    const s: Record<number, DoorStatus> = {};
    for (let d = 1; d <= 24; d++) s[d] = doorStatus(yp, d, doorAccess(today, year, d));
    return s;
  }, [yp, today, year]);

  const rewards = useMemo(() => earnedRewards(yp, REWARDS), [yp]);
  const gifts = totalGifts(yp);
  const inSeason = season.kind === 'inSeason';
  const todayNum = inSeason ? today.day : null;

  if (!activeProfile) return null;

  function openDoor(day: number) {
    const st = statuses[day];
    if (st === 'locked') {
      notify(inSeason ? `Låge ${day} kan åbnes den ${day}. december.` : `Kalenderen åbner den 1. december.`);
      return;
    }
    if (day === 24 && yp?.finale.status === 'won') {
      navigate({ name: 'finale', year, replay: true });
      return;
    }
    if (st === 'won') {
      const r = rewardForDay(day);
      notify(`Låge ${day} er klaret! Du vandt ${r?.name.toLowerCase() ?? 'en pynt'} her.`);
      return;
    }
    if (doorAccess(today, year, day) !== 'playable') {
      notify('Kalenderen er lukket for i år. Du kan stadig spille Fri leg!');
      return;
    }
    play('door');
    navigate({ name: 'game', target: day === 24 ? { kind: 'finale', year } : { kind: 'day', year, day } });
  }

  const caption = `Julekalender ${year}`;
  const until = daysUntilSeason(today);

  return (
    <div className="screen screen--home">
      <TopBar>
        <GiftCounter gifts={gifts} />
      </TopBar>
      <Notices />
      <InstallPrompt />
      <main className="home-layout">
        <div className="home-calendar">
          {!inSeason && (
            <div className="season-banner" role="note">
              <Nisse mood="sneaky" size={64} />
              <p>
                {today.month === 12
                  ? 'Julen er forbi – nissen hviler sig. Kalenderen kan ses, men ikke spilles. Prøv Fri leg!'
                  : `Kalenderen åbner den 1. december${until > 0 ? ` – om ${until} ${until === 1 ? 'dag' : 'dage'}` : ''}. Indtil da kan du spille Fri leg!`}
              </p>
            </div>
          )}
          <CalendarBoard statuses={statuses} today={todayNum} onOpen={openDoor} caption={caption} />
          <div className="home-actions">
            <button type="button" className="btn btn--freeplay" onClick={() => navigate({ name: 'game', target: { kind: 'freeplay' } })}>
              Fri leg
              <small>Gæt ord hele året</small>
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => navigate({ name: 'tree', year })}>
              Se mit træ
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => navigate({ name: 'album' })}>
              Julealbum
            </button>
            {canSpeak && (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => speak('Tryk på dagens låge for at gætte et ord. Hvert forkert bogstav lader nissen stjæle en gave. Fri leg kan du spille hele året.')}
            >
              Læs op
            </button>
            )}
          </div>
        </div>
        <div className="home-world">
          <WorldView
            rewards={rewards}
            gifts={gifts}
            lit={hasStar(yp)}
            santa={inSeason && today.day === 24}
            label={`Din juleverden med ${rewards.length} ${rewards.length === 1 ? 'dekoration' : 'dekorationer'} og en gavebunke`}
          />
        </div>
      </main>
    </div>
  );
}
