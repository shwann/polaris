import { COL_APP } from '../../domain/lanes';
import { highlightedItems, type AquariusBody } from '../geometry/figures/aquarius';
import { SPIN_STOP } from '../geometry/clusters';
import { returnProgress } from '../motion/returnTiming';
import type { Particle } from '../motion/softbody';
import { rgba } from '../palette';
import type { Point, SkyState } from '../types';
import { aquariusLabelZoom } from './aquariusLabels';
import { travelingGlow } from './travelingGlow';
import { dropCaption } from './releasePaths';
import { aquariusFrame } from '../geometry/figures/aquariusJar';
import { waterImpact } from './waterImpact';

export const AQUARIUS_TITLE = '水瓶 ♒︎ · 发布记录';

/** Live polylines of the drops style; the painter and the label obstacles share them. */
export function dropPaths(s: SkyState, body: AquariusBody) {
  const d = body.drops!,
    at = (p: Point) => s.at(...p, 14),
    stars = body.stars.map((n) => at(n.point)),
    nodes = body.jar.nodes.map((n) => at(n.point)),
    n = stars.length;
  const exit = (i: number) => nodes[d.far[i]!] ?? stars[i]!;
  const link: Point[] = n ? [s.hubs()[0]!, stars[0]!] : [];
  // Oldest to newest: each link leaves a drop at its lowest corner and reaches the next release star.
  const chain: { points: Point[] }[] = [];
  for (let i = 0; i < n - 1; i++) chain.push({ points: [exit(i), stars[i + 1]!] });
  const outlines = d.members.map((ids, i) => {
    const tip = stars[i]!,
      points = ids.map((id) => nodes[id]!);
    return {
      version: body.stars[i]!.release.version,
      points: points.length > 1 ? [tip, ...points, tip] : points.length ? [tip, points[0]!] : [],
    };
  });
  const flow = link.concat(
    chain.flatMap((segment) => segment.points),
    n ? [exit(n - 1)] : [],
  );
  return { link, chain, outlines, flow, stars, nodes };
}

/** Every painted star is a release or a delivered item; the drop outlines follow the live pose. */
export function drawDrops(s: SkyState, body: AquariusBody) {
  const c = s.ctx,
    lit = highlightedItems(s),
    version = s.selectedRelease || s.hoverRelease?.release.version || '',
    hovering = !!version,
    { link, chain, outlines, flow, stars, nodes } = dropPaths(s, body);
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const path = (points: Point[], alpha: number, width: number, dash: [number, number]) => {
    if (points.length < 2) return;
    c.strokeStyle = rgba(COL_APP, alpha * s.skyK);
    c.lineWidth = width;
    c.setLineDash([dash[0] * s.sz, dash[1] * s.sz]);
    c.beginPath();
    c.moveTo(...points[0]!);
    for (const p of points.slice(1)) c.lineTo(...p);
    c.stroke();
  };
  path(link, hovering ? 0.14 : 0.24, 0.9, [2, 4]);
  for (const segment of chain) path(segment.points, hovering ? 0.18 : 0.56, 1.15, [4, 3]);
  for (const outline of outlines) {
    const on = outline.version === version;
    path(outline.points, hovering ? (on ? 0.85 : 0.13) : 0.4, on ? 1.2 : 0.85, [2.5, 2.5]);
  }
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
    if (phase > 0 && phase < pour)
      travelingGlow(s, flow, COL_APP, phase / pour, { width: 2.6, trail: 0.3, opacity: Math.min(0.8, phase / 550) });
    const [x, y] = flow.at(-1)!;
    waterImpact(s, [x, y + 60 * s.sz], phase - pour, aquariusFrame(s.w, s.h).w * 0.16, 900);
  }
  const returning = body.returning;
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
  body.jar.nodes.forEach((node, i) => {
    const on = lit.has(node.id),
      hovered = s.hoverItem?.id === node.id || (!!s.deliveryVersion && s.selected === node.id),
      glow = returnGlow(node.particle);
    dot(
      nodes[i]!,
      (on || hovered ? 2.4 : 1.6) + glow * 0.7,
      Math.max(glow * 0.85, hovering ? (on || hovered ? 1 : 0.13) : hovered ? 1 : 0.72),
      (on || hovered ? 12 : 12 * glow) * s.sz,
    );
  });
  const captions = !aquariusLabelZoom(s);
  c.font = `500 ${Math.max(12, s.unit * 0.009) * s.sz}px "JetBrains Mono", monospace`;
  body.stars.forEach((star, i) => {
    const p = stars[i]!,
      on = star.release.version === version,
      glow = returnGlow(star.particle),
      folded = i < body.drops!.folded;
    dot(
      p,
      star.radius + glow,
      Math.max(glow * 0.95, star.alpha * (hovering && !on ? 0.35 : 1)),
      folded ? 0 : ((on ? 30 : i === stars.length - 1 ? 28 : 16) + 10 * glow) * s.sz,
    );
    if (on) {
      c.setLineDash([]);
      c.lineWidth = 1;
      c.strokeStyle = rgba(COL_APP, 0.9);
      c.beginPath();
      c.arc(...p, (star.radius + 5) * s.sz, 0, Math.PI * 2);
      c.stroke();
    }
    if (!captions || folded) return;
    const caption = dropCaption(body, stars, i, s.sz);
    c.fillStyle = rgba(COL_APP, (hovering ? (on ? 1 : 0.3) : 0.75) * s.skyK);
    c.textAlign = caption.align;
    c.fillText(star.release.version, ...caption.point);
  });
  const d = body.drops!;
  c.textAlign = d.caption.align;
  c.fillStyle = rgba(COL_APP, 0.8 * s.skyK);
  c.font = `500 ${Math.max(12, s.unit * 0.01) * s.sz}px "Noto Sans SC", sans-serif`;
  c.fillText(AQUARIUS_TITLE, ...s.at(...d.caption.point, 14));
  if (d.note && captions) {
    c.textAlign = 'right';
    c.fillStyle = rgba(COL_APP, 0.55 * s.skyK);
    c.font = `${Math.max(11, s.unit * 0.008) * s.sz}px "Noto Sans SC", sans-serif`;
    c.fillText(`更早 ${d.folded} 版 · ${d.foldedItems} 项`, ...s.at(...d.note, 14));
  }
  c.restore();
}
