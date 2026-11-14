import { COL_APP } from '../../domain/lanes';
import { aquariusAt, releaseFigure } from '../geometry/figures/aquarius';
import { highlightedDeliveries } from '../geometry/figures/aquariusLayout';
import { rgba } from '../palette';
import type { Point, SkyState } from '../types';

/** The urn, deliveries and water share one rigid translation outside the task layer. */
export function drawReleases(s: SkyState) {
  if (!s.sky || (!s.releases.length && !s.deliveries?.length)) return;
  const f = releaseFigure(s),
    c = s.ctx,
    at = (p: Point) => aquariusAt(s, p);
  const compact = s.h > s.w * 1.15 && s.w <= 560;
  c.save();
  const stroke = (alpha: number, width: number, dash: number[]) => {
    c.strokeStyle = rgba(COL_APP, alpha * s.skyK);
    c.lineWidth = width;
    c.setLineDash(dash.map((n) => n * s.sz));
    c.beginPath();
  };
  const path = (points: Point[], close = false) => {
    points.forEach((p, i) => (i ? c.lineTo(...at(p)) : c.moveTo(...at(p))));
    if (close) c.closePath();
    c.stroke();
  };
  const dot = (p: Point, r: number, alpha: number) => {
    c.fillStyle = rgba(COL_APP, alpha * s.skyK);
    c.beginPath();
    c.arc(...at(p), r * s.sz * (compact ? 0.75 : 1), 0, Math.PI * 2);
    c.fill();
  };
  stroke(0.22, 0.7, [2, 4]);
  c.moveTo(...s.hubs()[0]!);
  c.lineTo(...at(f.lip));
  c.stroke();
  stroke(0.13, 0.6, [2, 3]);
  for (const t of f.triangles) {
    const points = t.map((i) => f.points[i]!);
    c.moveTo(...at(points[0]!));
    c.lineTo(...at(points[1]!));
    c.lineTo(...at(points[2]!));
    c.closePath();
  }
  c.stroke();
  stroke(0.95, 1.8, [5, 3]);
  path(f.rim, true);
  for (const [a, b, d] of f.rings) {
    stroke(0.6, 1.1, [5, 3]);
    c.moveTo(...at(a!));
    c.quadraticCurveTo(...at(b!), ...at(d!));
    c.stroke();
  }
  for (const [a, b, d] of f.handles) {
    stroke(0.85, 1.5, [5, 3]);
    c.moveTo(...at(a!));
    c.bezierCurveTo(...at(b!), ...at(b!), ...at(d!));
    c.stroke();
  }
  f.rim.forEach((p) => dot(p, 1.9, 0.9));
  f.inner.forEach((p) => dot(p.point, 1.4, 0.4));
  for (const wave of f.waves) {
    stroke(0.9, 1.5, [5, 4]);
    path(wave);
    stroke(0.75, 1, []);
    path([f.lip, wave[0]!]);
  }
  [
    [26, 6],
    [44, 10],
    [62, 14],
  ].forEach(([rx, ry], i) => {
    stroke(0.6 - i * 0.15, 1, [3, 3]);
    c.ellipse(...at(f.surface), rx! * f.scale, ry! * f.scale, 0, 0, Math.PI * 2);
    c.stroke();
  });
  if (s.hoverRelease)
    for (const p of highlightedDeliveries(f, s.hoverRelease.release)) {
      stroke(0.2, 0.7, [2, 4]);
      path([p.point, s.hoverRelease.point]);
      dot(p.point, 2.7, 1);
    }
  for (const star of f.stars) {
    const p = at(star.point),
      lit = s.hoverRelease?.release.version === star.release.version;
    const glow = (lit ? 28 : star.wave === null ? 24 : 12) * s.sz;
    c.globalAlpha = star.alpha * s.skyK;
    c.drawImage(s.tint(COL_APP), p[0] - glow, p[1] - glow, glow * 2, glow * 2);
    c.globalAlpha = 1;
    dot(star.point, star.radius, star.alpha);
    if (lit) {
      stroke(0.9, 1, []);
      c.arc(...p, (star.radius + 5) * s.sz, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = rgba(COL_APP, (lit || star.wave === null ? 1 : 0.7) * s.skyK);
    c.font = `500 ${12 * s.sz}px "JetBrains Mono", monospace`;
    c.textAlign = star.side > 0 ? 'left' : 'right';
    if (!compact || s.cam.s >= 1.8 || lit || star.wave === null)
      c.fillText(star.release.version, p[0] + star.side * 9 * s.sz, p[1] + 4 * s.sz);
  }
  c.fillStyle = rgba(COL_APP, 0.75 * s.skyK);
  c.font = `500 ${12 * s.sz}px "Noto Sans SC", sans-serif`;
  c.textAlign = 'center';
  const centre = f.transform([0.5, 0.5]);
  const caption = at(compact ? [s.w * 0.56, f.surface[1] + 28] : [centre[0], centre[1] + 150 * f.scale]);
  c.fillText(`水瓶 ♒︎ · 发布记录${f.omitted ? ` · ${f.omitted} 项未绘制` : ''}`, ...caption);
  c.restore();
}
