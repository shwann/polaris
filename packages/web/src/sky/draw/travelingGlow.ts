import { rgba } from '../palette';
import type { Color, Point, SkyState } from '../types';

/** Paint a short pulse along the live outline, with a quiet interval between passes. */
export function travelingGlow(
  s: SkyState,
  points: Point[],
  color: Color,
  time: number,
  period: number,
  travel: number,
) {
  const progress = (time % period) / travel;
  if (progress <= 0 || progress >= 1 || points.length < 2) return;
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]!,
      [px, py] = points[i - 1]!;
    lengths.push(lengths[i - 1]! + Math.hypot(x - px, y - py));
  }
  const total = lengths.at(-1)!;
  if (!total) return;
  const head = total * progress,
    tail = Math.max(0, head - Math.min(total * 0.25, 32 * s.sz)),
    path: Point[] = [];
  for (let i = 1; i < points.length; i++) {
    const start = lengths[i - 1]!,
      end = lengths[i]!;
    if (end <= tail || end <= start) continue;
    if (start >= head) break;
    const [x, y] = points[i - 1]!,
      [nx, ny] = points[i]!;
    const at = (distance: number): Point => {
      const k = (distance - start) / (end - start);
      return [x + k * (nx - x), y + k * (ny - y)];
    };
    if (!path.length) path.push(at(Math.max(start, tail)));
    path.push(at(Math.min(end, head)));
  }
  if (path.length < 2) return;
  const ctx = s.ctx,
    alpha = Math.sin(Math.PI * progress) * s.skyK,
    gradient = ctx.createLinearGradient(...path[0]!, ...path.at(-1)!);
  gradient.addColorStop(0, rgba(color, 0));
  gradient.addColorStop(1, rgba(color, 0.9 * alpha));
  ctx.save();
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(...path[0]!);
  for (const point of path.slice(1)) ctx.lineTo(...point);
  ctx.stroke();
  ctx.restore();
}
