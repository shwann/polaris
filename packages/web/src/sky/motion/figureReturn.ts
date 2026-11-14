import type { Lane } from '../../domain/types';
import type { Point, SkyState, Star } from '../types';
import { resetParticle } from './softbody';
import { figureReturnTimings, returnOffset, returnProgress, type ReturnTiming } from './returnTiming';

const REBOUND = 240;

export interface FigureReturn {
  root: Star;
  elapsed: number;
  steps?: { star: Star; from: Point; timing: ReturnTiming }[];
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
      stars.sort((a, b) => Number(b === root) - Number(a === root) || distance(a) - distance(b));
      const timings = figureReturnTimings(s, root.group, stars);
      returning.steps = stars.map((star) => ({ star, from: [star.ox, star.oy], timing: timings.get(star)! }));
      if (s.soft.recovery) s.soft.recovery = s.soft.recovery.filter((r) => r.root !== root);
    }
    controlled.add(lane);
    let settled = true;
    for (const { star, from, timing } of returning.steps) {
      if (star.dead || star.group !== lane || !star.figureRole) continue;
      const elapsed = returning.elapsed - REBOUND;
      resetParticle(star);
      [star.ox, star.oy] = returnOffset(from, elapsed, timing);
      if (returnProgress(elapsed, timing) < 1) settled = false;
    }
    if (settled) s.figureReturns!.delete(lane);
  }
  return controlled;
}
