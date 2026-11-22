/**
 * UDVIKLERVÆRKTØJ – kun i `npm run dev` (import.meta.env.DEV). Indgår ikke i produktionsbuildet.
 * Simulér dato, profilprogression og finale.
 */
import { useState } from 'react';
import type { AdjustableDateService } from '../services/dateService';
import { copenhagenInstant } from '../services/dateService';
import { capabilityOverrides } from '../services/capabilities';
import { DANISH_ALPHABET } from '../domain/letters';
import { useApp } from '../ui/AppContext';
import type { Round } from '../domain/types';

export default function DevPanel({ dates }: { dates: AdjustableDateService }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [upTo, setUpTo] = useState(5);
  const now = dates.now();
  const t = app.today;

  function setDate(d: Date | null) {
    if (d) {
      dates.setRunningFrom(d);
      sessionStorage.setItem('dev-date', d.toISOString());
    } else {
      dates.setFixed(null);
      sessionStorage.removeItem('dev-date');
    }
    // Få appen til at tjekke datoen igen (samme vej som ved genoptagelse af fanen)
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  }

  async function finishRound(round: Round, target: { kind: 'day'; day: number } | { kind: 'finale' }, win: boolean, nMistakes: number) {
    const p = app.activeProfile!;
    const word = round.word.normalized;
    const wrong = DANISH_ALPHABET.filter((l) => !word.includes(l));
    const right = [...new Set([...word].filter((c) => DANISH_ALPHABET.includes(c)))];
    const seq = win ? [...wrong.slice(0, Math.min(9, nMistakes)), ...right] : wrong.slice(0, 10);
    for (const l of seq) await app.service.guessCalendar(p.id, round.year!, target, round.id, l);
  }

  async function simulateDays(win: boolean) {
    const p = app.activeProfile;
    if (!p) return;
    setBusy(true);
    try {
      for (let d = 1; d <= Math.min(23, upTo); d++) {
        const yp = await app.service.ensureYear(p.id, t.year);
        if (yp.days[d]?.official) continue;
        const s = await app.service.startDay(p, t.year, d);
        if (s.ok) await finishRound(s.value, { kind: 'day', day: d }, win, mistakes);
      }
    } finally {
      setBusy(false);
    }
  }

  async function finale(win: boolean) {
    const p = app.activeProfile;
    if (!p) return;
    setBusy(true);
    try {
      const s = await app.service.startFinale(p, t.year);
      if (!s.ok) app.notify(`Finale: ${s.error}`, 'error');
      else await finishRound(s.value, { kind: 'finale' }, win, 2);
    } finally {
      setBusy(false);
    }
  }

  const y = t.year;
  return (
    <div className={`devpanel${open ? ' devpanel--open' : ''}`}>
      <button type="button" className="devpanel-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        DEV
      </button>
      {open && (
        <div className="devpanel-body">
          <p>
            <strong>Dato (Kbh):</strong> {t.day}/{t.month}/{t.year} – {now.toLocaleTimeString('da-DK', { timeZone: 'Europe/Copenhagen' })}
          </p>
          <div className="devpanel-row">
            <button onClick={() => setDate(null)}>Systemtid</button>
            <button onClick={() => setDate(copenhagenInstant(y, 11, 30, 23, 59))}>30/11 23:59</button>
            <button onClick={() => setDate(copenhagenInstant(y, 12, 1, 9))}>1/12</button>
            <button onClick={() => setDate(copenhagenInstant(y, 12, 10, 9))}>10/12</button>
            <button onClick={() => setDate(copenhagenInstant(y, 12, 24, 12))}>24/12</button>
            <button onClick={() => setDate(copenhagenInstant(y, 12, 24, 23, 59))}>24/12 23:59</button>
            <button onClick={() => setDate(copenhagenInstant(y, 12, 25, 0, 0))}>25/12</button>
            <button onClick={() => setDate(copenhagenInstant(y + 1, 6, 1, 12))}>Sommer næste år</button>
            <button onClick={() => setDate(new Date(now.getTime() + 86_400_000))}>+1 dag</button>
          </div>
          <label>
            Egen dato:{' '}
            <input
              type="datetime-local"
              onChange={(e) => {
                const [d, tm] = e.target.value.split('T');
                if (!d) return;
                const [yy, mm, dd] = d.split('-').map(Number);
                const [hh, mi] = (tm ?? '12:00').split(':').map(Number);
                setDate(copenhagenInstant(yy, mm, dd, hh, mi));
              }}
            />
          </label>
          <hr />
          <p>Profil: {app.activeProfile?.nickname ?? '–'}</p>
          <label>
            Låge 1 til <input type="number" min={1} max={23} value={upTo} onChange={(e) => setUpTo(Number(e.target.value))} />
          </label>
          <label>
            Fejl pr. sejr <input type="number" min={0} max={9} value={mistakes} onChange={(e) => setMistakes(Number(e.target.value))} />
          </label>
          <div className="devpanel-row">
            <button disabled={busy} onClick={() => simulateDays(true)}>Vind låger</button>
            <button disabled={busy} onClick={() => simulateDays(false)}>Tab låger</button>
            <button disabled={busy} onClick={() => finale(false)}>Tab finalerunde</button>
            <button disabled={busy} onClick={() => finale(true)}>Vind finale</button>
          </div>
          <hr />
          <div className="devpanel-row">
            <button
              onClick={() => {
                capabilityOverrides.forceNoWebGL = !capabilityOverrides.forceNoWebGL;
                app.notify(`WebGL ${capabilityOverrides.forceNoWebGL ? 'slået fra' : 'tilladt'} – skift skærm for at se effekten`);
              }}
            >
              Tving 2D: {capabilityOverrides.forceNoWebGL ? 'til' : 'fra'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
