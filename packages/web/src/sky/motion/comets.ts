import type { SkyState } from '../types';

export const COMET_GAP = 6000;
export const COMET_JITTER = 7000;
export const COMET_EXIT = 200;
type CometState = Pick<SkyState, 'comets' | 'nextComet' | 'w' | 'h' | 'reduce'>;

/** Schedule from the previous meteor's exit, guaranteeing a quiet interval as well as one live meteor. */
export function advanceComets(s: CometState, t: number, dt: number, random = Math.random) {
  if (s.reduce.matches) {
    s.comets = [];
    s.nextComet = t + COMET_GAP;
    return;
  }
  if (s.comets.length) {
    const c = s.comets[0]!;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    s.comets = c.x < s.w + COMET_EXIT && c.y < s.h + COMET_EXIT ? [c] : [];
    if (!s.comets.length) s.nextComet = t + COMET_GAP + random() * COMET_JITTER;
    return;
  }
  if (t < s.nextComet) return;
  const left = random() < 0.5;
  s.comets = [
    {
      x: left ? -40 : s.w * (0.3 + random() * 0.6),
      y: left ? s.h * random() * 0.4 : -40,
      vx: 0.5 + random() * 0.35,
      vy: 0.2 + random() * 0.25,
      delay: 0,
    },
  ];
}
