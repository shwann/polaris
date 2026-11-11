import { NEB } from '../constants';
import { rgba } from '../palette';
import type { SkyState } from '../types';

export function drawNebula(state: SkyState, t: number) {
  if (state.reduce.matches) return;
  state.ctx.globalCompositeOperation = 'lighter';
  for (const [fx, fy, c, sp] of NEB) {
    const x = (fx + Math.sin(t / (sp * 1000)) * 0.08) * state.w,
      y = (fy + Math.cos(t / (sp * 1300)) * 0.06) * state.h,
      r = state.unit * (0.36 + 0.05 * Math.sin(t / (sp * 700)));
    const g = state.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, 0.065));
    g.addColorStop(1, rgba(c, 0));
    state.ctx.fillStyle = g;
    state.ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  state.ctx.globalCompositeOperation = 'source-over';
}
