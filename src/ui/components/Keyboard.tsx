import { memo } from 'react';

/** Dansk QWERTY-layout som på tablets: Å efter P, Æ og Ø efter L. */
export const KEYBOARD_ROWS: readonly (readonly string[])[] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Å'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Æ', 'Ø'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

/** Stort dansk skærmtastatur (QWERTY). Brugte bogstaver kan trykkes igen uden effekt. */
export const Keyboard = memo(function Keyboard({
  guessed,
  word,
  onLetter,
  disabled,
}: {
  guessed: readonly string[];
  word: string;
  onLetter: (l: string) => void;
  disabled?: boolean;
}) {
  const used = new Set(guessed);
  return (
    <div className="keyboard" role="group" aria-label="Bogstaver">
      {KEYBOARD_ROWS.map((row, ri) => (
        <div key={ri} className={`keyboard-row keyboard-row--${ri}`}>
          {row.map((l) => {
            const isUsed = used.has(l);
            const correct = isUsed && word.includes(l);
            const state = !isUsed ? 'fresh' : correct ? 'correct' : 'wrong';
            return (
              <button
                key={l}
                type="button"
                className={`key key--${state}`}
                onClick={() => onLetter(l)}
                aria-disabled={isUsed || disabled ? true : undefined}
                aria-label={isUsed ? `${l}, ${correct ? 'findes i ordet' : 'findes ikke i ordet'}` : l}
              >
                <span className="key-letter">{l}</span>
                {state === 'correct' && <span className="key-mark" aria-hidden="true">✓</span>}
                {state === 'wrong' && <span className="key-mark" aria-hidden="true">✕</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
});
