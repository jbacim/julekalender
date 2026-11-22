import { Gift } from '../art/Gift';

/** Dagens 10 gaver. Stjålne gaver er "hos nissen" – vist som et let aftryk, ikke en fejlmarkør. */
export function GiftRow({ remaining, total = 10, variant }: { remaining: number; total?: number; variant: 'calendar' | 'freeplay' }) {
  return (
    <div className="gift-row-wrap">
      <ul className={`gift-row gift-row--${variant}`} aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <li key={i} className={`gift-slot${i < remaining ? '' : ' gift-slot--taken'}`}>
            <Gift index={i} size={30} variant={variant} />
          </li>
        ))}
      </ul>
      <p className="gift-row-text" aria-live="polite">
        {variant === 'freeplay' ? (
          <>
            <strong>{remaining}</strong> af {total} legegaver tilbage
          </>
        ) : (
          <>
            <strong>{remaining}</strong> af {total} gaver tilbage i dag
          </>
        )}
      </p>
    </div>
  );
}
