import { COL } from '../../domain/lanes';
import { rgba } from '../palette';
import type { Color, SkyState, Star } from '../types';

/** Task constellation lines in the sky view sit a step below the Dipper's own lines. */
export const TASK_LINK_SKY = 0.85;

export function drawClusters(state: SkyState, t: number, list: Star[]) {
  // Constellation bodies: a soft cloud in the lane's colour follows each figure, breathing slowly.
  state.ctx.globalCompositeOperation = 'lighter';
  for (const st of list) {
    const c = COL[st.group]! || COL.planned,
      lit = (state.hover && state.hover.group === st.group) || state.litGroup === st.group,
      [x, y] = state.at(st.x, st.y, 14);
    const R = state.unit * (st.group === 'done' ? 0.035 : 0.075) * (1 + 0.12 * Math.sin(t / 2600 + st.ph)),
      a = (st.group === 'done' ? (st.recent ? 0.08 : 0.04) : 0.11) * (state.sky ? 1.5 : 1) * (lit ? 1.8 : 1) * st.alpha;
    state.ctx.globalAlpha = a;
    state.ctx.drawImage(state.tint(c), x - R, y - R, R * 2, R * 2);
  }
  // The shipped cluster gets a bright core, like a globular cluster.
  if (state.laneCount('done')) {
    const [cx0, cy0, R0] = state.centre('done'),
      [x, y] = state.at(cx0, cy0, 14),
      Rc = R0 * (1.1 + 0.06 * Math.sin(t / 3000));
    state.ctx.globalAlpha =
      (state.sky ? 0.32 : 0.22) *
      (state.litGroup === 'done' || (state.hover && state.hover.group === 'done') ? 1.6 : 1);
    state.ctx.drawImage(state.tint(COL.done), x - Rc, y - Rc, Rc * 2, Rc * 2);
  }
  state.ctx.globalAlpha = 1;
  state.ctx.globalCompositeOperation = 'source-over';
  // Constellation figures as neon tubes: a wide soft glow under a bright core; lines stop short of each star.
  const live: [Star, Star][] = [];
  for (const [g, edges] of state.trees) {
    const fade = state.linkFade(g);
    if (fade < 0.01) continue;
    const lit = (state.hover && state.hover.group === g) || state.litGroup === g,
      c = COL[g]! || COL.planned,
      base = 0.5 * (state.sky ? TASK_LINK_SKY : 1) * (lit ? 1.6 : 1) * fade;
    for (const [a, b] of edges) {
      const [ax, ay] = state.at(a.x, a.y, 14),
        [bx, by] = state.at(b.x, b.y, 14),
        L = Math.hypot(bx - ax, by - ay);
      if (L <= 16 * state.sz) continue;
      const ah = state.home(a, t),
        bh = state.home(b, t);
      const rest = Math.max(24, Math.hypot(bh[0] - ah[0], bh[1] - ah[1]));
      const related = state.drag?.star === a || state.drag?.star === b || Math.hypot(a.ox - b.ox, a.oy - b.oy) > 0.5;
      const tension = related ? Math.min(1, Math.max(0, L / rest - 1) / 1.5) : 0;
      const color = c.map((v) => Math.round(v + (255 - v) * tension * 0.7)) as Color;
      const shimmer = !state.reduce.matches && tension > 0.65 ? 1 + 0.07 * Math.sin(t / 38 + a.ph) : 1;
      const brightness = (1 + tension * 0.7) * shimmer,
        thin = 1 / (1 + tension * 1.4);
      const ux = (bx - ax) / L,
        uy = (by - ay) / L,
        gap = 8 * state.sz,
        al = Math.min(a.alpha, b.alpha),
        x0 = ax + ux * gap,
        y0 = ay + uy * gap,
        x1 = bx - ux * gap,
        y1 = by - uy * gap;
      state.ctx.lineCap = 'round';
      for (const [opacity, width] of [
        [0.1, lit ? 9 : 7],
        [0.22, 3],
        [0.75, lit ? 1.6 : 1.2],
      ]) {
        state.ctx.strokeStyle = rgba(color, opacity! * base * al * brightness);
        state.ctx.lineWidth = width! * thin;
        state.ctx.beginPath();
        state.ctx.moveTo(x0, y0);
        state.ctx.lineTo(x1, y1);
        state.ctx.stroke();
      }
      state.ctx.lineCap = 'butt';
      if (fade > 0.5) live.push([a, b]);
    }
  }

  return live;
}
