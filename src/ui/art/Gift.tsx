const PALETTE: [string, string][] = [
  ['#d33a45', '#f3d27a'],
  ['#2f7d55', '#f6efe3'],
  ['#3a6cc8', '#ffd27a'],
  ['#c9a227', '#c8283c'],
  ['#8a4fb8', '#f6efe3'],
  ['#e0773a', '#2f7d55'],
];

/** En lille gave-SVG. variant="freeplay" giver sølv/prikket papir, så den ikke ligner kalendergaver. */
export function Gift({
  index = 0,
  size = 36,
  variant = 'calendar',
}: {
  index?: number;
  size?: number;
  variant?: 'calendar' | 'freeplay';
}) {
  const [paper, ribbon] = variant === 'freeplay' ? ['#c9d6e6', '#7b92b2'] : PALETTE[index % PALETTE.length];
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" className="gift-svg">
      <rect x="5" y="15" width="30" height="21" rx="3" fill={paper} />
      <rect x="3" y="10" width="34" height="8" rx="2.5" fill={paper} filter="brightness(1.08)" />
      {variant === 'freeplay' && (
        <g fill="#fff" opacity="0.8">
          <circle cx="11" cy="24" r="1.6" />
          <circle cx="28" cy="29" r="1.6" />
          <circle cx="13" cy="32" r="1.6" />
          <circle cx="29" cy="20" r="1.6" />
        </g>
      )}
      <rect x="17.5" y="10" width="5" height="26" fill={ribbon} />
      <rect x="3" y="12.5" width="34" height="3.5" fill={ribbon} opacity="0.9" />
      <path d="M20 10 Q12 2 9 6 Q8 10 20 10 Q28 2 31 6 Q32 10 20 10 Z" fill={ribbon} />
      <rect x="5" y="30" width="30" height="6" rx="3" fill="#000" opacity="0.08" />
    </svg>
  );
}
