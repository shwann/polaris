import { COL_APP } from '../../domain/lanes';
import { highlightedItems, jarOutline, releaseStars } from '../geometry/figures/aquarius';
import { aquariusFrame } from '../geometry/figures/aquariusJar';
import { rgba } from '../palette';
import type { Point, SkyState } from '../types';

/** Sample a smooth centreline before offsetting its normals into two parallel banks. */
export function waterBanks(points: Point[], width: number): [Point[], Point[]] {
  const samples: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)]!,
      b = points[i]!,
      c = points[i + 1]!,
      d = points[Math.min(points.length - 1, i + 2)]!;
    for (let j = 0; j < 16; j++) {
      const t = j / 16;
      samples.push(
        [0, 1].map(
          (k) =>
            0.5 *
            (2 * b[k]! +
              (-a[k]! + c[k]!) * t +
              (2 * a[k]! - 5 * b[k]! + 4 * c[k]! - d[k]!) * t * t +
              (-a[k]! + 3 * b[k]! - 3 * c[k]! + d[k]!) * t * t * t),
        ) as Point,
      );
    }
  }
  if (points.length) samples.push(points.at(-1)!);
  return [-1, 1].map((side) =>
    samples.map((p, i): Point => {
      const a = samples[Math.max(0, i - 1)]!,
        b = samples[Math.min(samples.length - 1, i + 1)]!,
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        length = Math.hypot(dx, dy) || 1;
      return [p[0] - (dy / length) * width * side, p[1] + (dx / length) * width * side];
    }),
  ) as [Point[], Point[]];
}

/** Alternate labels along the local normal, including across almost horizontal bends. */
export function releaseCaption(points: Point[], i: number, scale: number) {
  const p = points[i]!,
    a = points[Math.max(0, i - 1)]!,
    b = points[Math.min(points.length - 1, i + 1)]!;
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    length = Math.hypot(dx, dy) || 1;
  const side = i >= points.length - 2 ? 1 : i % 2 ? -1 : 1;
  const nx = (-dy / length) * side,
    ny = (dx / length) * side;
  return {
    point: [p[0] + nx * 17 * scale, p[1] + ny * 17 * scale + 4 * scale] as Point,
    align: nx > 0 ? ('left' as const) : ('right' as const),
  };
}

/** Every painted star represents a release or a delivered item; all paths follow the live pose. */
export function drawReleases(s: SkyState) {
  const stars = releaseStars(s),
    body = s.aquarius;
  if (!stars.length || !body) return;
  const c = s.ctx,
    jar = body.jar,
    lit = highlightedItems(s),
    hovering = !!s.hoverRelease;
  c.save();
  c.lineCap = 'round';
  const path = (points: Point[], alpha: number, bright = false, close = false) => {
    if (!points.length) return;
    c.strokeStyle = rgba(COL_APP, alpha * s.skyK);
    c.lineWidth = bright ? 1.35 : 0.8;
    c.setLineDash(bright ? [4 * s.sz, 3 * s.sz] : [2 * s.sz, 3 * s.sz]);
    c.beginPath();
    c.moveTo(...points[0]!);
    for (const p of points.slice(1)) c.lineTo(...p);
    if (close) c.closePath();
    c.stroke();
  };
  const at = (p: Point) => s.at(...p, 14);
  const mouth = jar.nodes[jar.mouth]?.point ?? jar.poly[1]!;
  path([s.hubs()[0]!, at(mouth)], 0.2);
  for (const edge of jar.edges) {
    if (edge.bright) continue;
    const a = jar.nodes[edge.a]!,
      b = jar.nodes[edge.b]!;
    path([at(a.point), at(b.point)], hovering ? (lit.has(a.id) && lit.has(b.id) ? 0.65 : 0.09) : 0.32);
  }
  path(jarOutline(body).map(at), hovering ? 0.45 : 0.9, true, true);
  path([at(mouth), at(stars[0]!.point)], 0.5);
  const points = stars.map((star) => at(star.point));
  for (const bank of waterBanks([at(mouth), ...points], Math.max(5, aquariusFrame(s.w, s.h).w * 0.018)))
    path(bank, 0.78, true);
  const last = points.at(-1)!;
  c.setLineDash([3 * s.sz, 4 * s.sz]);
  for (const fraction of [0.06, 0.1, 0.14]) {
    const radius = aquariusFrame(s.w, s.h).w * fraction;
    c.strokeStyle = rgba(COL_APP, (0.5 - fraction * 1.8) * s.skyK);
    c.lineWidth = 0.8;
    c.beginPath();
    c.ellipse(...last, radius, radius * 0.23, 0, 0, Math.PI * 2);
    c.stroke();
  }
  const dot = (p: Point, radius: number, alpha: number, glow: number) => {
    if (glow) {
      c.globalAlpha = alpha * s.skyK;
      c.drawImage(s.tint(COL_APP), p[0] - glow, p[1] - glow, glow * 2, glow * 2);
    }
    c.globalAlpha = s.skyK;
    c.fillStyle = rgba(COL_APP, alpha);
    c.beginPath();
    c.arc(...p, radius * s.sz, 0, Math.PI * 2);
    c.fill();
  };
  for (const node of jar.nodes) {
    const on = lit.has(node.id),
      hovered = s.hoverItem?.id === node.id;
    dot(
      at(node.point),
      on || hovered ? 2.7 : node.bright ? 1.8 : 1.15,
      hovering ? (on ? 1 : 0.13) : hovered ? 1 : node.bright ? 0.95 : 0.38,
      on || hovered ? 15 * s.sz : 0,
    );
  }
  stars.forEach((star, i) => {
    const p = points[i]!,
      on = s.hoverRelease?.release.version === star.release.version;
    dot(p, star.radius, star.alpha * (hovering && !on ? 0.35 : 1), (on ? 34 : i === stars.length - 1 ? 28 : 18) * s.sz);
    if (on) {
      c.setLineDash([]);
      c.lineWidth = 1;
      c.strokeStyle = rgba(COL_APP, 0.9);
      c.beginPath();
      c.arc(...p, (star.radius + 5) * s.sz, 0, Math.PI * 2);
      c.stroke();
    }
    c.font = `500 ${Math.max(12, s.unit * 0.009) * s.sz}px "JetBrains Mono", monospace`;
    const caption = releaseCaption(points, i, s.sz);
    c.textAlign = caption.align;
    c.fillText(star.release.version, ...caption.point);
  });
  const frame = aquariusFrame(s.w, s.h);
  c.fillStyle = rgba(COL_APP, 0.8 * s.skyK);
  c.font = `500 ${Math.max(12, s.unit * 0.01) * s.sz}px "Noto Sans SC", sans-serif`;
  c.textAlign = 'center';
  c.fillText('水瓶 ♒︎ · 发布记录', ...at([frame.x + frame.w * 0.24, frame.y + frame.h + 23 * s.sz]));
  c.restore();
}
