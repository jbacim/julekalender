import { maskWord } from '../../domain/round';
import type { Round } from '../../domain/types';

/** Én tydelig plads pr. bogstav. Mellemrum og bindestreg vises automatisk. */
export function WordSlots({ round, revealAll }: { round: Round; revealAll: boolean }) {
  const mask = maskWord(round, revealAll);
  // Del op i ord, så lange udtryk kan ombrydes pænt på små skærme.
  const groups: { chars: typeof mask; sep?: string }[] = [{ chars: [] }];
  for (const m of mask) {
    if (m.auto) {
      groups[groups.length - 1].sep = m.char;
      groups.push({ chars: [] });
    } else groups[groups.length - 1].chars.push(m);
  }
  const longest = Math.max(...groups.map((g) => g.chars.length));
  const total = mask.filter((m) => !m.auto).length;
  const found = mask.filter((m) => !m.auto && m.revealed && !revealAll).length;
  const spoken = revealAll
    ? `Ordet var ${round.word.display}`
    : `Ordet har ${total} bogstaver. ${mask.map((m) => (m.auto ? (m.char === ' ' ? 'mellemrum' : 'bindestreg') : m.revealed ? m.char : 'tom')).join(', ')}`;
  return (
    <div className="word" style={{ ['--longest' as string]: longest }}>
      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
      <div className="word-groups" aria-hidden="true">
        {groups.map((g, gi) => (
          <span key={gi} className="word-group">
            {g.chars.map((m, i) => (
              <span
                key={i}
                className={`slot${m.revealed ? ' slot--revealed' : ''}${revealAll && !round.guessed.includes(m.char) ? ' slot--shown' : ''}`}
              >
                {m.revealed ? m.char : ''}
              </span>
            ))}
            {g.sep === '-' && <span className="slot-sep">-</span>}
          </span>
        ))}
      </div>
      <span className="sr-only">{found > 0 ? `${found} bogstaver fundet` : ''}</span>
    </div>
  );
}
