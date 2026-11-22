import * as THREE from 'three';

/**
 * Manuskript for juleaftensfinalen (ren præsentation – belønningerne er gemt på forhånd).
 * Alle tider i sekunder. Juster her for at ændre tempo.
 */
export const FINALE = {
  /** Fuld version. */
  total: 30,
  walkStart: 3,
  walkEnd: 9,
  sackDown: 9.8,
  giftsStart: 11,
  giftsEnd: 18.6,
  giftFlight: 0.85,
  starStart: 19,
  starEnd: 23,
  lightsStart: 23,
  lightsEnd: 26,
  waveStart: 26,
  /** Rolig version ved reduceret bevægelse: ingen kameraflyvning, trinvise skift. */
  reducedTotal: 8,
} as const;

/** Begivenheder som UI'et kan vise som korte tekster (og evt. lyd). */
export type FinaleCue = 'door' | 'walk' | 'gifts' | 'star' | 'starLanded' | 'lights' | 'wave' | 'done';

export const CUE_TIMES: [number, FinaleCue][] = [
  [0, 'door'],
  [FINALE.walkStart, 'walk'],
  [FINALE.giftsStart, 'gifts'],
  [FINALE.starStart, 'star'],
  [FINALE.starEnd, 'starLanded'],
  [FINALE.lightsStart + 0.2, 'lights'],
  [FINALE.waveStart, 'wave'],
];

export const REDUCED_CUE_TIMES: [number, FinaleCue][] = [
  [0, 'door'],
  [1.2, 'gifts'],
  [4.2, 'starLanded'],
  [5.2, 'lights'],
  [6.6, 'wave'],
];

interface CamKey {
  t: number;
  theta: number;
  phi: number;
  r: number;
  target: [number, number, number];
}

/** Kamerakeyframes: totalbillede → følg nissen → rundt om gavebunken → op mod stjernen → præsentation. */
const CAM_KEYS: CamKey[] = [
  { t: 0, theta: 0.1, phi: 1.22, r: 12.5, target: [-1.2, 1.3, -0.4] },
  { t: 3, theta: -0.45, phi: 1.2, r: 7.2, target: [-3.0, 0.8, -0.6] },
  { t: 6, theta: -0.1, phi: 1.26, r: 6.4, target: [-2.2, 0.7, 1.0] },
  { t: 9, theta: 0.35, phi: 1.24, r: 6.0, target: [-1.1, 0.7, 2.2] },
  { t: 11, theta: 0.7, phi: 1.12, r: 6.8, target: [-0.4, 0.7, 1.8] },
  { t: 15, theta: 1.7, phi: 1.04, r: 8.0, target: [0, 0.7, 0.8] },
  { t: 19, theta: 2.6, phi: 1.08, r: 8.4, target: [0, 1.0, 0.4] },
  { t: 23, theta: 3.3, phi: 1.7, r: 7.6, target: [0, 3.2, 0] }, // kigger op mod stjernen
  // Kameraet svinger tilbage samme vej (så hytten aldrig kommer i vejen) og ender forfra
  { t: 26, theta: 1.7, phi: 1.12, r: 9.4, target: [0, 2.0, 0] },
  { t: 30, theta: 0, phi: 1.2, r: 9.0, target: [0, 1.55, 0] },
];

const smooth = (x: number) => x * x * (3 - 2 * x);

export function sampleCamera(t: number, outPos: THREE.Vector3, outTarget: THREE.Vector3): void {
  let i = 0;
  while (i < CAM_KEYS.length - 2 && t > CAM_KEYS[i + 1].t) i++;
  const a = CAM_KEYS[i];
  const b = CAM_KEYS[i + 1];
  const u = smooth(Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))));
  const lerp = THREE.MathUtils.lerp;
  outTarget.set(lerp(a.target[0], b.target[0], u), lerp(a.target[1], b.target[1], u), lerp(a.target[2], b.target[2], u));
  const s = new THREE.Spherical(lerp(a.r, b.r, u), lerp(a.phi, b.phi, u), lerp(a.theta, b.theta, u));
  outPos.setFromSpherical(s).add(outTarget);
}
