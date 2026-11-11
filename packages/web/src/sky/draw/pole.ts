import { COL, GOLD } from '../../domain/lanes';
import { rgba } from '../palette';
import type { SkyState } from '../types';

export function drawPole(
  state: SkyState,
  x: number,
  y: number,
  S: number,
  t: number,
  r: number,
  vis: boolean,
  emb: boolean,
  total: number,
  done: number,
) {
  // Polaris overview: a ring that fills with the share of shipped work, ticks turning slowly round it, an outer
  // dashed ring turning the other way, a spark circling the progress ring and eight rays that flicker in turn.
  const R = 26 * S,
    frac = total ? done / total : 0,
    still = state.reduce.matches;
  const br = still ? 0.6 : 0.5 + 0.5 * Math.sin(t / 1100);
  if (emb) {
    // Header emblem: a soft breathing glow, eight fine rays and one slowly turning dotted ring; no progress ring here.
    state.ctx.globalAlpha = 0.16 + 0.1 * br;
    state.ctx.drawImage(state.tint(GOLD), x - R * 1.6, y - R * 1.6, R * 3.2, R * 3.2);
    state.ctx.globalAlpha = 1;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8,
        f = still ? 0.5 : 0.5 + 0.5 * Math.sin(t / 700 + i * 1.3),
        L1 = r * 1.6,
        L2 = r * (2.4 + 1.4 * f);
      state.ctx.strokeStyle = rgba(GOLD, 0.12 + 0.2 * f);
      state.ctx.lineWidth = 0.6;
      state.ctx.beginPath();
      state.ctx.moveTo(x + Math.cos(a) * L1, y + Math.sin(a) * L1);
      state.ctx.lineTo(x + Math.cos(a) * L2, y + Math.sin(a) * L2);
      state.ctx.stroke();
    }
    state.ctx.setLineDash([1.5, 6]);
    state.ctx.lineDashOffset = still ? 0 : t / 90;
    state.ctx.strokeStyle = rgba(GOLD, 0.22 + 0.1 * br);
    state.ctx.lineWidth = 1;
    state.ctx.beginPath();
    state.ctx.arc(x, y, R * 0.95, 0, 6.2832);
    state.ctx.stroke();
    state.ctx.setLineDash([]);
    state.ctx.lineDashOffset = 0;
  } else {
    state.ctx.globalAlpha = 0.35 + 0.3 * br;
    state.ctx.drawImage(state.tint(GOLD), x - R * 1.9, y - R * 1.9, R * 3.8, R * 3.8);
    state.ctx.globalAlpha = 1;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8,
        f = still ? 0.5 : 0.5 + 0.5 * Math.sin(t / 380 + i * 1.3),
        L1 = r * 2.2,
        L2 = r * (3.2 + 3 * f);
      state.ctx.strokeStyle = rgba(GOLD, 0.25 + 0.45 * f);
      state.ctx.lineWidth = 0.7;
      state.ctx.beginPath();
      state.ctx.moveTo(x + Math.cos(a) * L1, y + Math.sin(a) * L1);
      state.ctx.lineTo(x + Math.cos(a) * L2, y + Math.sin(a) * L2);
      state.ctx.stroke();
    }
    state.ctx.setLineDash([2, 5]);
    state.ctx.lineDashOffset = still ? 0 : t / 70;
    state.ctx.strokeStyle = rgba(GOLD, 0.3 + 0.2 * br);
    state.ctx.lineWidth = 1;
    state.ctx.beginPath();
    state.ctx.arc(x, y, R + 17 * S, 0, 6.2832);
    state.ctx.stroke();
    state.ctx.setLineDash([]);
    state.ctx.lineDashOffset = 0;
    if (!still) {
      const a = -Math.PI / 2 + ((t / 2400) % 6.2832);
      state.ctx.globalAlpha = 0.95;
      state.ctx.drawImage(
        state.tint([180, 255, 220]),
        x + Math.cos(a) * R - 6 * S,
        y + Math.sin(a) * R - 6 * S,
        12 * S,
        12 * S,
      );
      state.ctx.globalAlpha = 1;
    }
    state.ctx.strokeStyle = rgba(GOLD, vis ? 0.2 : 0.1);
    state.ctx.lineWidth = 2.2;
    state.ctx.beginPath();
    state.ctx.arc(x, y, R, 0, 6.2832);
    state.ctx.stroke();
    state.ctx.strokeStyle = rgba(COL.done, vis ? 0.9 : 0.45);
    state.ctx.lineCap = 'round';
    state.ctx.beginPath();
    state.ctx.arc(x, y, R, -Math.PI / 2, -Math.PI / 2 + 6.2832 * frac);
    state.ctx.stroke();
    state.ctx.lineCap = 'butt';
    state.ctx.strokeStyle = rgba(GOLD, vis ? 0.45 : 0.2);
    state.ctx.lineWidth = 0.8;
    const a0 = state.reduce.matches ? 0 : t / 9000;
    for (let i = 0; i < 24; i++) {
      const a = a0 + (i * Math.PI) / 12,
        r0 = R + 5 * S,
        r1 = R + (i % 3 ? 8 : 12) * S;
      state.ctx.beginPath();
      state.ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      state.ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      state.ctx.stroke();
    }
  }
}
