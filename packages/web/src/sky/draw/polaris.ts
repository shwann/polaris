import { GOLD } from '../../domain/lanes';
import { rgba } from '../palette';
import type { Color, SkyState } from '../types';

export function drawPolaris(state: SkyState, x: number, y: number, S: number, t: number) {
  const still = state.reduce.matches,
    R = 26 * S;
  const n = still ? 0 : Math.sin(t / 173) * 0.5 + Math.sin(t / 97 + 1.3) * 0.3 + Math.sin(t / 61 + 2.1) * 0.2; // -1..1, never periodic to the eye
  const tw = 0.82 + 0.18 * n,
    burst = still ? 0 : Math.max(0, Math.sin(t / 2900) * Math.sin(t / 1700 + 1) - 0.55) * 2.2;
  const j = still ? 0 : Math.round(Math.sin(t / 233 + 0.7) * Math.sin(t / 141) * 3) / 3; // quantised so tints stay cached
  const col =
    j > 0
      ? [255, Math.round(238 - 26 * j), Math.round(205 - 50 * j)]
      : [Math.round(255 + 40 * j), Math.round(245 + 6 * j), 255];
  const glow = (c: Color, r: number, a: number) => {
    state.ctx.globalAlpha = Math.max(0, Math.min(1, a));
    state.ctx.drawImage(state.tint(c), x - r, y - r, r * 2, r * 2);
  };
  state.ctx.globalCompositeOperation = 'lighter';
  glow(GOLD, R * 2.6, 0.1 + 0.04 * tw);
  glow(col, R * 1.2, 0.3 * tw + 0.12 * burst);
  glow([255, 250, 238], R * 0.5, 0.8 * tw + 0.2 * burst);
  const spike = (a: number, len: number, w: number, al: number) => {
    const dx = Math.cos(a) * len,
      dy = Math.sin(a) * len,
      g = state.ctx.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.45, rgba(col, al * 0.5));
    g.addColorStop(0.5, rgba([255, 255, 255], al));
    g.addColorStop(0.55, rgba(col, al * 0.5));
    g.addColorStop(1, rgba(col, 0));
    state.ctx.strokeStyle = g;
    state.ctx.lineWidth = w;
    state.ctx.beginPath();
    state.ctx.moveTo(x - dx, y - dy);
    state.ctx.lineTo(x + dx, y + dy);
    state.ctx.stroke();
  };
  state.ctx.globalAlpha = 1;
  const Lm = R * (1.9 + 0.3 * n + 0.7 * burst);
  spike(0, Lm, 1.3, 0.95 * tw);
  spike(Math.PI / 2, Lm, 1.3, 0.95 * tw);
  spike(Math.PI / 4, Lm * 0.45, 0.8, 0.4 * tw);
  spike(-Math.PI / 4, Lm * 0.45, 0.8, 0.4 * tw);
  state.ctx.globalCompositeOperation = 'source-over';
  state.ctx.globalAlpha = 1;
  state.ctx.fillStyle = rgba([255, 253, 245], 0.95);
  state.ctx.beginPath();
  state.ctx.arc(x, y, Math.max(2.2, 2.6 * S * 0.7), 0, 6.2832);
  state.ctx.fill();
}
