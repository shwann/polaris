import type { Particle } from './softbody';

export const MIN_SEPARATION = 20;
const PASSES = 24;
const MAX_PUSH = 4;

/** Bounded position projection on the fixed clock, including nonadjacent beads. */
export function separate(groups: Particle[][], minimum: number, pin?: Particle) {
  for (let pass = 0; pass < PASSES; pass++) {
    let overlap = false;
    for (const group of groups)
      for (let i = 0; i < group.length; i++)
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i]!,
            b = group[j]!,
            hx = b.baseX! - a.baseX!,
            hy = b.baseY! - a.baseY!,
            dx = hx + b.ox - a.ox,
            dy = hy + b.oy - a.oy,
            d = Math.hypot(dx, dy);
          const floor = Math.min(minimum, a.separation ?? Infinity, b.separation ?? Infinity);
          if (d >= floor) continue;
          overlap = true;
          const rest = Math.hypot(hx, hy),
            nx = d > 1e-8 ? dx / d : rest > 1e-8 ? hx / rest : 1,
            ny = d > 1e-8 ? dy / d : rest > 1e-8 ? hy / rest : 0,
            wa = a === pin ? 0 : 1,
            wb = b === pin ? 0 : 1,
            push = Math.min(MAX_PUSH, (floor + 1e-5 - d) / (wa + wb || 1));
          a.ox -= nx * push * wa;
          a.oy -= ny * push * wa;
          b.ox += nx * push * wb;
          b.oy += ny * push * wb;
        }
    if (!overlap) break;
  }
}
