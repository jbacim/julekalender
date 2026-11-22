/** Enhedskapabiliteter til at tilpasse grafikniveau. */

let webglCache: boolean | undefined;

/** Kan overstyres i tests og via udviklerværktøjet. */
export const capabilityOverrides: { forceNoWebGL?: boolean } = {};

export function hasWebGL(): boolean {
  if (capabilityOverrides.forceNoWebGL) return false;
  if (webglCache !== undefined) return webglCache;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    webglCache = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export type QualityTier = 'low' | 'medium' | 'high';

export function qualityTier(reducedEffects: boolean): QualityTier {
  if (reducedEffects) return 'low';
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 500;
  if (cores <= 4 || mem <= 2) return 'low';
  if (cores >= 8 && mem >= 8 && !small) return 'high';
  return 'medium';
}
