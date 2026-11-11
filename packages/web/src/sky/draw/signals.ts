import { orbitRadius } from '../geometry/dipper';
import { COL } from '../../domain/lanes';
import { rgba } from '../palette';
import type { SkyState, Star } from '../types';

export function drawSignals(state: SkyState, t: number, live: [Star, Star][]) {
  // Signal pulses along live figure lines.
  if (!state.reduce.matches && live.length && t - state.lastPulse > 550 && state.pulses.length < 7) {
    state.lastPulse = t;
    const [a, b] = live[Math.floor(Math.random() * live.length)]!;
    state.pulses.push(
      Math.random() < 0.5
        ? { a, b, t0: t, dur: 1100 + Math.random() * 700 }
        : { a: b, b: a, t0: t, dur: 1100 + Math.random() * 700 },
    );
  }
  state.pulses = state.pulses.filter((q) => t - q.t0 < q.dur && state.stars.has(q.a.id) && state.stars.has(q.b.id));
  for (const q of state.pulses) {
    const k = Math.max(0, t - q.t0) / q.dur,
      e = k * k * (3 - 2 * k),
      [ax, ay] = state.at(q.a.x, q.a.y, 14),
      [bx, by] = state.at(q.b.x, q.b.y, 14),
      c = COL[q.a.group]! || COL.doing;
    const x = ax + (bx - ax) * e,
      y = ay + (by - ay) * e,
      k0 = Math.max(0, e - 0.16),
      x0 = ax + (bx - ax) * k0,
      y0 = ay + (by - ay) * k0,
      fade = Math.sin(Math.PI * k);
    const gr = state.ctx.createLinearGradient(x0, y0, x, y);
    gr.addColorStop(0, rgba(c, 0));
    gr.addColorStop(1, rgba(c, 0.9 * fade));
    state.ctx.strokeStyle = gr;
    state.ctx.lineWidth = 1.3;
    state.ctx.beginPath();
    state.ctx.moveTo(x0, y0);
    state.ctx.lineTo(x, y);
    state.ctx.stroke();
    state.ctx.globalAlpha = fade;
    state.ctx.drawImage(state.tint(c), x - 7 * state.sz, y - 7 * state.sz, 14 * state.sz, 14 * state.sz);
    state.ctx.globalAlpha = 1;
  }
  for (const r of state.ripples) {
    const k = Math.max(0, t - r.t0) / (r.small ? 650 : 1800),
      R = orbitRadius(k * (r.small ? 72 * state.sz : Math.max(state.w, state.h) * 0.7));
    state.ctx.strokeStyle = rgba(r.c, 0.45 * (1 - k) * r.power);
    state.ctx.lineWidth = 1.4 * (1 - k) + 0.4;
    state.ctx.beginPath();
    state.ctx.arc(r.x, r.y, R, 0, 6.2832);
    state.ctx.stroke();
    state.ctx.strokeStyle = rgba(r.c, 0.16 * (1 - k) * r.power);
    state.ctx.lineWidth = 0.6;
    state.ctx.beginPath();
    state.ctx.arc(r.x, r.y, R * 0.84, 0, 6.2832);
    state.ctx.stroke();
  }
}
