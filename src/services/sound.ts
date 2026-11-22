/**
 * Små syntetiserede lydeffekter via Web Audio – ingen eksterne filer.
 * AudioContext oprettes først efter en brugerhandling, og alt er valgfrit.
 */
export type SoundName = 'correct' | 'wrong' | 'win' | 'lose' | 'door' | 'tap' | 'finale';

type Note = [freq: number, start: number, dur: number, type?: OscillatorType, gain?: number];

const SOUNDS: Record<SoundName, Note[]> = {
  tap: [[660, 0, 0.05, 'sine', 0.05]],
  correct: [
    [880, 0, 0.12, 'triangle', 0.12],
    [1318.5, 0.08, 0.18, 'triangle', 0.1],
  ],
  wrong: [
    [330, 0, 0.12, 'square', 0.04],
    [262, 0.1, 0.18, 'square', 0.04],
  ],
  door: [
    [523.3, 0, 0.1, 'triangle', 0.08],
    [784, 0.07, 0.16, 'triangle', 0.08],
  ],
  win: [
    [523.3, 0, 0.14, 'triangle', 0.12],
    [659.3, 0.12, 0.14, 'triangle', 0.12],
    [784, 0.24, 0.14, 'triangle', 0.12],
    [1046.5, 0.36, 0.36, 'triangle', 0.12],
  ],
  lose: [
    [392, 0, 0.2, 'sine', 0.08],
    [349.2, 0.18, 0.2, 'sine', 0.08],
    [392, 0.36, 0.3, 'sine', 0.08],
  ],
  finale: [
    [784, 0, 0.2, 'triangle', 0.1],
    [987.8, 0.15, 0.2, 'triangle', 0.1],
    [1174.7, 0.3, 0.2, 'triangle', 0.1],
    [1568, 0.45, 0.6, 'sine', 0.1],
    [2093, 0.6, 0.8, 'sine', 0.05],
  ],
};

class SoundPlayer {
  private ctx: AudioContext | null = null;
  enabled = true;

  private context(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    return this.ctx;
  }

  /** Kaldes kun fra brugerhandlinger (klik/tast). */
  play(name: SoundName): void {
    const ctx = this.context();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.01;
    for (const [freq, start, dur, type = 'sine', gain = 0.1] of SOUNDS[name]) {
      try {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t0 + start);
        g.gain.exponentialRampToValueAtTime(gain, t0 + start + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
        osc.connect(g).connect(ctx.destination);
        osc.start(t0 + start);
        osc.stop(t0 + start + dur + 0.05);
      } catch {
        /* lyd er valgfri */
      }
    }
  }

  suspend(): void {
    void this.ctx?.suspend().catch(() => undefined);
  }
}

export const sound = new SoundPlayer();
