import type { LocalDate } from '../domain/calendar';

export const CALENDAR_TIME_ZONE = 'Europe/Copenhagen';

/**
 * Central, injicerbar datotjeneste. Al kode der har brug for "nu" skal gå gennem denne.
 * Kalenderdatoen udregnes altid i Europe/Copenhagen uanset enhedens tidszone.
 */
export interface DateService {
  /** Nuværende øjeblik. */
  now(): Date;
  /** Dagens dato i Europe/Copenhagen. */
  today(): LocalDate;
  /** ISO-tidsstempel til gemte data. */
  nowIso(): string;
}

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CALENDAR_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function toCopenhagenDate(instant: Date): LocalDate {
  const parts = formatter.formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export class SystemDateService implements DateService {
  now(): Date {
    return new Date();
  }
  today(): LocalDate {
    return toCopenhagenDate(this.now());
  }
  nowIso(): string {
    return this.now().toISOString();
  }
}

/**
 * Datotjeneste med justerbar tid – bruges i tests og i udviklerværktøjet.
 * offsetMs lægges til systemtiden, eller fixed bruges som fast tidspunkt.
 */
export class AdjustableDateService implements DateService {
  private fixed: Date | null;
  private offsetMs = 0;

  constructor(initial?: Date) {
    this.fixed = initial ? new Date(initial) : null;
  }

  setFixed(d: Date | null): void {
    this.fixed = d ? new Date(d) : null;
    this.offsetMs = 0;
  }

  /** Sætter "nu" til et bestemt tidspunkt, men lader uret løbe videre derfra. */
  setRunningFrom(d: Date): void {
    this.fixed = null;
    this.offsetMs = d.getTime() - Date.now();
  }

  advance(ms: number): void {
    if (this.fixed) this.fixed = new Date(this.fixed.getTime() + ms);
    else this.offsetMs += ms;
  }

  now(): Date {
    return this.fixed ? new Date(this.fixed) : new Date(Date.now() + this.offsetMs);
  }
  today(): LocalDate {
    return toCopenhagenDate(this.now());
  }
  nowIso(): string {
    return this.now().toISOString();
  }
}

/** Hjælper: et tidspunkt givet som lokal tid i København (tager højde for sommer-/vintertid). */
export function copenhagenInstant(year: number, month: number, day: number, hour = 12, minute = 0): Date {
  // Gæt UTC og korrigér med den faktiske forskydning.
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: CALENDAR_TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const p = fmt.formatToParts(new Date(guess));
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  const asLocal = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'));
  return new Date(guess - (asLocal - guess));
}
