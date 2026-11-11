import { FIG_LANE as CARD_LANE, COL, GOLD } from '../../domain/lanes';
import { rgba } from '../palette';
import type { SkyState } from '../types';

import { drawApp } from './app';
import { drawPole } from './pole';
export function drawHub(
  state: SkyState,
  x: number,
  y: number,
  k: number,
  t: number,
  lit: number,
  small: boolean,
  vis: boolean,
  S0: number,
) {
  const total = [...state.counts.values()].reduce((a, b) => a + b, 0),
    done = state.laneCount('done');

  // The header Polaris is the board's emblem: larger than the Dipper stars, always bright, breathing.
  const S = k === 7 && small ? S0 * 2.3 : S0;
  const me = k === lit || (k === 7 && small),
    tw = 0.82 + 0.18 * Math.sin(t / 900 + k * 1.7),
    pole = k === 7,
    r = (pole ? 4.4 : 3.1) * S * (me ? 1.2 : 1);
  const hr = (pole ? 40 : 24) * S * (me ? 1.3 + 0.08 * Math.sin(t / 220) : 1);
  const dim = small && !me ? 0.38 : 1;
  const emb = pole && small; // the header Polaris is a quiet emblem, not a metric
  if (emb) {
    state.drawPolaris(x, y, S, t);
    return;
  }
  const hue = me && k !== 7 ? state.OWN(k) : GOLD;
  state.ctx.globalAlpha = Math.min(1, (small ? (me ? 0.95 : 0.16) : (vis ? 0.6 : 0.3) * (me ? 1.5 : 1)) * tw);
  state.ctx.drawImage(state.tint(hue), x - hr, y - hr, hr * 2, hr * 2);
  state.ctx.globalAlpha = dim;
  const L = r * (pole ? 5.5 : 3.6) * tw;
  state.ctx.strokeStyle = rgba(hue, vis ? 0.75 : 0.4);
  state.ctx.lineWidth = 0.8;
  state.ctx.beginPath();
  state.ctx.moveTo(x - L, y);
  state.ctx.lineTo(x + L, y);
  state.ctx.moveTo(x, y - L);
  state.ctx.lineTo(x, y + L);
  state.ctx.stroke();
  if (pole) {
    const L2 = L * 0.45;
    state.ctx.beginPath();
    state.ctx.moveTo(x - L2, y - L2);
    state.ctx.lineTo(x + L2, y + L2);
    state.ctx.moveTo(x - L2, y + L2);
    state.ctx.lineTo(x + L2, y - L2);
    state.ctx.stroke();
  }
  state.ctx.fillStyle = rgba([255, 246, 225], (small ? (me ? 1 : 0.5) : vis ? 0.95 : 0.6) * tw);
  state.ctx.beginPath();
  state.ctx.arc(x, y, r, 0, 6.2832);
  state.ctx.fill();
  if (me) {
    state.ctx.strokeStyle = rgba(hue, 0.85 * state.dipGlow);
    state.ctx.lineWidth = 1.1;
    state.ctx.beginPath();
    state.ctx.arc(x, y, (pole ? 34 : 13) * S, 0, 6.2832);
    state.ctx.stroke();
  }
  if (k === 0) {
    drawApp(state, x, y, S, t, vis);
  } else if (pole) {
    drawPole(state, x, y, S, t, r, vis, emb, total, done);
  } else if (!state.laneCount(CARD_LANE[k]!)) {
    // Empty group: its star still shows, ringed by a dim turning dash so the eight always read as eight.
    const c = COL[CARD_LANE[k]!]! || COL.planned;
    state.ctx.setLineDash([2, 6]);
    state.ctx.lineDashOffset = state.reduce.matches ? 0 : t / 80;
    state.ctx.strokeStyle = rgba(c, vis ? 0.45 : 0.2);
    state.ctx.lineWidth = 1;
    state.ctx.beginPath();
    state.ctx.arc(x, y, 30 * S, 0, 6.2832);
    state.ctx.stroke();
    state.ctx.setLineDash([]);
    state.ctx.lineDashOffset = 0;
  }
  state.ctx.globalAlpha = 1;
}
