import type { DoorStatus } from '../../domain/progress';
import { IconCheck, IconDots, IconLock, IconRetry, IconStar } from '../art/Icons';

const STATUS_TEXT: Record<DoorStatus, string> = {
  locked: 'låst',
  available: 'klar til at åbne',
  inProgress: 'i gang',
  won: 'vundet',
  lost: 'nissen vandt – prøv igen',
  missed: 'ikke åbnet',
};

/** Fast, hyggelig rækkefølge af lågerne – som en rigtig julekalender. */
const DOOR_ORDER = [7, 15, 2, 21, 11, 18, 4, 23, 9, 13, 1, 20, 16, 6, 24, 12, 3, 19, 10, 22, 5, 14, 17, 8];

/** Lågefarver/motiver: farve er pynt, ikke information (status har ikon og tekst). */
const DOOR_STYLE = ['red', 'green', 'cream', 'blue', 'gold', 'red', 'cream', 'green'];

export function CalendarBoard({
  statuses,
  today,
  onOpen,
  caption,
}: {
  statuses: Record<number, DoorStatus>;
  today: number | null;
  onOpen: (day: number) => void;
  caption: string;
}) {
  return (
    <section className="calendar" aria-labelledby="calendar-title">
      <div className="calendar-frame">
        <div className="calendar-roof" aria-hidden="true" />
        <h2 id="calendar-title" className="calendar-title">
          {caption}
        </h2>
        <ol className="calendar-grid">
          {DOOR_ORDER.map((day, i) => {
            const status = statuses[day] ?? 'locked';
            const isToday = today === day;
            const big = day === 24;
            return (
              <li key={day} className={`door-cell${big ? ' door-cell--big' : ''}`}>
                <button
                  type="button"
                  className={`door door--${status} door--${DOOR_STYLE[i % DOOR_STYLE.length]}${isToday ? ' door--today' : ''}`}
                  onClick={() => onOpen(day)}
                  aria-label={`Låge ${day}${isToday ? ', i dag' : ''}: ${STATUS_TEXT[status]}`}
                  aria-disabled={status === 'locked' ? true : undefined}
                  data-day={day}
                >
                  <span className="door-inner" aria-hidden="true">
                    {(status === 'won' || status === 'lost') && <span className="door-open-bg" />}
                    <span className="door-leaf">
                      <span className="door-num">{day}</span>
                      {big && <span className="door-star"><IconStar size={22} /></span>}
                    </span>
                    <span className="door-badge">
                      {status === 'locked' && <IconLock />}
                      {status === 'won' && <IconCheck />}
                      {status === 'lost' && <IconRetry />}
                      {status === 'inProgress' && <IconDots />}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
