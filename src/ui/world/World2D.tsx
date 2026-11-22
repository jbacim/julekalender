import type { ReactNode } from 'react';
import type { RewardDefinition } from '../../domain/types';
import { treeOrnament2D } from '../../content/rewards';

function Ornament({ r }: { r: RewardDefinition }): ReactNode {
  const [x, y] = treeOrnament2D(r);
  const [c1, c2] = r.colors;
  switch (r.visual) {
    case 'ball':
      return (
        <g>
          <line x1={x} y1={y - 12} x2={x} y2={y - 7} stroke="#d9c37a" />
          <circle cx={x} cy={y} r="7" fill={c1} />
          <circle cx={x - 2.4} cy={y - 2.4} r="2" fill="#fff" opacity="0.7" />
        </g>
      );
    case 'candyCane':
      return <path d={`M${x + 4} ${y + 10} L${x + 4} ${y - 4} Q${x + 4} ${y - 10} ${x - 1} ${y - 10} Q${x - 6} ${y - 10} ${x - 6} ${y - 5}`} stroke={c2} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="3 3" />;
    case 'heart':
      return <path d={`M${x} ${y + 8} L${x - 8} ${y - 1} Q${x - 8} ${y - 8} ${x - 3} ${y - 8} Q${x} ${y - 8} ${x} ${y - 4} Q${x} ${y - 8} ${x + 3} ${y - 8} Q${x + 8} ${y - 8} ${x + 8} ${y - 1} Z`} fill={c1} stroke={c2} strokeWidth="1.2" />;
    case 'pinecone':
      return (
        <g>
          <ellipse cx={x} cy={y} rx="5" ry="8" fill={c1} />
          <path d={`M${x - 4} ${y - 3} h8 M${x - 5} ${y + 1} h10 M${x - 4} ${y + 5} h8`} stroke="#5d3a1e" strokeWidth="1" />
          <ellipse cx={x} cy={y - 7} rx="3" ry="1.6" fill={c2} />
        </g>
      );
    case 'bell':
      return (
        <g>
          <path d={`M${x - 7} ${y + 6} Q${x - 6} ${y - 8} ${x} ${y - 8} Q${x + 6} ${y - 8} ${x + 7} ${y + 6} Z`} fill={c1} />
          <circle cx={x} cy={y + 7} r="2.4" fill={c2} />
        </g>
      );
    case 'icicle':
      return <path d={`M${x - 3} ${y - 8} L${x + 3} ${y - 8} L${x} ${y + 10} Z`} fill={c1} stroke={c2} strokeWidth="0.8" />;
    case 'drum':
      return (
        <g>
          <rect x={x - 7} y={y - 5} width="14" height="11" fill={c1} />
          <ellipse cx={x} cy={y - 5} rx="7" ry="2.4" fill="#f6efe3" />
          <path d={`M${x - 7} ${y - 3} L${x} ${y + 5} L${x + 7} ${y - 3}`} stroke={c2} strokeWidth="1.2" fill="none" />
        </g>
      );
    case 'gingerbread':
      return (
        <g fill={c1}>
          <circle cx={x} cy={y - 6} r="4" />
          <path d={`M${x - 8} ${y - 1} h16 v3 h-5 l3 8 h-4 l-2 -5 l-2 5 h-4 l3 -8 h-5 Z`} />
          <circle cx={x} cy={y + 1} r="0.9" fill={c2} />
        </g>
      );
    case 'bird':
      return (
        <g>
          <ellipse cx={x} cy={y} rx="8" ry="5.5" fill={c1} />
          <circle cx={x + 6} cy={y - 3} r="4" fill={c1} />
          <ellipse cx={x + 3} cy={y + 1} rx="4" ry="3" fill={c2} />
          <path d={`M${x + 10} ${y - 3} l3 1 l-3 1 Z`} fill="#e8a33a" />
          <circle cx={x + 7} cy={y - 4} r="0.9" fill="#111" />
        </g>
      );
    case 'snowflake':
      return (
        <g stroke={c2} strokeWidth="1.8" strokeLinecap="round">
          <path d={`M${x} ${y - 8} V${y + 8} M${x - 7} ${y - 4} L${x + 7} ${y + 4} M${x - 7} ${y + 4} L${x + 7} ${y - 4}`} />
        </g>
      );
    case 'angel':
      return (
        <g>
          <path d={`M${x - 9} ${y - 4} Q${x - 4} ${y - 9} ${x} ${y - 3} Q${x + 4} ${y - 9} ${x + 9} ${y - 4} Q${x + 4} ${y + 1} ${x} ${y} Q${x - 4} ${y + 1} ${x - 9} ${y - 4} Z`} fill={c2} />
          <path d={`M${x - 5} ${y + 9} L${x} ${y - 4} L${x + 5} ${y + 9} Z`} fill={c1} />
          <circle cx={x} cy={y - 5} r="3" fill="#f3c6a5" />
          <ellipse cx={x} cy={y - 9.5} rx="3.4" ry="1" fill="none" stroke={c2} />
        </g>
      );
    case 'cone':
      return (
        <g>
          <path d={`M${x - 6} ${y - 6} L${x + 6} ${y - 6} L${x} ${y + 9} Z`} fill={c1} />
          <path d={`M${x - 6} ${y - 6} Q${x} ${y - 14} ${x + 6} ${y - 6}`} stroke={c2} strokeWidth="1.4" fill="none" />
        </g>
      );
    case 'star':
      return (
        <g className="w2d-star">
          <circle cx="200" cy="38" r="22" fill="#ffe680" opacity="0.35" />
          <path d="M200 20 L205 32 L218 33 L208 41 L211 54 L200 47 L189 54 L192 41 L182 33 L195 32 Z" fill={c1} stroke="#c99a12" strokeWidth="1.2" />
        </g>
      );
    default:
      return null;
  }
}

function WorldItem({ r }: { r: RewardDefinition }): ReactNode {
  const [x, y] = r.position2D;
  const [c1, c2] = r.colors;
  switch (r.visual) {
    case 'lantern':
      return (
        <g>
          <circle cx={x} cy={y - 8} r="14" fill="#ffd27a" opacity="0.25" />
          <rect x={x - 6} y={y - 16} width="12" height="16" rx="2" fill={c2} stroke={c1} strokeWidth="2" />
          <path d={`M${x - 4} ${y - 20} Q${x} ${y - 26} ${x + 4} ${y - 20}`} stroke={c1} strokeWidth="2" fill="none" />
        </g>
      );
    case 'snowman':
      return (
        <g>
          <circle cx={x} cy={y} r="14" fill={c1} stroke="#cfe0f2" />
          <circle cx={x} cy={y - 20} r="10" fill={c1} stroke="#cfe0f2" />
          <path d={`M${x} ${y - 20} l9 2 l-9 2 Z`} fill={c2} />
          <circle cx={x - 3} cy={y - 23} r="1.3" fill="#222" />
          <circle cx={x + 3} cy={y - 23} r="1.3" fill="#222" />
          <rect x={x - 9} y={y - 32} width="18" height="3" fill="#2b2b38" />
          <rect x={x - 6} y={y - 42} width="12" height="10" fill="#2b2b38" />
          <path d={`M${x - 10} ${y - 12} h20`} stroke="#c8283c" strokeWidth="3" />
        </g>
      );
    case 'sled':
      return (
        <g>
          <rect x={x - 16} y={y - 12} width="30" height="9" rx="3" fill={c1} />
          <path d={`M${x - 20} ${y} H${x + 14} Q${x + 20} ${y} ${x + 18} ${y - 6}`} stroke={c2} strokeWidth="2.5" fill="none" />
          <path d={`M${x - 10} ${y - 3} v3 M${x + 6} ${y - 3} v3`} stroke={c2} strokeWidth="2" />
        </g>
      );
    case 'wreath':
      return (
        <g>
          <circle cx={x} cy={y} r="7" fill="none" stroke={c1} strokeWidth="4" />
          <path d={`M${x - 3} ${y + 6} l3 -2 l3 2 l-3 2 Z`} fill={c2} />
        </g>
      );
    case 'reindeer':
      return (
        <g>
          <ellipse cx={x} cy={y} rx="16" ry="8" fill={c1} />
          <path d={`M${x - 10} ${y + 5} v12 M${x - 4} ${y + 5} v12 M${x + 6} ${y + 5} v12 M${x + 12} ${y + 5} v12`} stroke={c1} strokeWidth="3" />
          <path d={`M${x + 12} ${y - 4} L${x + 18} ${y - 16}`} stroke={c1} strokeWidth="6" strokeLinecap="round" />
          <ellipse cx={x + 21} cy={y - 18} rx="6" ry="4.5" fill={c1} />
          <circle cx={x + 26} cy={y - 18} r="2" fill="#e3343f" />
          <path d={`M${x + 18} ${y - 22} l-3 -8 l-3 2 M${x + 20} ${y - 22} l3 -8 l3 2`} stroke="#6b4428" strokeWidth="1.6" fill="none" />
          <ellipse cx={x - 2} cy={y - 2} rx="6" ry="3" fill={c2} opacity="0.5" />
        </g>
      );
    case 'birdFeeder':
      return (
        <g>
          <rect x={x - 1.5} y={y - 4} width="3" height="30" fill={c1} />
          <rect x={x - 12} y={y - 6} width="24" height="4" fill={c1} />
          <path d={`M${x - 14} ${y - 12} L${x} ${y - 22} L${x + 14} ${y - 12} Z`} fill="#7c4f2c" />
          <path d={`M${x - 14} ${y - 12} L${x} ${y - 22} L${x + 14} ${y - 12}`} stroke={c2} strokeWidth="2.5" fill="none" />
        </g>
      );
    case 'porridge':
      return (
        <g>
          <path d={`M${x - 9} ${y - 4} h18 q-2 9 -9 9 q-7 0 -9 -9 Z`} fill={c1} />
          <ellipse cx={x} cy={y - 4} rx="9" ry="2.6" fill={c2} />
          <circle cx={x} cy={y - 4.5} r="1.6" fill="#f6c84a" />
        </g>
      );
    case 'lampPost':
      return (
        <g>
          <circle cx={x} cy={y - 46} r="16" fill="#ffd68a" opacity="0.25" />
          <rect x={x - 2} y={y - 42} width="4" height="42" fill={c1} />
          <path d={`M${x - 6} ${y - 40} h12 l-2 -10 h-8 Z`} fill={c2} stroke={c1} strokeWidth="1.5" />
        </g>
      );
    default:
      return null;
  }
}

function GiftPile({ gifts }: { gifts: number }) {
  // Visuel bunke: antallet af kasser vokser med gaverne, men er ikke til at tælle.
  const boxes = gifts <= 0 ? 0 : Math.min(26, 2 + Math.round(gifts / 10));
  const cols = ['#d33a45', '#2f7d55', '#3a6cc8', '#c9a227', '#8a4fb8', '#e0773a'];
  const items = [];
  for (let i = 0; i < boxes; i++) {
    const row = Math.floor(i / 7);
    const col = i % 7;
    const w = 14 + ((i * 7) % 9);
    const x = 222 + col * 15 + (row % 2) * 7 - row * 3;
    const y = 262 - row * 12 - (w - 14) * 0.6;
    const c = cols[i % cols.length];
    items.push(
      <g key={i}>
        <rect x={x} y={y - w * 0.7} width={w} height={w * 0.7} rx="2" fill={c} />
        <rect x={x + w / 2 - 1.5} y={y - w * 0.7} width="3" height={w * 0.7} fill="#f3d27a" />
      </g>,
    );
  }
  return <g>{items}</g>;
}

/**
 * Statisk 2D-version af juleverdenen – bruges uden WebGL, ved tabt grafikkontekst
 * og mens 3D-delen indlæses. Viser de faktisk optjente dekorationer.
 */
export function World2D({
  rewards,
  gifts,
  lit = false,
  label,
  santa = false,
}: {
  rewards: RewardDefinition[];
  gifts: number;
  lit?: boolean;
  label: string;
  /** Den 24. december: julemandens kane flyver forbi månen. */
  santa?: boolean;
}) {
  const tree = rewards.filter((r) => r.placement === 'tree' && r.visual !== 'flagGarland' && r.visual !== 'lightString');
  const world = rewards.filter((r) => r.placement === 'world');
  const hasFlags = rewards.some((r) => r.visual === 'flagGarland');
  const hasLights = rewards.some((r) => r.visual === 'lightString');
  return (
    <svg className={`world2d${lit ? ' world2d--lit' : ''}`} viewBox="0 0 400 300" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="w2d-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2550" />
          <stop offset="1" stopColor="#4a5a9a" />
        </linearGradient>
        <radialGradient id="w2d-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#w2d-sky)" />
      <circle cx="340" cy="46" r="16" fill="#fff6d8" />
      <circle cx="346" cy="42" r="14" fill="#2a3566" opacity="0.25" />
      {[30, 80, 130, 260, 300, 370, 60, 230].map((x, i) => (
        <circle key={i} cx={x} cy={20 + ((i * 37) % 80)} r={i % 3 === 0 ? 1.6 : 1} fill="#fff" opacity="0.8" />
      ))}
      {santa && (
        <g className="w2d-santa" fill="#141b3d">
          {/* Silhuet af kane og rensdyr foran månen */}
          <path d="M300 58 h22 q6 0 6 -6 v-6 h-6 v4 h-20 l-4 -6 h-4 l2 10 Z" />
          <path d="M296 62 h34" stroke="#141b3d" strokeWidth="1.5" />
          <circle cx="316" cy="40" r="4" />
          {[338, 352, 366].map((x, i) => (
            <g key={i}>
              <path d={`M${x} 50 q5 -5 10 0 l2 -6 l2 1 l-2 7 l-2 4 l-1 5 h-1.5 l-0.5 -4 h-5 l-1 4 h-1.5 l0.5 -5 Z`} />
              <path d={`M${x + 11} 44 l2 -4 m-2 4 l-2 -4`} stroke="#141b3d" strokeWidth="1" />
            </g>
          ))}
          <circle cx="381" cy="44" r="1.6" fill="#ff4040" />
          <path d="M328 53 L338 52" stroke="#141b3d" strokeWidth="0.8" />
        </g>
      )}
      <path d="M0 230 Q100 205 200 222 T400 214 V300 H0 Z" fill="#eef5ff" />
      <path d="M0 252 Q120 238 220 250 T400 246 V300 H0 Z" fill="#ffffff" />
      {/* Hytte */}
      <g>
        <rect x="40" y="186" width="70" height="46" fill="#8b5a35" />
        <path d="M32 190 L75 152 L118 190 Z" fill="#6b3f26" />
        <path d="M30 192 L75 150 L120 192" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" />
        <rect x="64" y="204" width="20" height="28" fill="#5a341e" />
        <rect x="88" y="198" width="14" height="13" fill="#ffd27a" />
        <circle cx="95" cy="204" r="14" fill="url(#w2d-glow)" />
        <rect x="92" y="160" width="9" height="18" fill="#7b4a2c" />
      </g>
      {/* Træ */}
      {lit && <circle cx="200" cy="150" r="120" fill="url(#w2d-glow)" />}
      <rect x="192" y="232" width="16" height="16" fill="#6b4226" />
      <path d="M200 50 L262 140 L238 140 L284 200 L254 200 L298 240 L102 240 L146 200 L116 200 L162 140 L138 140 Z" fill="#2c6e45" />
      <path d="M200 50 L230 94 L200 86 L170 94 Z" fill="#3a8a58" />
      <path d="M118 238 Q200 226 296 238" stroke="#fff" strokeWidth="5" fill="none" opacity="0.8" strokeLinecap="round" />
      {hasFlags && (
        <g>
          <path d="M150 196 Q200 214 252 194" stroke="#fff" strokeWidth="1" fill="none" />
          {[160, 175, 190, 205, 220, 235].map((x, i) => (
            <rect key={i} x={x} y={200 + Math.sin(i) * 2} width="8" height="6" fill="#c8102e" stroke="#fff" strokeWidth="0.8" />
          ))}
          <path d="M168 138 Q200 152 234 136" stroke="#fff" strokeWidth="1" fill="none" />
          {[175, 190, 205, 220].map((x, i) => (
            <rect key={i} x={x} y={142 + Math.cos(i) * 2} width="7" height="5" fill="#c8102e" stroke="#fff" strokeWidth="0.8" />
          ))}
        </g>
      )}
      {hasLights && (
        <g className="w2d-lights">
          {[
            [150, 220], [175, 226], [200, 228], [225, 226], [250, 220], [270, 212],
            [160, 178], [185, 184], [210, 185], [238, 178],
            [178, 122], [200, 128], [222, 122], [190, 92], [212, 94],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.6" fill={i % 2 ? '#ffd27a' : '#ff9f5a'} />
          ))}
        </g>
      )}
      {tree.map((r) => (
        <Ornament key={r.id} r={r} />
      ))}
      <GiftPile gifts={gifts} />
      {world.map((r) => (
        <WorldItem key={r.id} r={r} />
      ))}
    </svg>
  );
}

/** Lille ikon af en dekoration (bruges i resultatvisning og forældreområde). */
export function RewardIcon({ reward, size = 64 }: { reward: RewardDefinition; size?: number }) {
  let x: number;
  let y: number;
  if (reward.visual === 'star') [x, y] = [200, 38];
  else if (reward.placement === 'tree') [x, y] = treeOrnament2D(reward);
  else [x, y] = reward.position2D;
  const isWorld = reward.placement === 'world';
  const isGarland = reward.visual === 'flagGarland' || reward.visual === 'lightString';
  const s = isWorld || reward.visual === 'star' ? 1.1 : 2.4;
  const ty = isWorld ? 52 : 30;
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} aria-hidden="true" className="reward-icon">
      <circle cx="30" cy="30" r="29" fill="#fff7e6" stroke="#e8d3a8" strokeWidth="2" />
      {isGarland ? (
        <g>
          <path d="M8 22 Q30 40 52 22" stroke="#2c6e45" strokeWidth="1.5" fill="none" />
          {[12, 21, 30, 39, 48].map((cx, i) =>
            reward.visual === 'flagGarland' ? (
              <rect key={i} x={cx - 4} y={26 + Math.sin(i * 1.2) * 3} width="8" height="6" fill="#c8102e" stroke="#fff" strokeWidth="0.8" />
            ) : (
              <circle key={i} cx={cx} cy={28 + Math.sin(i * 1.2) * 3} r="3.5" fill={i % 2 ? '#ffd27a' : '#ff9f5a'} />
            ),
          )}
        </g>
      ) : (
        <g transform={`translate(30 ${ty}) scale(${s}) translate(${-x} ${-y})`}>
          {isWorld ? <WorldItem r={reward} /> : <Ornament r={reward} />}
        </g>
      )}
    </svg>
  );
}
