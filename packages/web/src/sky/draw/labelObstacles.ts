import { MAG } from '../../domain/lanes';
import type { Box, Point, SkyState, Star } from '../types';

export interface Halo {
  id: string;
  point: Point;
  radius: number;
}
export const intersects = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
export function hitsHalo(box: Box, { point: [x, y], radius }: Halo) {
  const dx = x - Math.max(box[0], Math.min(x, box[2])),
    dy = y - Math.max(box[1], Math.min(y, box[3]));
  return dx * dx + dy * dy < radius * radius;
}
export function labelFits(box: Box, boxes: Box[], halos: Halo[]) {
  return !boxes.some((b) => intersects(box, b)) && !halos.some((h) => hitsHalo(box, h));
}
export function haloRadius(s: SkyState, star: Star, t: number) {
  const held = s.drag?.star === star,
    r = (MAG[star.group] || 1.7) * s.sz * (held ? 1.25 : 1),
    throb = star.late ? 0.5 + 0.5 * Math.sin(t / 420 + star.ph) : 0;
  return r * (5.5 + throb * 5 + star.flare * 10 + (held ? 7 : s.hover === star ? 4 : 0));
}
/** Labels avoid the bright inner part of a halo; the soft outer fade may sit under text. */
export const HALO_KEEP = 0.5;
export function labelObstacles(s: SkyState, t = s.last) {
  const bar = s.registry.get('skybar');
  return {
    boxes:
      bar && bar.width > 0 && bar.height > 0
        ? [[...s.toWorld(bar.left, bar.top), ...s.toWorld(bar.right, bar.bottom)] as Box]
        : [],
    halos: [...s.stars.values()]
      .filter((p) => !p.dead && p.alpha > 0.02)
      .map((p) => ({
        id: p.id,
        point: s.at(p.x, p.y, 14),
        radius: haloRadius(s, p, t) * HALO_KEEP,
      })),
  };
}
/** One alpha controls fill, outline and shadow together, including fully hidden labels. */
export function outlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  alpha = 1,
  width?: number,
) {
  if (alpha <= 0 || ctx.globalAlpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = 'rgba(4,10,20,.98)';
  ctx.lineWidth = 3 * scale;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y, width);
  ctx.fillText(text, x, y, width);
  ctx.restore();
}
