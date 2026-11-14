import { COL, COL_APP } from '../../domain/lanes';
import { rgba } from '../palette';
import type { SkyState } from '../types';

export function drawApp(state: SkyState, x: number, y: number, S: number, t: number, vis: boolean) {
  // Dubhe represents the shipped app: a beacon with two counter-turning orbits.
  const c = COL_APP,
    a = state.reduce.matches ? 0 : t / 1600;
  state.ctx.strokeStyle = rgba(c, vis ? 0.55 : 0.25);
  state.ctx.lineWidth = 0.9;
  state.ctx.beginPath();
  state.ctx.ellipse(x, y, 16 * S, 6 * S, a, 0, 6.2832);
  state.ctx.stroke();
  state.ctx.beginPath();
  state.ctx.ellipse(x, y, 16 * S, 6 * S, -a + 1.2, 0, 6.2832);
  state.ctx.stroke();
  for (const q of [a * 2.3, -a * 1.7 + 2]) {
    state.ctx.fillStyle = rgba([220, 250, 255], vis ? 0.9 : 0.5);
    state.ctx.beginPath();
    state.ctx.arc(x + Math.cos(q) * 16 * S, y + Math.sin(q) * 6 * S, 1.3 * S, 0, 6.2832);
    state.ctx.fill();
  }
  // Release track: one small moon per shipped build on a slow outer orbit, the current build brightest.
  const rel = state.board?.app?.releases || [],
    curV = state.board?.app?.version;
  rel.forEach((r0, i) => {
    const q = a * 0.35 + (i * 6.2832) / rel.length,
      R = 25 * S,
      me2 = r0.v === curV;
    state.ctx.fillStyle = rgba(me2 ? [255, 255, 255] : c, (vis ? 0.9 : 0.5) * (me2 ? 1 : 0.55));
    state.ctx.beginPath();
    state.ctx.arc(x + Math.cos(q) * R, y + Math.sin(q) * R, (me2 ? 2.1 : 1.1) * S, 0, 6.2832);
    state.ctx.fill();
  });
  // Shipped but not yet proven in real use: an amber ring that breathes.
  if (state.unvN) {
    const br = 0.5 + 0.5 * Math.sin(t / 700);
    state.ctx.setLineDash([5, 4]);
    state.ctx.lineDashOffset = state.reduce.matches ? 0 : -t / 60;
    state.ctx.strokeStyle = rgba(COL.risk, (vis ? 0.55 : 0.3) + br * 0.3);
    state.ctx.lineWidth = 1.2;
    state.ctx.beginPath();
    state.ctx.arc(x, y, 32 * S, 0, 6.2832);
    state.ctx.stroke();
    state.ctx.setLineDash([]);
    state.ctx.lineDashOffset = 0;
  }
}
