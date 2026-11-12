import { haloRadius } from './labelObstacles';
import { COL, MAG } from '../../domain/lanes';
import { rgba } from '../palette';
import type { SkyState, Star } from '../types';
import { drawStarLabels, labelLines, placeLabel } from './starLabels';

export function drawStars(state: SkyState, t: number, list: Star[]) {
  const labels = [];
  // Stars: halo, core, diffraction spikes on bright ones, a slow orbit ring on active work, a throb on overdue asks.
  for (const s of list) {
    const held = state.drag?.star === s;
    const c = COL[s.group]! || COL.planned,
      [x, y] = state.at(s.x, s.y, 14),
      r = (MAG[s.group]! || 1.7) * state.sz * (held ? 1.25 : 1),
      q = state.sz;
    const tw = 0.75 + 0.25 * Math.sin((t / 1000) * s.f + s.ph),
      throb = s.late ? 0.5 + 0.5 * Math.sin(t / 420 + s.ph) : 0,
      a0 = (s.group === 'done' ? 0.85 : 1) * s.alpha;
    const hr = haloRadius(state, s, t);
    state.ctx.globalAlpha = Math.min(
      1,
      ((s.group === 'done' ? 0.3 : 0.5) + throb * 0.4 + s.flare * 0.9 + (held ? 0.65 : state.hover === s ? 0.4 : 0)) *
        s.alpha,
    );
    state.ctx.drawImage(state.tint(c), x - hr, y - hr, hr * 2, hr * 2);
    state.ctx.globalAlpha = 1;
    if (r >= 2.2 * q || state.hover === s) {
      const L = r * (3.2 + s.flare * 4 + (state.hover === s ? 3 : 0)) * tw;
      state.ctx.strokeStyle = rgba(c, 0.55 * a0);
      state.ctx.lineWidth = 0.7;
      state.ctx.beginPath();
      state.ctx.moveTo(x - L, y);
      state.ctx.lineTo(x + L, y);
      state.ctx.moveTo(x, y - L);
      state.ctx.lineTo(x, y + L);
      state.ctx.stroke();
    }
    state.ctx.fillStyle = rgba([255, 255, 255], 0.85 * a0 * tw);
    state.ctx.beginPath();
    state.ctx.arc(x, y, r * 0.55, 0, 6.2832);
    state.ctx.fill();
    state.ctx.fillStyle = rgba(c, a0 * tw * 0.9);
    state.ctx.beginPath();
    state.ctx.arc(x, y, r + s.flare * 1.5, 0, 6.2832);
    state.ctx.fill();
    if (s.group === 'doing') {
      state.ctx.strokeStyle = rgba(c, 0.5 * s.alpha);
      state.ctx.lineWidth = 0.8;
      state.ctx.beginPath();
      state.ctx.ellipse(x, y, r + 6 * q, (r + 6 * q) * 0.45, -0.4, t / 700 + s.ph, t / 700 + s.ph + 4.4);
      state.ctx.stroke();
      // Two satellites on the orbit.
      for (const off of [0, Math.PI]) {
        const a = t / 900 + s.ph + off,
          ex = Math.cos(a) * (r + 6 * q),
          ey = Math.sin(a) * (r + 6 * q) * 0.45,
          rx = ex * Math.cos(-0.4) - ey * Math.sin(-0.4),
          ry = ex * Math.sin(-0.4) + ey * Math.cos(-0.4);
        state.ctx.fillStyle = rgba([220, 250, 255], 0.85 * s.alpha);
        state.ctx.beginPath();
        state.ctx.arc(x + rx, y + ry, 0.9 * q, 0, 6.2832);
        state.ctx.fill();
      }
    } else if (s.group === 'waiting' && !state.reduce.matches) {
      // Sonar: rings go out on a beat; overdue asks beat faster.
      const per = s.late ? 1400 : 2600,
        k = ((t + s.ph * 500) % per) / per;
      state.ctx.strokeStyle = rgba(c, 0.55 * (1 - k) * s.alpha);
      state.ctx.lineWidth = 0.9;
      state.ctx.beginPath();
      state.ctx.arc(x, y, r + (2 + k * (s.late ? 26 : 18)) * q, 0, 6.2832);
      state.ctx.stroke();
    } else if (s.group === 'release') {
      const a = t / 2400 + s.ph,
        d = r + 6 * q;
      state.ctx.strokeStyle = rgba(c, 0.5 * s.alpha);
      state.ctx.lineWidth = 0.8;
      state.ctx.beginPath();
      for (let k = 0; k <= 4; k++) {
        const q = a + (k * Math.PI) / 2;
        if (k) state.ctx.lineTo(x + Math.cos(q) * d, y + Math.sin(q) * d);
        else state.ctx.moveTo(x + Math.cos(q) * d, y + Math.sin(q) * d);
      }
      state.ctx.stroke();
    } else if (s.group === 'risk') {
      const fl = 0.45 + 0.35 * Math.sin(t / 170 + s.ph) * Math.sin(t / 530 + s.ph * 2);
      state.ctx.setLineDash([2, 3]);
      state.ctx.lineDashOffset = t / 90;
      state.ctx.strokeStyle = rgba(c, fl * s.alpha);
      state.ctx.lineWidth = 0.8;
      state.ctx.beginPath();
      state.ctx.arc(x, y, r + 5 * q, 0, 6.2832);
      state.ctx.stroke();
      state.ctx.setLineDash([]);
    } else if (s.group === 'done' && !state.reduce.matches) {
      // An occasional glint: a four-point sparkle that opens and closes.
      const k = ((t / 1000 + s.ph * 3.1) % 13) / 0.5;
      if (k < 1) {
        const L = Math.sin(Math.PI * k) * 9 * q;
        state.ctx.strokeStyle = rgba([220, 255, 235], 0.8 * Math.sin(Math.PI * k) * s.alpha);
        state.ctx.lineWidth = 0.8;
        state.ctx.beginPath();
        state.ctx.moveTo(x - L, y);
        state.ctx.lineTo(x + L, y);
        state.ctx.moveTo(x, y - L);
        state.ctx.lineTo(x, y + L);
        state.ctx.stroke();
      }
    }
    // Codes show once there is room for them: wide screens at full view, phones and the shipped cluster when zoomed in.
    const [sx, sy] = state.toScreen(x, y);
    const visible = sx >= 0 && sx <= state.w && sy >= 0 && sy <= state.h;
    const roomy = state.unit * state.cam.s > 640,
      named = s.group !== 'done' || state.cam.s > 2.2;
    if (
      s.code &&
      visible &&
      (state.hover === s ||
        (state.w > 560 && state.selected === s.id) ||
        (state.sky && roomy && named) ||
        (((state.hover && state.hover.group === s.group) || state.litGroup === s.group) && roomy) ||
        (state.sky && r >= 2.9 * q && roomy && named) ||
        (state.match && state.match.has(s.id)))
    )
      labels.push({
        id: s.id,
        lines: labelLines(state.sky ? s.skyCode || s.code : s.code, s.title, state.cam.s, state.sky, state.w > 560),
        x,
        gap: r + 6 * q,
        y: y - r - 3 * q,
        c,
        a: (state.hover === s ? 1 : state.sky ? 0.7 : 0.5) * s.alpha,
        pri:
          state.hover === s
            ? 99
            : state.w > 560 && state.selected === s.id
              ? 98
              : r / q + (state.match?.has(s.id) ? 5 : 0),
      });
  }
  if (state.w > 560) {
    drawStarLabels(state, labels);
    return;
  }
  // Place star labels without overlaps: hovered star first, then brighter stars. Title lines sit under the code,
  // a little smaller and paler.
  const size = Math.max(10, state.unit * 0.0098) * state.sz,
    lineH = size * 1.25;
  const placed: [number, number, number, number][] = [];
  labels.sort((p, q) => q.pri - p.pri);
  for (const L of labels) {
    state.ctx.font = `500 ${size}px "JetBrains Mono", monospace`;
    let wd = state.ctx.measureText(L.lines[0]!).width;
    state.ctx.font = `400 ${size * 0.92}px "Noto Sans SC", sans-serif`;
    for (const line of L.lines.slice(1)) wd = Math.max(wd, state.ctx.measureText(line).width);
    const [x0, y0] = state.toWorld(8, 8),
      [x1, y1] = state.toWorld(state.w - 8, state.h - 8);
    const placement = placeLabel(
      L.x,
      L.y,
      L.gap,
      wd,
      14 * state.sz + (L.lines.length - 1) * lineH,
      [x0, y0, x1, y1],
      11 * state.sz,
      2 * state.sz,
    );
    const { box, x, y, width, align } = placement;
    if (L.pri < 99 && placed.some((b) => box[0]! < b[2]! && box[2]! > b[0]! && box[1]! < b[3]! && box[3]! > b[1]!))
      continue;
    placed.push(box);
    // A dark halo keeps text readable where it crosses link lines and constellation names.
    state.ctx.save();
    state.ctx.textAlign = align;
    state.ctx.shadowColor = 'rgba(4,10,20,.95)';
    state.ctx.shadowBlur = 5 * state.sz;
    state.ctx.font = `500 ${size}px "JetBrains Mono", monospace`;
    state.ctx.fillStyle = rgba(L.c, L.a);
    state.ctx.fillText(L.lines[0]!, x, y, width);
    state.ctx.font = `400 ${size * 0.92}px "Noto Sans SC", sans-serif`;
    state.ctx.fillStyle = rgba([214, 228, 245], L.a * 0.85);
    L.lines.slice(1).forEach((line, i) => state.ctx.fillText(line, x, y + (i + 1) * lineH, width));
    state.ctx.restore();
  }
}
