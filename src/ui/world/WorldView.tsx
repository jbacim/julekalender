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
export function WorldView({ rewards, gifts, lit, interactive = false, finale, label, className, santa = false, santaParkedOnly = false }: Props) {
  const { reducedMotion, settings } = useApp();
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
      {mode === '2d' && <p className="world-note">Enkel tegnet visning</p>}
    </div>
  );
}
