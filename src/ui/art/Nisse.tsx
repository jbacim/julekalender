export type NisseMood = 'idle' | 'grab' | 'oops' | 'cheer' | 'sad' | 'sneaky';

/**
 * Den drilske nisse som SVG. Stemningen styres af en CSS-klasse; animationer er korte
 * og blokerer aldrig input (de er rent visuelle og nulstilles ved næste hændelse).
 */
export function Nisse({ mood, size = 120, sackFill = 0 }: { mood: NisseMood; size?: number; sackFill?: number }) {
  const mouth =
    mood === 'oops' || mood === 'sad'
      ? 'M44 66 Q50 61 56 66'
      : mood === 'grab' || mood === 'sneaky'
        ? 'M43 63 Q50 70 58 62'
        : 'M43 63 Q50 72 57 63';
  const sackScale = 0.75 + Math.min(1, sackFill / 10) * 0.45;
  return (
    <svg className={`nisse nisse--${mood}`} viewBox="0 0 120 130" width={size} height={size * 1.08} aria-hidden="true">
      <ellipse cx="60" cy="124" rx="40" ry="5" fill="rgba(0,0,0,0.15)" />
      {/* Sæk */}
      <g className="nisse-sack" style={{ transform: `scale(${sackScale})`, transformOrigin: '96px 118px' }}>
        <path d="M80 118 Q76 92 90 86 L104 86 Q118 94 112 118 Z" fill="#a77a4a" />
        <path d="M88 86 Q97 80 106 86" stroke="#7b5530" strokeWidth="3" fill="none" />
        <path d="M86 102 Q96 106 108 100" stroke="#8c6238" strokeWidth="2" fill="none" opacity="0.6" />
      </g>
      <g className="nisse-body">
        {/* Ben og krop */}
        <rect x="44" y="104" width="10" height="16" rx="3" fill="#3b4a6b" />
        <rect x="58" y="104" width="10" height="16" rx="3" fill="#3b4a6b" />
        <ellipse cx="48" cy="121" rx="8" ry="4" fill="#3a2a22" />
        <ellipse cx="64" cy="121" rx="8" ry="4" fill="#3a2a22" />
        <path d="M36 108 Q34 78 56 74 Q78 78 76 108 Z" fill="#9aa6bd" />
        <rect x="36" y="96" width="40" height="5" fill="#5a4630" />
        {/* Arme */}
        <g className="nisse-arm-left">
          <path d="M40 84 Q26 92 28 102" stroke="#9aa6bd" strokeWidth="8" strokeLinecap="round" fill="none" />
          <circle cx="28" cy="103" r="5" fill="#f3c6a5" />
        </g>
        <g className="nisse-arm-right">
          <path d="M72 84 Q86 90 88 98" stroke="#9aa6bd" strokeWidth="8" strokeLinecap="round" fill="none" />
          <circle cx="88" cy="99" r="5" fill="#f3c6a5" />
        </g>
        {/* Hoved */}
        <g className="nisse-head">
          <circle cx="56" cy="56" r="17" fill="#f3c6a5" />
          <path d="M38 60 Q40 84 56 86 Q72 84 74 60 Q66 70 56 70 Q46 70 38 60 Z" fill="#fbfbfb" />
          <circle cx="42" cy="60" r="4" fill="#ff9b9b" opacity="0.6" />
          <circle cx="70" cy="60" r="4" fill="#ff9b9b" opacity="0.6" />
          <ellipse cx="56" cy="60" rx="4.5" ry="3.8" fill="#e98b7a" />
          <g className="nisse-eyes" fill="#2a1d18">
            {mood === 'cheer' ? (
              <>
                <path d="M45 52 Q49 48 52 52" stroke="#2a1d18" strokeWidth="2" fill="none" />
                <path d="M60 52 Q63 48 67 52" stroke="#2a1d18" strokeWidth="2" fill="none" />
              </>
            ) : mood === 'oops' ? (
              <>
                <circle cx="49" cy="52" r="3.4" />
                <circle cx="63" cy="52" r="3.4" />
              </>
            ) : (
              <>
                <ellipse cx="49" cy="52" rx="2.4" ry={mood === 'sneaky' ? 1.4 : 2.8} />
                <ellipse cx="63" cy="52" rx="2.4" ry={mood === 'sneaky' ? 1.4 : 2.8} />
              </>
            )}
          </g>
          <path d={mouth} stroke="#8a4a3a" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Hue */}
          <path className="nisse-hat" d="M36 48 Q40 14 70 10 Q90 12 96 30 Q80 22 74 30 Q78 40 76 48 Z" fill="#d52b3a" />
          <rect x="34" y="42" width="44" height="9" rx="4.5" fill="#f6f2ea" />
          <circle className="nisse-pompom" cx="97" cy="32" r="6" fill="#f6f2ea" />
        </g>
      </g>
    </svg>
  );
}
