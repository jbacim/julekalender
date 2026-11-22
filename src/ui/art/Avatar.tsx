import type { AvatarId } from '../../domain/types';

export const AVATARS: { id: AvatarId; label: string }[] = [
  { id: 'ræv', label: 'Ræv' },
  { id: 'bjørn', label: 'Bjørn' },
  { id: 'ugle', label: 'Ugle' },
  { id: 'pingvin', label: 'Pingvin' },
  { id: 'rensdyr', label: 'Rensdyr' },
  { id: 'kanin', label: 'Kanin' },
  { id: 'kat', label: 'Kat' },
  { id: 'snemand', label: 'Snemand' },
];

const BG: Record<AvatarId, string> = {
  ræv: '#ffe2c4',
  bjørn: '#f1dcc4',
  ugle: '#e6ddf5',
  pingvin: '#d7ecfa',
  rensdyr: '#f5e3d0',
  kanin: '#fbe0ea',
  kat: '#e8f1d8',
  snemand: '#dcecff',
};

function Eyes({ y = 54, dx = 11, r = 4 }: { y?: number; dx?: number; r?: number }) {
  return (
    <g fill="#2a1d18">
      <circle cx={50 - dx} cy={y} r={r} />
      <circle cx={50 + dx} cy={y} r={r} />
      <circle cx={50 - dx + 1.3} cy={y - 1.3} r={1.2} fill="#fff" />
      <circle cx={50 + dx + 1.3} cy={y - 1.3} r={1.2} fill="#fff" />
    </g>
  );
}

function Cheeks({ y = 64 }: { y?: number }) {
  return (
    <g fill="#ff8a8a" opacity="0.45">
      <ellipse cx="32" cy={y} rx="6" ry="3.5" />
      <ellipse cx="68" cy={y} rx="6" ry="3.5" />
    </g>
  );
}

function Face({ id }: { id: AvatarId }) {
  switch (id) {
    case 'ræv':
      return (
        <g>
          <path d="M22 30 L34 52 L20 54 Z M78 30 L66 52 L80 54 Z" fill="#e8742a" />
          <path d="M20 50 Q50 20 80 50 Q78 78 50 86 Q22 78 20 50 Z" fill="#f08a3c" />
          <path d="M30 60 Q50 92 70 60 Q60 80 50 82 Q40 80 30 60 Z" fill="#fff6ec" />
          <Eyes y={56} />
          <ellipse cx="50" cy="70" rx="4.5" ry="3.5" fill="#2a1d18" />
        </g>
      );
    case 'bjørn':
      return (
        <g>
          <circle cx="27" cy="30" r="11" fill="#8a5a3a" />
          <circle cx="73" cy="30" r="11" fill="#8a5a3a" />
          <circle cx="27" cy="30" r="5.5" fill="#d9a77c" />
          <circle cx="73" cy="30" r="5.5" fill="#d9a77c" />
          <circle cx="50" cy="56" r="32" fill="#9b6845" />
          <ellipse cx="50" cy="68" rx="14" ry="11" fill="#e3bd96" />
          <Eyes y={52} />
          <ellipse cx="50" cy="64" rx="5" ry="3.8" fill="#2a1d18" />
          <Cheeks y={66} />
        </g>
      );
    case 'ugle':
      return (
        <g>
          <path d="M20 26 L34 40 L22 46 Z M80 26 L66 40 L78 46 Z" fill="#7b5ea7" />
          <ellipse cx="50" cy="58" rx="31" ry="30" fill="#8f72bb" />
          <circle cx="38" cy="52" r="12" fill="#fff" />
          <circle cx="62" cy="52" r="12" fill="#fff" />
          <Eyes y={52} dx={12} r={5.5} />
          <path d="M45 62 L55 62 L50 71 Z" fill="#f2a93b" />
          <path d="M36 78 Q50 86 64 78" stroke="#c9b6e6" strokeWidth="3" fill="none" />
        </g>
      );
    case 'pingvin':
      return (
        <g>
          <ellipse cx="50" cy="56" rx="31" ry="32" fill="#25303d" />
          <path d="M30 56 Q30 34 50 40 Q70 34 70 56 Q70 82 50 84 Q30 82 30 56 Z" fill="#fff" />
          <Eyes y={54} dx={10} />
          <path d="M43 63 L57 63 L50 71 Z" fill="#f4a62a" />
          <Cheeks y={66} />
        </g>
      );
    case 'rensdyr':
      return (
        <g>
          <path d="M30 34 L24 14 M24 22 L16 18 M27 26 L19 28 M70 34 L76 14 M76 22 L84 18 M73 26 L81 28" stroke="#7a4f2e" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="22" cy="44" rx="9" ry="5" fill="#a66d45" transform="rotate(-25 22 44)" />
          <ellipse cx="78" cy="44" rx="9" ry="5" fill="#a66d45" transform="rotate(25 78 44)" />
          <ellipse cx="50" cy="56" rx="26" ry="30" fill="#b07a4f" />
          <ellipse cx="50" cy="72" rx="15" ry="11" fill="#e2c3a0" />
          <Eyes y={52} dx={10} />
          <circle cx="50" cy="68" r="6.5" fill="#e3343f" />
          <circle cx="48" cy="66" r="2" fill="#ff9aa0" />
        </g>
      );
    case 'kanin':
      return (
        <g>
          <ellipse cx="38" cy="22" rx="8" ry="20" fill="#f4f0ee" />
          <ellipse cx="62" cy="22" rx="8" ry="20" fill="#f4f0ee" />
          <ellipse cx="38" cy="24" rx="4" ry="14" fill="#f7b8c8" />
          <ellipse cx="62" cy="24" rx="4" ry="14" fill="#f7b8c8" />
          <circle cx="50" cy="60" r="28" fill="#f8f5f3" />
          <Eyes y={56} dx={10} />
          <path d="M46 66 L54 66 L50 70 Z" fill="#f08aa4" />
          <path d="M50 70 Q46 76 42 73 M50 70 Q54 76 58 73" stroke="#a8828a" strokeWidth="1.8" fill="none" />
          <Cheeks y={68} />
        </g>
      );
    case 'kat':
      return (
        <g>
          <path d="M22 24 L38 38 L22 50 Z M78 24 L62 38 L78 50 Z" fill="#7a8f5a" />
          <circle cx="50" cy="58" r="30" fill="#8ea56a" />
          <ellipse cx="50" cy="70" rx="13" ry="9" fill="#f2f0e6" />
          <path d="M38 52 Q38 46 44 50 M56 50 Q62 46 62 52" stroke="none" fill="none" />
          <Eyes y={54} dx={11} />
          <path d="M46 64 L54 64 L50 68 Z" fill="#e88a9a" />
          <path d="M28 66 L14 63 M28 70 L14 72 M72 66 L86 63 M72 70 L86 72" stroke="#5b6a44" strokeWidth="1.6" />
        </g>
      );
    case 'snemand':
      return (
        <g>
          <circle cx="50" cy="60" r="28" fill="#fdfeff" stroke="#c9dcf0" strokeWidth="2" />
          <rect x="30" y="18" width="40" height="8" rx="3" fill="#2b2b38" />
          <rect x="36" y="2" width="28" height="20" rx="3" fill="#2b2b38" />
          <rect x="36" y="15" width="28" height="4" fill="#c8283c" />
          <Eyes y={54} dx={10} />
          <path d="M50 60 L68 64 L50 66 Z" fill="#f08a24" />
          <g fill="#2a1d18">
            <circle cx="40" cy="74" r="2" />
            <circle cx="46" cy="77" r="2" />
            <circle cx="54" cy="77" r="2" />
            <circle cx="60" cy="74" r="2" />
          </g>
        </g>
      );
  }
}

export function Avatar({ id, size = 56, title }: { id: AvatarId; size?: number; title?: string }) {
  return (
    <svg
      className="avatar"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx="50" cy="50" r="50" fill={BG[id] ?? '#eee'} />
      <Face id={id} />
    </svg>
  );
}
