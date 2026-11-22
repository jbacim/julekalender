import type { ReactNode } from 'react';

function Svg({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export const IconSoundOn = () => (
  <Svg>
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
    <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
  </Svg>
);
export const IconSoundOff = () => (
  <Svg>
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
    <path d="M17 9l5 6M22 9l-5 6" />
  </Svg>
);
export const IconHome = () => (
  <Svg>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </Svg>
);
export const IconBack = () => (
  <Svg>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const IconGear = () => (
  <Svg>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </Svg>
);
export const IconSpeaker = () => (
  <Svg>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    <path d="M16 9a4 4 0 0 1 0 6" />
  </Svg>
);
export const IconBulb = () => (
  <Svg>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" fill="currentColor" fillOpacity="0.15" />
  </Svg>
);
export const IconLock = () => (
  <Svg size={18}>
    <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" fillOpacity="0.2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);
export const IconCheck = () => (
  <Svg size={18}>
    <path d="M5 12l5 5 9-10" strokeWidth="3" />
  </Svg>
);
export const IconRetry = () => (
  <Svg size={18}>
    <path d="M4 12a8 8 0 1 0 3-6.2" />
    <path d="M4 4v5h5" />
  </Svg>
);
export const IconDots = () => (
  <Svg size={18}>
    <circle cx="6" cy="12" r="1.6" fill="currentColor" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    <circle cx="18" cy="12" r="1.6" fill="currentColor" />
  </Svg>
);
export const IconRotateLeft = () => (
  <Svg>
    <path d="M4 12a8 8 0 1 0 3-6.2" />
    <path d="M4 4v5h5" />
  </Svg>
);
export const IconRotateRight = () => (
  <Svg>
    <path d="M20 12a8 8 0 1 1-3-6.2" />
    <path d="M20 4v5h-5" />
  </Svg>
);
export const IconZoomIn = () => (
  <Svg>
    <circle cx="11" cy="11" r="7" />
    <path d="M11 8v6M8 11h6M21 21l-5-5" />
  </Svg>
);
export const IconZoomOut = () => (
  <Svg>
    <circle cx="11" cy="11" r="7" />
    <path d="M8 11h6M21 21l-5-5" />
  </Svg>
);
export const IconStar = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="#ffd23f" stroke="#c99a12" strokeWidth="1.2" />
  </svg>
);
export const IconSnowflake = ({ size = 20 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2" />
  </Svg>
);
