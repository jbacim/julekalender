import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServiceError, GuessOutcome, ActionResult } from '../../app/gameService';
import { giftsRemaining, isHintAvailable } from '../../domain/round';
import { normalizeLetter } from '../../domain/letters';
import type { RoundTarget } from '../../domain/progress';
import type { Round } from '../../domain/types';
import { rewardForDay } from '../../content/rewards';
import { useApp, type GameTarget } from '../AppContext';
import { Notices } from '../components/common';
import { Keyboard } from '../components/Keyboard';
import { WordSlots } from '../components/WordSlots';
import { GiftRow } from '../components/GiftRow';
import { Nisse, type NisseMood } from '../art/Nisse';
import { IconBack, IconBulb, IconSpeaker } from '../art/Icons';
import { MuteButton } from '../components/common';
import { RewardIcon } from '../world/World2D';

const LINES_WRONG = ['Hihi, den gave tager jeg!', 'Tak for gaven!', 'Hov, den var ikke med!', 'Nissen snupper en!', 'Hep hep – en til sækken!'];
const LINES_RIGHT = ['Åh nej, du fandt den!', 'Hmpf, den var god!', 'Du er snedig!', 'Hov hov – flot!', 'Pyha, du er god til det her!'];

const ERROR_TEXT: Record<ServiceError, string> = {
  locked: 'Den låge er ikke klar endnu.',
  seasonClosed: 'Kalenderen er lukket for i år. Du kan stadig spille Fri leg!',
  notFinaleDay: 'Finalen kan kun spilles den 24. december.',
  alreadyWon: 'Den er allerede klaret!',
  invalidDay: 'Den låge findes ikke.',
  noProfile: 'Vælg en profil først.',
  stale: 'Spillet blev opdateret i et andet vindue.',
};

function pick(lines: string[], n: number) {
  return lines[n % lines.length];
}

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function GameScreen({ target }: { target: GameTarget }) {
  const { service, activeProfile, navigate, guard, notify, play, speak, canSpeak, today, dataVersion } = useApp();
  const [round, setRound] = useState<Round | null>(null);
  const [mood, setMood] = useState<NisseMood>('idle');
  const [bubble, setBubble] = useState<string>('');
  const [eventKey, setEventKey] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [rewardJustWon, setRewardJustWon] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const roundRef = useRef<Round | null>(null);
  roundRef.current = round;
  const counter = useRef(0);
  const moodTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isFreeplay = target.kind === 'freeplay';
  const calTarget: RoundTarget | null =
    target.kind === 'day' ? { kind: 'day', day: target.day } : target.kind === 'finale' ? { kind: 'finale' } : null;

  const leave = useCallback(
    (msg?: string) => {
      if (msg) notify(msg);
      navigate({ name: 'home' });
    },
    [navigate, notify],
  );

  const start = useCallback(
    async (forceNew = false) => {
      if (!activeProfile) return;
      setHintOpen(false);
      setRewardJustWon(false);
      setMood('idle');
      setBubble(isFreeplay ? 'Lad os lege!' : 'Kan du redde mine … øh, dine gaver?');
      let res: ActionResult<Round> | undefined;
      if (target.kind === 'freeplay') {
        const r = await guard(() => service.startFreeplay(activeProfile, forceNew));
        res = r ? { ok: true, value: r } : undefined;
      } else if (target.kind === 'day') {
        res = await guard(() => service.startDay(activeProfile, target.year, target.day));
      } else {
        res = await guard(() => service.startFinale(activeProfile, target.year));
      }
      if (!res) return;
      if (!res.ok) {
        if (res.error === 'alreadyWon' && target.kind === 'finale') {
          navigate({ name: 'finale', year: target.year, replay: true });
          return;
        }
        leave(ERROR_TEXT[res.error]);
        return;
      }
      setRound(res.value);
    },
    [activeProfile, target, service, guard, leave, navigate, isFreeplay],
  );

  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id, target.kind, target.kind !== 'freeplay' ? target.year : 0, target.kind === 'day' ? target.day : 0]);

  // Hvis kalenderen lukker (fx midnat den 24.), mens spillet er åbent
  useEffect(() => {
    if (!round || round.status !== 'playing' || target.kind === 'freeplay') return;
    void (async () => {
      const yp = await service.getYear(activeProfile!.id, target.year);
      const fresh = calTarget?.kind === 'finale' ? yp?.finale.round : yp?.days[target.kind === 'day' ? target.day : 0]?.round;
      // Anden fane kan have afsluttet runden – vis nyeste gemte tilstand
      if (fresh && fresh.id === round.id && fresh.guessed.length !== round.guessed.length) setRound(fresh);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion]);

  useEffect(() => {
    if (!round || round.status !== 'playing' || isFreeplay) return;
    if (target.kind === 'day' || target.kind === 'finale') {
      const stillOpen = today.month === 12 && today.day <= 24 && today.year === target.year && (target.kind === 'day' || today.day === 24);
      if (!stillOpen) leave(ERROR_TEXT.seasonClosed);
    }
  }, [today, round, isFreeplay, target, leave]);

  const react = useCallback(
    (outcome: GuessOutcome) => {
      const e = outcome.effect;
      counter.current++;
      clearTimeout(moodTimer.current);
      if (e.kind === 'correct') {
        play('correct');
        setMood('oops');
        setBubble(pick(LINES_RIGHT, counter.current));
      } else if (e.kind === 'wrong') {
        play('wrong');
        setMood('grab');
        setBubble(pick(LINES_WRONG, counter.current));
      }
      setEventKey((k) => k + 1);
      if (outcome.finished) {
        const won = outcome.round.status === 'won';
        play(won ? 'win' : 'lose');
        setMood(won ? 'sad' : 'cheer');
        setBubble(won ? 'Øv! Du fandt ordet!' : 'Hihi! Men du var tæt på!');
        if (outcome.rewardGranted) setRewardJustWon(true);
        speak(won ? `Godt gået! Ordet var ${outcome.round.word.display}.` : `Ordet var ${outcome.round.word.display}.`);
      } else if (e.kind === 'correct' || e.kind === 'wrong') {
        moodTimer.current = setTimeout(() => setMood('idle'), 900);
      }
    },
    [play, speak],
  );

  /** Gæt sættes i kø, så hurtige tryk behandles i rækkefølge uden at blokere input. */
  const guess = useCallback(
    (raw: string) => {
      const letter = normalizeLetter(raw);
      const cur = roundRef.current;
      if (!letter || !cur || cur.status !== 'playing' || !activeProfile) return;
      if (cur.guessed.includes(letter)) return; // gentaget tryk: ingen effekt
      queue.current = queue.current.then(async () => {
        const r = roundRef.current;
        if (!r || r.status !== 'playing' || r.guessed.includes(letter)) return;
        const res =
          target.kind === 'freeplay'
            ? await guard(() => service.guessFreeplay(activeProfile.id, r.id, letter))
            : await guard(() => service.guessCalendar(activeProfile.id, target.year, calTarget!, r.id, letter));
        if (!res) return;
        if (!res.ok) {
          if (res.error === 'stale') {
            notify(ERROR_TEXT.stale);
            await start();
          } else leave(ERROR_TEXT[res.error]);
          return;
        }
        roundRef.current = res.value.round;
        setRound(res.value.round);
        react(res.value);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeProfile, target, service, guard, notify, leave, react, start],
  );

  // Fysisk tastatur – kun på spilskærmen og aldrig mens der skrives i et felt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (isTypingTarget(e.target) || document.querySelector('[role="dialog"]')) return;
      const l = normalizeLetter(e.key);
      if (!l) return;
      e.preventDefault();
      guess(l);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guess]);

  useEffect(() => () => clearTimeout(moodTimer.current), []);

  async function openHint() {
    if (!round || !activeProfile || !isHintAvailable(round)) return;
    setHintOpen(true);
    play('tap');
    if (!round.hintUsed) {
      if (target.kind === 'freeplay') {
        const r = await guard(() => service.useHintFreeplay(activeProfile.id, round.id));
        if (r) setRound(r);
      } else {
        await guard(() => service.useHintCalendar(activeProfile.id, target.year, calTarget!, round.id));
      }
    }
    speak(`Hint: ${round.word.hint}`);
  }

  if (!activeProfile) return null;

  const title =
    target.kind === 'freeplay'
      ? 'Fri leg'
      : target.kind === 'finale'
        ? 'Juleaften – finalen'
        : round?.mode === 'practice'
          ? `Låge ${target.day} – øvelse`
          : `Låge ${target.day}`;

  const remaining = round ? giftsRemaining(round) : 10;
  const finished = round && round.status !== 'playing';
  const hintAvailable = round ? isHintAvailable(round) : false;

  return (
    <div className={`screen screen--game mode-${round?.mode ?? target.kind}`}>
      <header className="game-header">
        <button type="button" className="round-btn" onClick={() => navigate({ name: 'home' })} aria-label="Tilbage til kalenderen">
          <IconBack />
        </button>
        <h1 className="game-title-small">{title}</h1>
        <MuteButton />
      </header>
      {isFreeplay && (
        <p className="mode-banner mode-banner--freeplay" role="note">
          Fri leg – tæller ikke med i kalenderen
        </p>
      )}
      {round?.mode === 'practice' && (
        <p className="mode-banner mode-banner--practice" role="note">
          Øvelse – giver ingen gaver eller pynt. Dagens resultat er allerede gemt.
        </p>
      )}
      <Notices />
      {!round ? (
        <div className="loading" role="status">
          Åbner lågen …
        </div>
      ) : (
        <main className="game-layout">
          <section className="game-stage" aria-label="Nissen og gaverne">
            <div className="nisse-wrap" key={`n${eventKey}`}>
              <Nisse mood={mood} size={110} sackFill={round.mistakes} />
              {bubble && (
                <p className="speech-bubble" aria-live="polite">
                  {bubble}
                </p>
              )}
            </div>
            <GiftRow remaining={remaining} variant={isFreeplay ? 'freeplay' : 'calendar'} />
          </section>

          <section className="game-board" aria-label="Ordet">
            <WordSlots round={round} revealAll={!!finished} />
            <div className="game-tools">
              {hintAvailable && !finished && (
                <button type="button" className={`btn btn--hint${hintOpen ? ' btn--hint-open' : ''}`} onClick={openHint}>
                  <IconBulb /> Hint
                </button>
              )}
              {canSpeak && !finished && (
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => speak(hintOpen ? `Hint: ${round.word.hint}` : 'Tryk på et bogstav. Er det i ordet, kommer det frem. Er det ikke, tager nissen en gave.')}
                >
                  <IconSpeaker /> Læs op
                </button>
              )}
            </div>
            {hintOpen && hintAvailable && !finished && (
              <p className="hint-box" role="status">
                <strong>Hint:</strong> {round.word.hint}
              </p>
            )}
            {finished ? (
              <ResultPanel
                round={round}
                target={target}
                rewardJustWon={rewardJustWon}
                onAgain={() => start(true)}
                onHome={() => navigate({ name: 'home' })}
                onFinale={() => target.kind !== 'freeplay' && navigate({ name: 'finale', year: target.year, replay: false })}
                onSpeakWord={canSpeak ? () => speak(`Ordet var ${round.word.display}`) : undefined}
              />
            ) : (
              <Keyboard guessed={round.guessed} word={round.word.normalized} onLetter={guess} />
            )}
          </section>
        </main>
      )}
    </div>
  );
}

function ResultPanel({
  round,
  target,
  rewardJustWon,
  onAgain,
  onHome,
  onFinale,
  onSpeakWord,
}: {
  round: Round;
  target: GameTarget;
  rewardJustWon: boolean;
  onAgain: () => void;
  onHome: () => void;
  onFinale: () => void;
  onSpeakWord?: () => void;
}) {
  const won = round.status === 'won';
  const saved = won ? round.maxMistakes - round.mistakes : 0;
  const reward = round.mode === 'calendar' && target.kind === 'day' ? rewardForDay(target.day) : undefined;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  let heading: string;
  let body: React.ReactNode;
  let actions: React.ReactNode;

  if (round.mode === 'finale') {
    if (won) {
      heading = 'Du vandt stjernen!';
      body = <p>Nissen har fortrudt sine drillerier og vil give alle gaverne tilbage.</p>;
      actions = (
        <button type="button" className="btn btn--primary btn--big" onClick={onFinale}>
          Se nissen aflevere gaverne
        </button>
      );
    } else {
      heading = 'Nissen var hurtig denne gang!';
      body = <p>Juleaften må du prøve igen og igen – med et nyt ord.</p>;
      actions = (
        <>
          <button type="button" className="btn btn--primary btn--big" onClick={onAgain}>
            Prøv et nyt ord
          </button>
          <button type="button" className="btn btn--ghost" onClick={onHome}>
            Til kalenderen
          </button>
        </>
      );
    }
  } else if (round.mode === 'freeplay') {
    heading = won ? 'Flot klaret!' : 'Godt forsøgt!';
    body = <p>{won ? `Du reddede ${saved} legegaver.` : 'Nissen fik legegaverne denne gang.'} Fri leg tæller ikke i kalenderen.</p>;
    actions = (
      <>
        <button type="button" className="btn btn--primary btn--big" onClick={onAgain}>
          Nyt ord
        </button>
        <button type="button" className="btn btn--ghost" onClick={onHome}>
          Til kalenderen
        </button>
      </>
    );
  } else if (round.mode === 'practice') {
    heading = won ? 'Godt øvet!' : 'Godt forsøgt!';
    body = <p>Øverunder giver ikke gaver eller pynt, men du bliver bedre for hver gang.</p>;
    actions = (
      <>
        <button type="button" className="btn btn--primary" onClick={onAgain}>
          Øv igen
        </button>
        <button type="button" className="btn btn--ghost" onClick={onHome}>
          Til kalenderen
        </button>
      </>
    );
  } else if (won) {
    heading = 'Godt gået!';
    body = (
      <div className="result-reward">
        <p>
          Du reddede <strong>{saved}</strong> {saved === 1 ? 'gave' : 'gaver'}
          {reward ? ' og vandt:' : '.'}
        </p>
        {reward && (
          <div className={`reward-card${rewardJustWon ? ' reward-card--new' : ''}`}>
            <RewardIcon reward={reward} size={72} />
            <div>
              <strong>{reward.name}</strong>
              <span>{reward.description}</span>
            </div>
          </div>
        )}
      </div>
    );
    actions = (
      <button type="button" className="btn btn--primary btn--big" onClick={onHome}>
        Se det i din juleverden
      </button>
    );
  } else {
    heading = 'Nissen fik gaverne denne gang';
    body = <p>Det sker for selv de bedste! Du kan øve dig på lågen – det giver ikke gaver, men det er sjovt.</p>;
    actions = (
      <>
        <button type="button" className="btn btn--primary" onClick={onAgain}>
          Øv på lågen
        </button>
        <button type="button" className="btn btn--ghost" onClick={onHome}>
          Til kalenderen
        </button>
      </>
    );
  }

  return (
    <div className={`result result--${won ? 'won' : 'lost'}`}>
      <h2 ref={headingRef} tabIndex={-1}>
        {heading}
      </h2>
      <p className="result-word">
        Ordet var <strong>{round.word.display}</strong>
        {onSpeakWord && (
          <button type="button" className="round-btn round-btn--small" onClick={onSpeakWord} aria-label="Læs ordet op">
            <IconSpeaker />
          </button>
        )}
      </p>
      {body}
      <div className="row-actions">{actions}</div>
    </div>
  );
}
