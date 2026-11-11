import { drawDoneOverview } from './doneOverview';
import { boundsOf } from '../geometry/cardPlacement';
import { clearTooltip } from '../tooltip';
import { COL } from '../../domain/lanes';
import { rgba } from '../palette';
import type { SkyState } from '../types';

export function drawEffects(state: SkyState, t: number, dt: number) {
  state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  state.lwk = 1;
  drawDoneOverview(state);
  // Pointer reticle (screen space).
  if (state.px > -1e3 && state.onSky) {
    state.ctx.strokeStyle = 'rgba(46,230,255,.35)';
    state.ctx.lineWidth = 0.8;
    state.ctx.beginPath();
    state.ctx.arc(state.px, state.py, 9 + Math.sin(t / 300) * 1.5, 0, 6.2832);
    state.ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      state.ctx.beginPath();
      state.ctx.moveTo(state.px + Math.cos(a) * 13, state.py + Math.sin(a) * 13);
      state.ctx.lineTo(state.px + Math.cos(a) * 17, state.py + Math.sin(a) * 17);
      state.ctx.stroke();
    }
  }
  // Selected star: a target ring, and the detail card follows it while the sky moves.
  if (state.selected) {
    const s = state.stars.get(state.selected);
    if (!s) {
      state.selected = null;
      state.api.onSelect?.(null);
    } else {
      const c = COL[s.group]! || COL.doing,
        [x, y] = state.toScreen(...state.at(s.x, s.y, 14)),
        R = 14 + Math.sin(t / 260) * 2;
      state.ctx.strokeStyle = rgba(c, 0.9);
      state.ctx.lineWidth = 1.2;
      state.ctx.beginPath();
      state.ctx.arc(x, y, R, 0, 6.2832);
      state.ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + t / 1500;
        state.ctx.beginPath();
        state.ctx.moveTo(x + Math.cos(a) * (R + 3), y + Math.sin(a) * (R + 3));
        state.ctx.lineTo(x + Math.cos(a) * (R + 8), y + Math.sin(a) * (R + 8));
        state.ctx.stroke();
      }
      const points = [...state.stars.values()]
        .filter((star) => !star.dead && star.group === s.group)
        .map((star) => state.toScreen(...state.at(star.x, star.y, 14)));
      const pan = state.api.onSelectedMove?.(x, y, boundsOf(points.length ? points : [[x, y]]));
      if (pan && state.sky && state.w > 560 && !state.drag && Math.hypot(...pan) > 0.75) {
        clearTooltip(state);
        state.camT.x = state.cam.x + pan[0];
        state.camT.y = state.cam.y + pan[1];
      }
    }
  }
  if (!state.reduce.matches && t > state.nextComet) {
    // Mostly single meteors; now and then a short shower from one radiant.
    const shower = Math.random() < 0.22,
      n = shower ? 4 + Math.floor(Math.random() * 4) : 1,
      L = Math.random() < 0.5;
    const ox = L ? -40 : state.w * (0.3 + Math.random() * 0.6),
      oy = L ? state.h * Math.random() * 0.4 : -40,
      vx = 0.5 + Math.random() * 0.35,
      vy = 0.2 + Math.random() * 0.25;
    for (let i = 0; i < n; i++)
      state.comets.push({
        x: ox + (Math.random() - 0.5) * 160,
        y: oy + (Math.random() - 0.5) * 120,
        vx: vx * (0.85 + Math.random() * 0.3),
        vy: vy * (0.85 + Math.random() * 0.3),
        delay: i * (180 + Math.random() * 260),
      });
    state.nextComet = t + (shower ? 14000 : 6000) + Math.random() * 7000;
  }
  state.comets = state.comets.filter((c) => c.x < state.w + 200 && c.y < state.h + 200);
  for (const c of state.comets) {
    if (c.delay > 0) {
      c.delay -= dt;
      continue;
    }
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    const n = Math.hypot(c.vx, c.vy),
      x0 = c.x - (c.vx / n) * 150,
      y0 = c.y - (c.vy / n) * 150;
    const gr = state.ctx.createLinearGradient(x0, y0, c.x, c.y);
    gr.addColorStop(0, 'rgba(160,240,255,0)');
    gr.addColorStop(1, 'rgba(225,250,255,.8)');
    state.ctx.strokeStyle = gr;
    state.ctx.lineWidth = 1.2;
    state.ctx.beginPath();
    state.ctx.moveTo(x0, y0);
    state.ctx.lineTo(c.x, c.y);
    state.ctx.stroke();
    state.ctx.globalAlpha = 0.9;
    state.ctx.drawImage(state.tint([190, 245, 255]), c.x - 6, c.y - 6, 12, 12);
    state.ctx.globalAlpha = 1;
  }
  if (state.focus) {
    const s = state.stars.get(state.focus.id);
    if (s) {
      const c = COL[s.group]! || COL.doing,
        [x, y] = state.toScreen(...state.at(s.x, s.y, 14)),
        gr = state.ctx.createLinearGradient(state.focus.x, state.focus.y, x, y);
      gr.addColorStop(0, rgba(c, 0.05));
      gr.addColorStop(1, rgba(c, 0.85));
      state.ctx.strokeStyle = gr;
      state.ctx.lineWidth = 1;
      state.ctx.setLineDash([4, 5]);
      state.ctx.lineDashOffset = -t / 40;
      state.ctx.beginPath();
      state.ctx.moveTo(state.focus.x, state.focus.y);
      state.ctx.lineTo(x, y);
      state.ctx.stroke();
      state.ctx.setLineDash([]);
      state.ctx.strokeStyle = rgba(c, 0.85);
      state.ctx.lineWidth = 1.2;
      state.ctx.beginPath();
      state.ctx.arc(x, y, 13 + Math.sin(t / 200) * 2, 0, 6.2832);
      state.ctx.stroke();
      state.ctx.globalAlpha = 0.9;
      state.ctx.drawImage(state.tint(c), x - 24, y - 24, 48, 48);
      state.ctx.globalAlpha = 1;
    }
  }

  state.emitTooltip();
}
