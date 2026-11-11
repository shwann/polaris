import { p2 } from '../../domain/time';
import { hash } from '../palette';
import type { Point, SkyState } from '../types';

export function drawChart(state: SkyState) {
  state.chart = document.createElement('canvas');
  state.chart.width = Math.round(state.w * state.dpr);
  state.chart.height = Math.round(state.h * state.dpr);
  const g = state.chart.getContext('2d')!;
  g.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  // Milky Way: a soft band from lower left to upper right, clouds plus a dense dust of faint stars, seeded so it never jumps.
  const band = (u: number): Point => [u * state.w, state.h * (0.98 - 0.78 * u) + Math.sin(u * 5.2) * state.h * 0.05];
  for (let i = 0; i < 90; i++) {
    const u = hash('mw' + i, 1),
      [x, y] = band(u),
      off = (hash('mw' + i, 2) - 0.5) * state.h * 0.2,
      r = state.unit * (0.06 + hash('mw' + i, 3) * 0.12);
    const hue = hash('mw' + i, 4),
      col = hue < 0.55 ? '120,170,255' : hue < 0.85 ? '170,130,255' : '255,200,150';
    const rg = g.createRadialGradient(x, y + off, 0, x, y + off, r);
    rg.addColorStop(0, `rgba(${col},${0.045 + hash('mw' + i, 5) * 0.05})`);
    rg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = rg;
    g.fillRect(x - r, y + off - r, r * 2, r * 2);
  }
  for (let i = 0; i < Math.min(2600, (state.w * state.h) / 600); i++) {
    const u = hash('ms' + i, 1),
      [x, y] = band(u),
      gauss = (hash('ms' + i, 2) + hash('ms' + i, 3) + hash('ms' + i, 4) - 1.5) * state.h * 0.14;
    g.fillStyle = `rgba(200,220,255,${0.11 + hash('ms' + i, 5) * 0.3})`;
    g.fillRect(x + (hash('ms' + i, 6) - 0.5) * 20, y + gauss, 0.7, 0.7);
  }
  // Dark lane down the middle of the band, as in the real Milky Way.
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 46; i++) {
    const u = hash('dl' + i, 1),
      [x, y] = band(u),
      yy = y + (hash('dl' + i, 2) - 0.5) * state.h * 0.03,
      r = state.unit * (0.02 + hash('dl' + i, 3) * 0.035);
    const rg = g.createRadialGradient(x, yy, 0, x, yy, r);
    rg.addColorStop(0, 'rgba(0,0,0,.22)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(x - r, yy - r, r * 2, r * 2);
  }
  g.globalCompositeOperation = 'source-over';
  const cx = state.w / 2,
    cy = state.h * 1.25,
    R0 = Math.hypot(state.w, state.h) * 0.45;
  g.strokeStyle = 'rgba(90,170,255,.095)';
  g.lineWidth = 0.7;
  for (let k = 0; k < 9; k++) {
    g.beginPath();
    g.arc(cx, cy, R0 + k * state.unit * 0.11, Math.PI, 2 * Math.PI);
    g.stroke();
  }
  for (let k = -8; k <= 8; k++) {
    const a = -Math.PI / 2 + k * 0.13;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * R0 * 0.55, cy + Math.sin(a) * R0 * 0.55);
    g.lineTo(cx + Math.cos(a) * R0 * 3, cy + Math.sin(a) * R0 * 3);
    g.stroke();
  }
  g.setLineDash([2, 6]);
  g.strokeStyle = 'rgba(255,176,46,.1)';
  g.beginPath();
  g.moveTo(0, state.h * 0.62);
  g.bezierCurveTo(state.w * 0.3, state.h * 0.38, state.w * 0.7, state.h * 0.5, state.w, state.h * 0.28);
  g.stroke();
  g.setLineDash([]);
  g.font = `500 ${Math.max(9, state.unit * 0.011)}px "JetBrains Mono", monospace`;
  g.fillStyle = 'rgba(120,170,230,.28)';
  for (let k = -8; k <= 8; k += 2) {
    const a = -Math.PI / 2 + k * 0.13,
      x = cx + Math.cos(a) * (R0 + state.unit * 0.9),
      y = cy + Math.sin(a) * (R0 + state.unit * 0.9);
    if (x > 8 && x < state.w - 40 && y > 12) g.fillText(`${p2(((k + 8) * 1.5) | 0)}h`, x, y);
  }
  g.fillText('ECLIPTIC', state.w * 0.5 + 12, state.h * 0.455);
  // Fade the graticule where the panels sit (centre) and keep it crisp in the open margins.
  const m = g.createRadialGradient(
    state.w / 2,
    state.h * 0.55,
    Math.min(state.w, state.h) * 0.15,
    state.w / 2,
    state.h * 0.55,
    Math.hypot(state.w, state.h) * 0.62,
  );
  m.addColorStop(0, 'rgba(0,0,0,.26)');
  m.addColorStop(1, 'rgba(0,0,0,1)');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.scale(state.dpr, state.dpr);
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = m;
  g.fillRect(0, 0, state.w, state.h);
  g.globalCompositeOperation = 'source-over';
}
