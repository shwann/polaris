import type { Lane } from '../../domain/types';
import type { Point, SkyState, Star } from '../types';
import { resetParticle } from './softbody';

const REBOUND = 240;
const STAGGER = 720;
const GLIDE = 460;

export interface FigureReturn {
  root: Star;
  elapsed: number;
  steps?: { star: Star; from: Point; delay: number }[];
}

/** Let the elastic rebound play first, then glide each star back to its own moving base. */
export function moveReturningFigures(s: SkyState, list: Star[], dt: number) {
  const controlled = new Set<Lane>();
  if (!s.sky || s.reduce.matches) s.figureReturns?.clear();
  for (const [lane, returning] of s.figureReturns ?? []) {
    if (!s.figures.has(lane)) {
      s.figureReturns!.delete(lane);
      continue;
    }
    returning.elapsed += dt;
    if (returning.elapsed < REBOUND) continue;
    if (!returning.steps) {
      const { root } = returning;
      const stars = list.filter((p) => p.group === lane && p.figureRole && !p.dead);
      const distance = (p: Star) => Math.hypot(p.layoutX! - root.layoutX!, p.layoutY! - root.layoutY!);
      stars.sort((a, b) => distance(a) - distance(b));
      const interval = Math.min(75, STAGGER / Math.max(1, stars.length - 1));
      returning.steps = stars.map((star, i) => ({ star, from: [star.ox, star.oy], delay: i * interval }));
      if (s.soft.recovery) s.soft.recovery = s.soft.recovery.filter((r) => r.root !== root);
    }
    controlled.add(lane);
    let settled = true;
    for (const { star, from, delay } of returning.steps) {
      if (star.dead || star.group !== lane || !star.figureRole) continue;
      const k = Math.min(1, Math.max(0, (returning.elapsed - REBOUND - delay) / GLIDE));
      const left = 1 - k * k * (3 - 2 * k);
      resetParticle(star);
      [star.ox, star.oy] = [from[0] * left, from[1] * left];
      if (k < 1) settled = false;
    }
    if (settled) s.figureReturns!.delete(lane);
  }
  return controlled;
}
