import { COL } from '../../domain/lanes';
import { FLOW_ARCS } from '../constants';
import { rgba } from '../palette';
import type { SkyState } from '../types';

export function arcs(state: SkyState) {
  const list = FLOW_ARCS.filter(([a, b]) => state.laneCount(a) && state.laneCount(b));
  if (!state.laneCount('release') && state.laneCount('doing') && state.laneCount('done')) list.push(['doing', 'done']);
  return list;
}

export function arcPoint(
  state: SkyState,
  a: import('../../domain/types').Lane,
  b: import('../../domain/types').Lane,
  k: number,
) {
  const [ax, ay] = state.centre(a),
    [bx, by] = state.centre(b),
    mxp = (ax + bx) / 2,
    myp = (ay + by) / 2,
    nx = -(by - ay),
    ny = bx - ax,
    bend = 0.22;
  const cx = mxp + nx * bend,
    cy = myp + ny * bend,
    u = 1 - k;
  return state.at(u * u * ax + 2 * u * k * cx + k * k * bx, u * u * ay + 2 * u * k * cy + k * k * by, 14);
}

export function drawFlows(state: SkyState, t: number) {
  const list = state.arcs();
  state.ctx.setLineDash([1, 7]);
  state.ctx.lineWidth = 0.8;
  for (const [a, b] of list) {
    state.ctx.strokeStyle = rgba(COL[a]!, state.sky ? 0.22 : 0.11);
    state.ctx.beginPath();
    for (let k = 0; k <= 1.001; k += 0.05) {
      const [x, y] = state.arcPoint(a, b, k);
      if (k === 0) state.ctx.moveTo(x, y);
      else state.ctx.lineTo(x, y);
    }
    state.ctx.stroke();
  }
  state.ctx.setLineDash([]);
  if (!state.reduce.matches && list.length && t > state.nextPacket) {
    state.nextPacket = t + 900 + Math.random() * 1400;
    const [a, b] = list[Math.floor(Math.random() * list.length)]!;
    state.packets.push({ a, b, t0: t, dur: 2600 + Math.random() * 1600 });
  }
  state.packets = state.packets.filter((q) => t - q.t0 < q.dur);
  for (const q of state.packets) {
    const k = Math.max(0, t - q.t0) / q.dur,
      e = k * k * (3 - 2 * k),
      fade = Math.sin(Math.PI * k),
      ca = COL[q.a]!,
      cb = COL[q.b]!;
    const c = ca.map((v, i) => Math.round(v + (cb[i]! - v) * e));
    for (let j = 6; j >= 0; j--) {
      const [x, y] = state.arcPoint(q.a, q.b, Math.max(0, e - j * 0.012));
      state.ctx.fillStyle = rgba(c, fade * (1 - j / 7) * 0.8);
      state.ctx.beginPath();
      state.ctx.arc(x, y, (1.6 - j * 0.15) * state.sz, 0, 6.2832);
      state.ctx.fill();
    }
    const [x, y] = state.arcPoint(q.a, q.b, e);
    state.ctx.globalAlpha = fade;
    state.ctx.drawImage(state.tint(c), x - 8 * state.sz, y - 8 * state.sz, 16 * state.sz, 16 * state.sz);
    state.ctx.globalAlpha = 1;
  }
}
