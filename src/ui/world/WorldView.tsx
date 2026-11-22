import { useEffect, useRef, useState } from 'react';
import type { RewardDefinition } from '../../domain/types';
import { hasWebGL, qualityTier } from '../../services/capabilities';
import { useApp } from '../AppContext';
import { World2D } from './World2D';
import { IconRotateLeft, IconRotateRight, IconZoomIn, IconZoomOut } from '../art/Icons';
import type { ThreeWorld } from '../../world/ThreeWorld';
import type { FinaleCue } from '../../world/finaleScript';

export interface FinaleRequest {
  /** Ændres for at (gen)afspille finalen. */
  key: number;
  fromGifts: number;
  onDone: () => void;
  /** Kaldes ved hvert trin i finalen (til tekster og lyd). */
  onCue?: (cue: FinaleCue) => void;
}

interface Props {
  rewards: RewardDefinition[];
  gifts: number;
  lit: boolean;
  interactive?: boolean;
  finale?: FinaleRequest | null;
  label: string;
  className?: string;
  /** Sand den 24. december: julemanden lander med kane og rensdyr. */
  santa?: boolean;
  /** Vis kun julemanden parkeret (ingen landing), fx under finalen. */
  santaParkedOnly?: boolean;
  /** Vis knapper, så barnet selv kan sende et rensdyr eller en yeti forbi (kun i 3D). */
  visitorButtons?: boolean;
}

/**
 * Julemandens landing vises én gang pr. session; derefter står kanen parkeret.
 * Kort frist, så React StrictModes dobbelte render ved mount ikke springer landingen over.
 */
let santaArrivalAt: number | null = null;
function santaShouldArrive(): boolean {
  const now = performance.now();
  if (santaArrivalAt === null) santaArrivalAt = now;
  return now - santaArrivalAt < 1500;
}

type Mode = 'loading' | '3d' | '2d';

/**
 * Viser juleverdenen. 3D indlæses separat (egen chunk), så UI'et aldrig venter på den.
 * Uden WebGL eller ved tabt grafikkontekst bruges en pæn 2D-version med samme optjente pynt.
 */
export function WorldView({ rewards, gifts, lit, interactive = false, finale, label, className, santa = false, santaParkedOnly = false, visitorButtons = false }: Props) {
  const { reducedMotion, settings, play } = useApp();
  const hostRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<ThreeWorld | null>(null);
  const [mode, setMode] = useState<Mode>(() => (hasWebGL() ? 'loading' : '2d'));
  const [fallbackLit, setFallbackLit] = useState(lit);
  const santaMode = useRef<'arrive' | 'parked' | undefined>(undefined);
  if (!santa) santaMode.current = undefined;
  else if (!santaMode.current) {
    santaMode.current = !santaParkedOnly && santaShouldArrive() ? 'arrive' : 'parked';
  }
  const stateRef = useRef({ rewards, gifts, lit, santa: santaMode.current });
  stateRef.current = { rewards, gifts, lit, santa: santaMode.current };
  const lastFinaleKey = useRef<number | null>(null);

  // Opret/nedlæg 3D-verden
  useEffect(() => {
    if (mode === '2d') return;
    let cancelled = false;
    let world: ThreeWorld | null = null;
    import('../../world/ThreeWorld')
      .then(({ ThreeWorld }) => {
        if (cancelled || !hostRef.current) return;
        try {
          world = new ThreeWorld(hostRef.current, {
            quality: qualityTier(settings.reducedEffects),
            reducedMotion,
            interactive,
            onContextLost: () => setMode('2d'),
          });
          world.update(stateRef.current);
          worldRef.current = world;
          setMode('3d');
        } catch {
          setMode('2d');
        }
      })
      .catch(() => !cancelled && setMode('2d'));
    return () => {
      cancelled = true;
      world?.dispose();
      worldRef.current = null;
      lastFinaleKey.current = null;
    };
    // Genopbyg kun ved ændret grafikniveau eller bevægelse
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode === '2d', reducedMotion, settings.reducedEffects]);

  useEffect(() => {
    worldRef.current?.update(stateRef.current);
  }, [rewards, gifts, lit, mode, santa]);

  useEffect(() => {
    worldRef.current?.setInteractive(interactive);
  }, [interactive, mode]);

  // Finale
  useEffect(() => {
    if (!finale || lastFinaleKey.current === finale.key) return;
    if (mode === 'loading') return;
    lastFinaleKey.current = finale.key;
    if (mode === '3d' && worldRef.current) {
      worldRef.current.update(stateRef.current);
      worldRef.current.playFinale(finale.fromGifts, finale.onDone, finale.onCue);
      return;
    }
    // 2D-finale: samme trin i en kortere, tegnet udgave
    setFallbackLit(false);
    const k = reducedMotion ? 0.35 : 1;
    const steps: [number, () => void][] = [
      [0, () => finale.onCue?.('door')],
      [1500, () => finale.onCue?.('gifts')],
      [3500, () => finale.onCue?.('starLanded')],
      [4300, () => {
        setFallbackLit(true);
        finale.onCue?.('lights');
      }],
      [5600, () => finale.onCue?.('wave')],
      [7000, () => {
        finale.onCue?.('done');
        finale.onDone();
      }],
    ];
    const timers = steps.map(([ms, fn]) => setTimeout(fn, ms * k));
    return () => timers.forEach(clearTimeout);
  }, [finale, mode, reducedMotion]);

  useEffect(() => {
    if (!finale) {
      setFallbackLit(lit);
      // Finalen blev sprunget over / forladt: vis slut-tilstanden med det samme.
      worldRef.current?.skipFinale();
    }
  }, [lit, finale]);

  const showControls = interactive;

  return (
    <div className={`world ${className ?? ''}`} data-mode={mode}>
      {mode !== '3d' && (
        <World2D rewards={rewards} gifts={gifts} lit={finale ? fallbackLit : lit} label={label} santa={santa} />
      )}
      {mode !== '2d' && (
        <div ref={hostRef} className="world3d" role="img" aria-label={label} />
      )}
      {mode === '3d' && showControls && (
        <div className="world-controls" role="group" aria-label="Drej træet">
          <button type="button" className="round-btn" onClick={() => worldRef.current?.rotate(-0.5)} aria-label="Drej til venstre">
            <IconRotateLeft />
          </button>
          <button type="button" className="round-btn" onClick={() => worldRef.current?.zoom(0.85)} aria-label="Zoom ind">
            <IconZoomIn />
          </button>
          <button type="button" className="round-btn" onClick={() => worldRef.current?.zoom(1.15)} aria-label="Zoom ud">
            <IconZoomOut />
          </button>
          <button type="button" className="round-btn" onClick={() => worldRef.current?.rotate(0.5)} aria-label="Drej til højre">
            <IconRotateRight />
          </button>
        </div>
      )}
      {mode === '3d' && visitorButtons && !finale && (
        <div className="visitor-buttons" role="group" aria-label="Send en gæst forbi">
          <button
            type="button"
            className="visitor-btn"
            aria-label="Send rensdyr"
            title="Send rensdyr"
            onClick={() => {
              play('tap');
              worldRef.current?.sendVisitor('reindeer');
            }}
          >
            <ReindeerIcon />
          </button>
          <button
            type="button"
            className="visitor-btn visitor-btn--yeti"
            aria-label="Send yeti"
            title="Send yeti"
            onClick={() => {
              play('tap');
              worldRef.current?.sendVisitor('yeti');
            }}
          >
            <YetiIcon />
          </button>
        </div>
      )}
      {mode === '2d' && <p className="world-note">Enkel tegnet visning</p>}
    </div>
  );
}

function ReindeerIcon() {
  return (
    <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
      <path d="M11 6 l-3 -4 M11 6 l2 -4 M11 6 l-4 1 M21 6 l3 -4 M21 6 l-2 -4 M21 6 l4 1" stroke="#7a4f2e" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <ellipse cx="16" cy="16" rx="8" ry="9" fill="#a66d45" />
      <ellipse cx="16" cy="21" rx="5" ry="4" fill="#e2c3a0" />
      <circle cx="13" cy="14" r="1.4" fill="#2a1d18" />
      <circle cx="19" cy="14" r="1.4" fill="#2a1d18" />
      <circle cx="16" cy="19.5" r="2.6" fill="#e3343f" />
    </svg>
  );
}

function YetiIcon() {
  return (
    <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
      <path d="M8 13 Q12 1 22 3 Q27 5 26 10 Z" fill="#d52b3a" />
      <circle cx="26" cy="10" r="2.4" fill="#f6f2ea" />
      <rect x="6" y="11" width="20" height="4" rx="2" fill="#f6f2ea" />
      <circle cx="16" cy="20" r="10" fill="#f4f7fb" stroke="#c9d6e6" />
      <ellipse cx="16" cy="21" rx="6.5" ry="5.5" fill="#8fa3bf" />
      <circle cx="13.5" cy="19.5" r="1.3" fill="#1d2433" />
      <circle cx="18.5" cy="19.5" r="1.3" fill="#1d2433" />
      <path d="M13 23 Q16 25.5 19 23" stroke="#1d2433" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
