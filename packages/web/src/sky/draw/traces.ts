import { COL } from '../../domain/lanes';
import { LANE_ORDER } from '../constants';
import { rgba } from '../palette';
import type { SkyState } from '../types';

export function drawTraces(state: SkyState, t: number) {
  if (state.reduce.matches) return;
  for (const [g, edges] of state.trees) {
    if (state.figures.has(g)) continue;
    if (!edges.length || state.linkFade(g) < 0.5) continue;
    const cyc = 9000,
      local = (t + LANE_ORDER.indexOf(g) * 1500) % cyc,
      run = 2400;
    if (local > run + 700) continue;
    const prog = Math.min(1, local / run) * edges.length,
      fade = local > run ? 1 - (local - run) / 700 : 1,
      c = COL[g]! || COL.planned;
    state.ctx.lineWidth = 1.4;
    edges.forEach(([a, b], i) => {
      if (prog <= i) return;
      const part = Math.min(1, prog - i),
        [ax, ay] = state.at(a.x, a.y, 14),
        [bx, by] = state.at(b.x, b.y, 14);
      const x = ax + (bx - ax) * part,
        y = ay + (by - ay) * part,
        head = prog - i < 1.2;
      state.ctx.strokeStyle = rgba(c, (head ? 0.8 : 0.35) * fade * (g === 'done' ? 0.6 : 1));
      state.ctx.beginPath();
      state.ctx.moveTo(ax, ay);
      state.ctx.lineTo(x, y);
      state.ctx.stroke();
      if (head && part < 1) {
        state.ctx.globalAlpha = 0.9 * fade;
        state.ctx.drawImage(state.tint(c), x - 6 * state.sz, y - 6 * state.sz, 12 * state.sz, 12 * state.sz);
        state.ctx.globalAlpha = 1;
      }
    });
  }
}
