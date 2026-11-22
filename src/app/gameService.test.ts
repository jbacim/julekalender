import { describe, expect, it } from 'vitest';
import { GameService } from './gameService';
import { correctLetters, makeProfile, setDate, setup, wrongLetters } from '../test/helpers';
import { earnedRewards, totalGifts, doorStatus } from '../domain/progress';
import { REWARDS } from '../content/rewards';
import { IndexedDbStorage, MemoryStorage, StorageWriteError } from '../services/storage';
import { AdjustableDateService, copenhagenInstant } from '../services/dateService';
import { doorAccess } from '../domain/calendar';
import { freeplayStats, type Profile, type Round } from '../domain/types';

async function winDay(service: GameService, p: Profile, year: number, day: number, mistakes = 0) {
  const s = await service.startDay(p, year, day);
  if (!s.ok) throw new Error(s.error);
  let round: Round = s.value;
  for (const l of wrongLetters(round, mistakes)) {
    const g = await service.guessCalendar(p.id, year, { kind: 'day', day }, round.id, l);
    if (g.ok) round = g.value.round;
  }
  for (const l of correctLetters(round)) {
    const g = await service.guessCalendar(p.id, year, { kind: 'day', day }, round.id, l);
    if (g.ok) round = g.value.round;
  }
  return round;
}

async function loseRound(
  service: GameService,
  p: Profile,
  year: number,
  target: { kind: 'day'; day: number } | { kind: 'finale' },
  round: Round,
) {
  let r = round;
  for (const l of wrongLetters(round, 10)) {
    const g = await service.guessCalendar(p.id, year, target, r.id, l);
    if (g.ok) r = g.value.round;
  }
  return r;
}

describe('kalenderforløb', () => {
  it('sejr giver 10 - fejl gaver og dagens dekoration', async () => {
    const { service } = setup([2026, 12, 3]);
    const p = await makeProfile(service);
    const r = await winDay(service, p, 2026, 2, 3);
    expect(r.status).toBe('won');
    const yp = await service.getYear(p.id, 2026);
    expect(yp!.days[2].official).toMatchObject({ outcome: 'won', giftsSaved: 7 });
    expect(totalGifts(yp)).toBe(7);
    expect(earnedRewards(yp, REWARDS).map((x) => x.day)).toEqual([2]);
  });

  it('fremtidige låger kan ikke startes; missede kan', async () => {
    const { service } = setup([2026, 12, 3]);
    const p = await makeProfile(service);
    expect(await service.startDay(p, 2026, 4)).toEqual({ ok: false, error: 'locked' });
    expect((await service.startDay(p, 2026, 1)).ok).toBe(true);
    expect(await service.startFinale(p, 2026)).toEqual({ ok: false, error: 'notFinaleDay' });
  });

  it('tabt låge kan prøves igen; sejr giver pynt og gaver, og derefter er lågen klaret', async () => {
    const { service } = setup([2026, 12, 5]);
    const p = await makeProfile(service);
    const s = await service.startDay(p, 2026, 5);
    if (!s.ok) throw new Error();
    const lost = await loseRound(service, p, 2026, { kind: 'day', day: 5 }, s.value);
    expect(lost.status).toBe('lost');
    let yp = await service.getYear(p.id, 2026);
    expect(yp!.days[5].official).toMatchObject({ outcome: 'lost', giftsSaved: 0 });

    expect(doorStatus(yp, 5, 'playable')).toBe('lost');
    expect(totalGifts(yp)).toBe(0);
    expect(earnedRewards(yp, REWARDS)).toHaveLength(0);

    // Endnu et nederlag ændrer intet andet end antal forsøg
    const s2 = await service.startDay(p, 2026, 5);
    if (!s2.ok) throw new Error();
    expect(s2.value.mode).toBe('calendar');
    await loseRound(service, p, 2026, { kind: 'day', day: 5 }, s2.value);
    yp = await service.getYear(p.id, 2026);
    expect(yp!.days[5].official).toMatchObject({ outcome: 'lost', giftsSaved: 0, attempts: 2 });

    // Tredje forsøg vindes med 3 fejl: pynten og 7 gaver
    const retry = await winDay(service, p, 2026, 5, 3);
    expect(retry.mode).toBe('calendar');
    expect(retry.status).toBe('won');
    expect(retry.word.id).toBe(s.value.word.id); // samme dagsord
    yp = await service.getYear(p.id, 2026);
    expect(yp!.days[5].official).toMatchObject({ outcome: 'won', giftsSaved: 7, attempts: 3 });
    expect(totalGifts(yp)).toBe(7);
    expect(earnedRewards(yp, REWARDS).map((r) => r.day)).toEqual([5]);
    expect(doorStatus(yp, 5, 'playable')).toBe('won');
    expect(await service.startDay(p, 2026, 5)).toEqual({ ok: false, error: 'alreadyWon' });
  });

  it('vundet låge kan ikke spilles igen for flere gaver', async () => {
    const { service } = setup([2026, 12, 5]);
    const p = await makeProfile(service);
    await winDay(service, p, 2026, 1);
    expect(await service.startDay(p, 2026, 1)).toEqual({ ok: false, error: 'alreadyWon' });
  });

  it('genindlæsning fortsætter samme runde med samme fejl', async () => {
    const { service, storage, dates } = setup([2026, 12, 5]);
    const p = await makeProfile(service);
    const s = await service.startDay(p, 2026, 3);
    if (!s.ok) throw new Error();
    for (const l of wrongLetters(s.value, 3)) await service.guessCalendar(p.id, 2026, { kind: 'day', day: 3 }, s.value.id, l);
    // "Genindlæs": ny service på samme lagring
    const reloaded = new GameService(storage, dates);
    const again = await reloaded.startDay(p, 2026, 3);
    if (!again.ok) throw new Error();
    expect(again.value.id).toBe(s.value.id);
    expect(again.value.mistakes).toBe(3);
    expect(again.value.mode).toBe('calendar');
  });

  it('dobbelt afslutning giver ikke dobbelte gaver eller dekorationer', async () => {
    const { service } = setup([2026, 12, 5]);
    const p = await makeProfile(service);
    const s = await service.startDay(p, 2026, 4);
    if (!s.ok) throw new Error();
    const letters = correctLetters(s.value);
    for (const l of letters.slice(0, -1)) await service.guessCalendar(p.id, 2026, { kind: 'day', day: 4 }, s.value.id, l);
    const last = letters[letters.length - 1];
    const [a, b] = await Promise.all([
      service.guessCalendar(p.id, 2026, { kind: 'day', day: 4 }, s.value.id, last),
      service.guessCalendar(p.id, 2026, { kind: 'day', day: 4 }, s.value.id, last),
    ]);
    const granted = [a, b].filter((x) => x.ok && x.value.rewardGranted).length;
    expect(granted).toBe(1);
    const yp = await service.getYear(p.id, 2026);
    expect(totalGifts(yp)).toBe(10);
    expect(earnedRewards(yp, REWARDS)).toHaveLength(1);
  });

  it('profiler og år er isolerede', async () => {
    const { service, dates } = setup([2026, 12, 5]);
    const a = await makeProfile(service, 'A');
    const b = await makeProfile(service, 'B', 'easy');
    await winDay(service, a, 2026, 1);
    expect(totalGifts(await service.getYear(a.id, 2026))).toBe(10);
    expect(totalGifts(await service.getYear(b.id, 2026))).toBe(0);
    setDate(dates, 2027, 12, 2);
    const ya = await service.ensureYear(a.id, 2027);
    expect(totalGifts(ya)).toBe(0);
    expect(totalGifts(await service.getYear(a.id, 2026))).toBe(10);
    expect((await service.listYears(a.id)).map((y) => y.year)).toEqual([2026, 2027]);
  });

  it('alle profiler får samme dagsord uanset sværhedsgrad', async () => {
    const { service } = setup([2026, 12, 5]);
    const a = await makeProfile(service, 'A', 'easy');
    const b = await makeProfile(service, 'B', 'normal');
    const ya = await service.ensureYear(a.id, 2026);
    const yb = await service.ensureYear(b.id, 2026);
    expect(ya.calendarWords.map((w) => w.id)).toEqual(yb.calendarWords.map((w) => w.id));
    expect(new Set(ya.calendarWords.map((w) => w.id)).size).toBe(24);
    expect(ya.calendarWords[23].display).toBe('Stjerne');
    expect(ya.calendarWords[0].display).toBe('Kalender');
  });

  it('gemt kalender ændres ikke af indholdsopdatering', async () => {
    const { service, storage, dates } = setup([2026, 12, 5]);
    const p = await makeProfile(service);
    const before = await service.ensureYear(p.id, 2026);
    const updated = new GameService(storage, dates, { ...service.content, version: 'ny-version', calendar: service.content.calendar.slice(30) });
    const after = await updated.ensureYear(p.id, 2026);
    expect(after.calendarWords).toEqual(before.calendarWords);
  });

  it('åben fane kan ikke omgå sæsonlukning 24/12 → 25/12', async () => {
    const { service, dates } = setup([2026, 12, 24, 23]);
    const p = await makeProfile(service);
    const s = await service.startDay(p, 2026, 7);
    if (!s.ok) throw new Error();
    setDate(dates, 2026, 12, 24, 23, 59);
    const ok = await service.guessCalendar(p.id, 2026, { kind: 'day', day: 7 }, s.value.id, correctLetters(s.value)[0]);
    expect(ok.ok).toBe(true);
    setDate(dates, 2026, 12, 25, 0, 0);
    const closed = await service.guessCalendar(p.id, 2026, { kind: 'day', day: 7 }, s.value.id, correctLetters(s.value)[1] ?? 'Q');
    expect(closed).toEqual({ ok: false, error: 'seasonClosed' });
    expect(await service.startDay(p, 2026, 8)).toEqual({ ok: false, error: 'seasonClosed' });
  });

  it('åben fane: 30/11 → 1/12 åbner låge 1', async () => {
    const { service, dates } = setup([2026, 11, 30, 23]);
    const p = await makeProfile(service);
    expect(await service.startDay(p, 2026, 1)).toEqual({ ok: false, error: 'locked' });
    setDate(dates, 2026, 12, 1, 0, 1);
    expect((await service.startDay(p, 2026, 1)).ok).toBe(true);
  });

  it('historiske træer kan ses, men ikke spilles', async () => {
    const { service, dates } = setup([2026, 12, 5]);
    const p = await makeProfile(service);
    await winDay(service, p, 2026, 2);
    setDate(dates, 2027, 3, 1);
    expect(await service.startDay(p, 2026, 3)).toEqual({ ok: false, error: 'seasonClosed' });
    const yp = await service.getYear(p.id, 2026);
    expect(earnedRewards(yp, REWARDS)).toHaveLength(1);
    expect(doorAccess(dates.today(), 2026, 3)).toBe('closedSeason');
  });
});

describe('finale den 24.', () => {
  it('nyt ord efter nederlag, stjerne én gang og præcis 240 gaver', async () => {
    const { service } = setup([2026, 12, 24]);
    const p = await makeProfile(service);
    await winDay(service, p, 2026, 1, 4); // 6 gaver
    const s = await service.startDay(p, 2026, 2);
    if (!s.ok) throw new Error();
    await loseRound(service, p, 2026, { kind: 'day', day: 2 }, s.value);

    const f1 = await service.startFinale(p, 2026);
    if (!f1.ok) throw new Error();
    const yp0 = await service.getYear(p.id, 2026);
    expect(f1.value.word.id).toBe(yp0!.calendarWords[23].id);
    const lost = await loseRound(service, p, 2026, { kind: 'finale' }, f1.value);
    expect(lost.status).toBe('lost');
    expect(totalGifts(await service.getYear(p.id, 2026))).toBe(6);

    const f2 = await service.startFinale(p, 2026);
    if (!f2.ok) throw new Error();
    expect(f2.value.id).not.toBe(f1.value.id);
    expect(f2.value.word.id).not.toBe(f1.value.word.id);
    expect(service.content.finale.some((w) => w.id === f2.value.word.id)).toBe(true);
    const lost2 = await loseRound(service, p, 2026, { kind: 'finale' }, f2.value);
    expect(lost2.status).toBe('lost');

    const f3 = await service.startFinale(p, 2026);
    if (!f3.ok) throw new Error();
    let r = f3.value;
    let grants = 0;
    for (const l of correctLetters(r)) {
      const g = await service.guessCalendar(p.id, 2026, { kind: 'finale' }, r.id, l);
      if (g.ok) {
        r = g.value.round;
        if (g.value.rewardGranted) grants++;
      }
    }
    expect(r.status).toBe('won');
    expect(grants).toBe(1);
    const yp = await service.getYear(p.id, 2026);
    expect(yp!.finale.status).toBe('won');
    expect(totalGifts(yp)).toBe(240);
    const rewards = earnedRewards(yp, REWARDS).map((x) => x.day);
    expect(rewards).toEqual([1, 24]); // tabte/missede dekorationer returneres ikke
    expect(await service.startFinale(p, 2026)).toEqual({ ok: false, error: 'alreadyWon' });
    // Gentaget gæt på afsluttet runde giver intet nyt
    const again = await service.guessCalendar(p.id, 2026, { kind: 'finale' }, r.id, 'Q');
    expect(again.ok && again.value.rewardGranted).toBe(false);
  });

  it('finale uden tidligere låger giver også 240; missede låger efter finalen giver pynt men ikke flere gaver', async () => {
    const { service } = setup([2026, 12, 24]);
    const p = await makeProfile(service);
    const f = await service.startFinale(p, 2026);
    if (!f.ok) throw new Error();
    let r = f.value;
    for (const l of correctLetters(r)) {
      const g = await service.guessCalendar(p.id, 2026, { kind: 'finale' }, r.id, l);
      if (g.ok) r = g.value.round;
    }
    expect(totalGifts(await service.getYear(p.id, 2026))).toBe(240);
    await winDay(service, p, 2026, 10);
    const yp = await service.getYear(p.id, 2026);
    expect(totalGifts(yp)).toBe(240);
    expect(yp!.days[10].official?.giftsSaved).toBe(10); // historik bevares
    expect(earnedRewards(yp, REWARDS).map((x) => x.day)).toEqual([10, 24]);
  });

  it('afbrudt finaleanimation mister intet: sejr er gemt før præsentationen', async () => {
    const { service, storage, dates } = setup([2026, 12, 24]);
    const p = await makeProfile(service);
    const f = await service.startFinale(p, 2026);
    if (!f.ok) throw new Error();
    let r = f.value;
    for (const l of correctLetters(r)) {
      const g = await service.guessCalendar(p.id, 2026, { kind: 'finale' }, r.id, l);
      if (g.ok) r = g.value.round;
    }
    // Fanen lukkes før animationen er set
    const reopened = new GameService(storage, dates);
    const yp = await reopened.getYear(p.id, 2026);
    expect(yp!.finale.status).toBe('won');
    expect(yp!.finale.presentationSeen).toBe(false);
    expect(totalGifts(yp)).toBe(240);
    await reopened.markFinaleSeen(p.id, 2026);
    await reopened.markFinaleSeen(p.id, 2026);
    const y2 = await reopened.getYear(p.id, 2026);
    expect(totalGifts(y2)).toBe(240);
    expect(earnedRewards(y2, REWARDS)).toHaveLength(1);
  });

  it('finalen er ikke spilbar efter den 24.', async () => {
    const { service, dates } = setup([2026, 12, 24]);
    const p = await makeProfile(service);
    const f = await service.startFinale(p, 2026);
    if (!f.ok) throw new Error();
    setDate(dates, 2026, 12, 25, 0, 1);
    expect(await service.startFinale(p, 2026)).toEqual({ ok: false, error: 'seasonClosed' });
    const g = await service.guessCalendar(p.id, 2026, { kind: 'finale' }, f.value.id, 'A');
    expect(g).toEqual({ ok: false, error: 'seasonClosed' });
  });
});

describe('freeplay', () => {
  it('ændrer aldrig kalenderdata', async () => {
    const { service, storage } = setup([2026, 12, 5]);
    const p = await makeProfile(service);
    await winDay(service, p, 2026, 1, 2);
    const before = JSON.stringify(await storage.listYears(p.id));
    for (let i = 0; i < 3; i++) {
      const r = await service.startFreeplay(p, true);
      for (const l of correctLetters(r)) await service.guessFreeplay(p.id, r.id, l);
    }
    const r = await service.startFreeplay(p, true);
    for (const l of wrongLetters(r, 10)) await service.guessFreeplay(p.id, r.id, l);
    expect(JSON.stringify(await storage.listYears(p.id))).toBe(before);
    const fp = await service.getFreeplay(p.id);
    expect(fp!.wordsSolved).toBe(3);
    expect(fp!.wordsLost).toBe(1);
    expect(fp!.score).toBe(30); // tre ord uden fejl = 3 x 10 legegaver
    expect(freeplayStats(fp)).toEqual({ won: 3, lost: 1, score: 30, winPct: 75 });
  });

  it('virker uden for sæsonen og gentager ikke ord før puljen er brugt', async () => {
    const { service } = setup([2027, 6, 1]);
    const p = await makeProfile(service);
    const n = service.content.freeplay.length;
    const seen = new Set<string>();
    let last = '';
    for (let i = 0; i < n; i++) {
      const r = await service.startFreeplay(p, true);
      expect(seen.has(r.word.id)).toBe(false);
      seen.add(r.word.id);
      last = r.word.id;
    }
    const next = await service.startFreeplay(p, true);
    expect(next.word.id).not.toBe(last);
  });
});

describe('lagring', () => {
  it('skrivefejl rapporteres og lover ikke at data er gemt', async () => {
    const { service, storage } = setup([2026, 12, 5]);
    const p = await makeProfile(service);
    const s = await service.startDay(p, 2026, 1);
    if (!s.ok) throw new Error();
    storage.failWrites = true;
    await expect(service.guessCalendar(p.id, 2026, { kind: 'day', day: 1 }, s.value.id, 'Q')).rejects.toBeInstanceOf(StorageWriteError);
    storage.failWrites = false;
    const yp = await service.getYear(p.id, 2026);
    expect(yp!.days[1].round!.guessed).toEqual([]);
  });

  it('beskadigede data sættes til side i stedet for at vælte appen', async () => {
    const storage = new MemoryStorage();
    storage.injectRaw('profiles', 'x', { foo: 'bar' });
    storage.injectRaw('years', 'p1|2026', { schema: 1, profileId: 'p1', year: 2026 });
    const service = new GameService(storage, new AdjustableDateService(copenhagenInstant(2026, 12, 2)));
    expect(await service.listProfiles()).toEqual([]);
    expect(await service.getYear('p1', 2026)).toBeUndefined();
    expect(storage.quarantinedCount()).toBe(2);
  });

  it('IndexedDB: to faner kan ikke give dobbelte belønninger eller overskrive afsluttet resultat', async () => {
    const dates = new AdjustableDateService(copenhagenInstant(2026, 12, 5));
    const tabA = new GameService(await IndexedDbStorage.open(), dates);
    const tabB = new GameService(await IndexedDbStorage.open(), dates);
    await tabA.clearAll();
    const p = await tabA.createProfile({ nickname: 'Tab', avatar: 'ugle', difficulty: 'normal' });
    const s = await tabA.startDay(p, 2026, 2);
    if (!s.ok) throw new Error();
    const resumedB = await tabB.startDay(p, 2026, 2);
    expect(resumedB.ok && resumedB.value.id).toBe(s.value.id);
    let r = s.value;
    const letters = correctLetters(r);
    for (const l of letters) {
      const g = await tabA.guessCalendar(p.id, 2026, { kind: 'day', day: 2 }, r.id, l);
      if (g.ok) r = g.value.round;
    }
    expect(r.status).toBe('won');
    // Forældet fane B prøver at gætte forkert på den gamle runde
    for (const l of wrongLetters(r, 10)) await tabB.guessCalendar(p.id, 2026, { kind: 'day', day: 2 }, r.id, l);
    const yp = await tabB.getYear(p.id, 2026);
    expect(yp!.days[2].official).toMatchObject({ outcome: 'won', giftsSaved: 10 });
    expect(totalGifts(yp)).toBe(10);
    // Persistens: åbn igen
    const tabC = new GameService(await IndexedDbStorage.open(), dates);
    expect(totalGifts(await tabC.getYear(p.id, 2026))).toBe(10);
    await tabC.deleteProfile(p.id);
    expect(await tabC.getYear(p.id, 2026)).toBeUndefined();
    expect(await tabC.listProfiles()).toEqual([]);
  });
});
