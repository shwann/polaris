import { COL_APP } from '../../domain/lanes';
import { releaseStars } from '../geometry/figures/aquarius';
import { rgba } from '../palette';
import type { Point, SkyState } from '../types';

/** A separate draw layer keeps release markers out of task selection and soft-body dragging. */
export function drawReleases(s: SkyState) {
  const stars = releaseStars(s);
  if (!stars.length) return;
  const c = s.ctx;
  c.save();
  const points = stars.map((star) => s.at(...star.point, 14));
  const line = (a: Point, b: Point, alpha: number, bright = false) => {
    c.strokeStyle = rgba(COL_APP, alpha * s.skyK);
    c.lineWidth = bright ? 1.5 : 0.7;
    c.setLineDash(bright ? [5 * s.sz, 3 * s.sz] : [2 * s.sz, 4 * s.sz]);
    c.beginPath();
    c.moveTo(...a);
    c.lineTo(...b);
    c.stroke();
  };
  line(s.hubs()[0]!, points[0]!, 0.25);
  for (let i = 1; i < points.length; i++) line(points[i - 1]!, points[i]!, 0.45 + stars[i]!.alpha * 0.35, true);
  stars.forEach((star, i) => {
    const p = points[i]!,
      lit = s.hoverRelease?.release.version === star.release.version;
    for (const satellite of star.satellites) {
      const q = s.at(...satellite, 14);
      line(p, q, star.alpha * 0.25);
      c.fillStyle = rgba(COL_APP, star.alpha * 0.5 * s.skyK);
      c.beginPath();
      c.arc(...q, 1.15 * s.sz, 0, Math.PI * 2);
      c.fill();
    }
    const glow = (lit ? 34 : i === stars.length - 1 ? 28 : 18) * s.sz;
    c.globalAlpha = star.alpha * s.skyK;
    c.drawImage(s.tint(COL_APP), p[0] - glow, p[1] - glow, glow * 2, glow * 2);
    c.globalAlpha = s.skyK;
    c.fillStyle = rgba(COL_APP, star.alpha);
    c.beginPath();
    c.arc(...p, star.radius * s.sz, 0, Math.PI * 2);
    c.fill();
    if (lit) {
      c.setLineDash([]);
      c.lineWidth = 1;
      c.strokeStyle = rgba(COL_APP, 0.9);
      c.beginPath();
      c.arc(...p, (star.radius + 5) * s.sz, 0, Math.PI * 2);
      c.stroke();
    }
    c.font = `500 ${Math.max(12, s.unit * 0.009) * s.sz}px "JetBrains Mono", monospace`;
    c.textAlign = 'right';
    c.fillText(star.release.version, p[0] - 10 * s.sz, p[1] - 12 * s.sz);
  });
  c.fillStyle = rgba(COL_APP, 0.75 * s.skyK);
  c.font = `500 ${Math.max(12, s.unit * 0.01) * s.sz}px "Noto Sans SC", sans-serif`;
  c.textAlign = 'left';
  c.fillText('水瓶 · 发布记录', points[0]![0] + 18 * s.sz, points[0]![1] + 4 * s.sz);
  c.restore();
}
