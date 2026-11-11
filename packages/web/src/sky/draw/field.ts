import { hash } from '../palette';
import type { SkyState } from '../types';

/** Build a toroidal tile once per resize. Every edge-crossing primitive wraps. */
export function drawChart(s: SkyState) {
  const tile = document.createElement('canvas');
  tile.width = Math.round(s.w * s.dpr);
  tile.height = Math.round(s.h * s.dpr);
  const g = tile.getContext('2d')!;
  g.scale(tile.width / s.w, tile.height / s.h);
  const wrap = (x: number, y: number, r: number, draw: (x: number, y: number) => void) => {
    for (const dx of [-s.w, 0, s.w])
      for (const dy of [-s.h, 0, s.h])
        if (x + dx + r >= 0 && x + dx - r <= s.w && y + dy + r >= 0 && y + dy - r <= s.h) draw(x + dx, y + dy);
  };
  // A periodic Milky Way band has identical height and slope on both vertical edges.
  const band = (u: number) => s.h * (0.56 + 0.24 * Math.cos(u * Math.PI * 2 + 0.8));
  for (let i = 0; i < 90; i++) {
    const u = hash('mw' + i, 1),
      x = u * s.w,
      y = band(u) + (hash('mw' + i, 2) - 0.5) * s.h * 0.2,
      r = s.unit * (0.06 + hash('mw' + i, 3) * 0.12),
      hue = hash('mw' + i, 4),
      col = hue < 0.55 ? '120,170,255' : hue < 0.85 ? '170,130,255' : '255,200,150';
    wrap(x, y, r, (cx, cy) => {
      const gradient = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, `rgba(${col},${0.045 + hash('mw' + i, 5) * 0.05})`);
      gradient.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gradient;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
    });
  }
  for (let i = 0; i < Math.min(2600, (s.w * s.h) / 600); i++) {
    const u = hash('ms' + i, 1),
      x = u * s.w,
      y = band(u) + (hash('ms' + i, 2) + hash('ms' + i, 3) + hash('ms' + i, 4) - 1.5) * s.h * 0.14;
    g.fillStyle = `rgba(200,220,255,${0.11 + hash('ms' + i, 5) * 0.3})`;
    wrap(x, y, 1, (cx, cy) => g.fillRect(cx, cy, 0.7, 0.7));
  }
  // Smooth periodic graticules cross tile boundaries without clipped arcs or text.
  g.strokeStyle = 'rgba(90,170,255,.095)';
  g.lineWidth = 0.7;
  for (let k = 0; k < 9; k++) {
    const yy = (k * s.h) / 9;
    for (const off of [-s.h, 0, s.h]) {
      g.beginPath();
      for (let i = 0; i <= 100; i++) {
        const x = (i * s.w) / 100,
          y = yy + off + Math.sin((i * Math.PI) / 50) * s.h * 0.06;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
    }
  }
  s.chart = tile;
  s.chartPattern = s.ctx.createPattern(tile, 'repeat');
}
