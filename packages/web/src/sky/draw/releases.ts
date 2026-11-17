import { COL_APP } from '../../domain/lanes';
import { highlightedItems, jarOutline, releaseStars } from '../geometry/figures/aquarius';
import { aquariusFrame } from '../geometry/figures/aquariusJar';
import { rgba } from '../palette';
import type { Point, SkyState } from '../types';
import { aquariusLabelZoom } from './aquariusLabels';
import { RETURN_SPLASH } from '../motion/aquarius';
import { returnProgress } from '../motion/returnTiming';
import type { Particle } from '../motion/softbody';
import { travelingGlow } from './travelingGlow';
import { SPIN_STOP } from '../geometry/clusters';
import { waterImpact } from './waterImpact';
import { drawDrops } from './aquariusDrops';

import { releaseCaption, waterBanks } from './releasePaths';
export { releaseCaption, waterBanks } from './releasePaths';

/** Every painted star represents a release or a delivered item; all paths follow the live pose. */
export function drawReleases(s: SkyState) {
  const stars = releaseStars(s),
    body = s.aquarius;
  if (!stars.length || !body) return;
  if (body.drops) return drawDrops(s, body);
  const c = s.ctx,
    jar = body.jar,
    lit = highlightedItems(s),
    hovering = !!(s.selectedRelease || s.hoverRelease);
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
  const mouth = jar.nodes[jar.mouth]?.point ?? stars[0]!.point;
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
  const frame = aquariusFrame(s.w, s.h);
  const last = points.at(-1)!;
  const [leftBank, rightBank] = waterBanks([at(mouth), ...points], Math.max(5, frame.w * 0.018));
  path(leftBank, 0.78, true);
  path(rightBank, 0.78, true);
  if (
    !s.reduce.matches &&
    !s.drag &&
    !body.returning &&
    !hovering &&
    !s.hoverItem &&
    !s.deliveryVersion &&
    s.cam.s < SPIN_STOP
  ) {
    const phase = (s.aquariusFlowT ?? 0) % 9000,
      pour = 4800;
    if (phase > 0 && phase < pour) {
      const flow = leftBank.map(([x, y], i): Point => [(x + rightBank[i]![0]) / 2, (y + rightBank[i]![1]) / 2]);
      travelingGlow(s, flow, COL_APP, phase / pour, { width: 3.2, trail: 0.43, opacity: Math.min(0.95, phase / 550) });
    }
    waterImpact(s, last, phase - pour, frame.w * 0.19);
  }
  c.setLineDash([3 * s.sz, 4 * s.sz]);
  for (const fraction of [0.06, 0.1, 0.14]) {
    const radius = frame.w * fraction;
    c.strokeStyle = rgba(COL_APP, (0.5 - fraction * 1.8) * s.skyK);
    c.lineWidth = 0.8;
    c.beginPath();
    c.ellipse(...last, radius, radius * 0.23, 0, 0, Math.PI * 2);
    c.stroke();
  }
  const returning = body.returning;
  if (returning) {
    const k = (returning.elapsed - returning.end) / RETURN_SPLASH;
    if (k > 0 && k < 1) {
      const radius = (8 + 48 * k) * s.sz;
      c.setLineDash([]);
      c.strokeStyle = rgba(COL_APP, 0.72 * (1 - k) * s.skyK);
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(...last, radius, radius * 0.28, 0, 0, Math.PI * 2);
      c.stroke();
    }
  }
  const returnGlow = (p: Particle) => {
    const step = returning?.steps.get(p);
    if (!returning || !step) return 0;
    const k = returnProgress(returning.elapsed, step.timing);
    return k > 0 && k < 1 ? Math.sin(Math.PI * k) ** 2 : 0;
  };
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
      hovered = s.hoverItem?.id === node.id || (!!s.deliveryVersion && s.selected === node.id),
      glow = returnGlow(node.particle);
    dot(
      at(node.point),
      (on || hovered ? 2.7 : node.bright ? 1.8 : 1.15) + glow * 0.7,
      Math.max(glow * 0.85, hovering ? (on || hovered ? 1 : 0.13) : hovered ? 1 : node.bright ? 0.95 : 0.38),
      (on || hovered ? 15 : 12 * glow) * s.sz,
    );
  }
  stars.forEach((star, i) => {
    const p = points[i]!,
      on = (s.selectedRelease || s.hoverRelease?.release.version) === star.release.version,
      glow = returnGlow(star.particle);
    dot(
      p,
      star.radius + glow,
      Math.max(glow * 0.95, star.alpha * (hovering && !on ? 0.35 : 1)),
      ((on ? 34 : i === stars.length - 1 ? 28 : 18) + 10 * glow) * s.sz,
    );
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
    if (!aquariusLabelZoom(s)) c.fillText(star.release.version, ...caption.point);
  });
  c.fillStyle = rgba(COL_APP, 0.8 * s.skyK);
  c.font = `500 ${Math.max(12, s.unit * 0.01) * s.sz}px "Noto Sans SC", sans-serif`;
  c.textAlign = 'center';
  c.fillText('水瓶 ♒︎ · 发布记录', ...at([frame.x + frame.w * 0.24, frame.y + frame.h + 23 * s.sz]));
  c.restore();
}
