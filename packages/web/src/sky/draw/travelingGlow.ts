import { rgba } from '../palette';
import type { Color, Point, SkyState } from '../types';

/** Paint a bright front and a fading trail along the live outline. */
export function travelingGlow(
  s: SkyState,
  points: Point[],
  color: Color,
  progress: number,
  { width, trail, opacity }: { width: number; trail: number; opacity: number },
) {
  if (progress <= 0 || progress > 1 || opacity <= 0 || points.length < 2) return;
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]!,
      [px, py] = points[i - 1]!;
    lengths.push(lengths[i - 1]! + Math.hypot(x - px, y - py));
  }
  const total = lengths.at(-1)!;
  if (!total) return;
  const head = total * progress,
    tail = Math.max(0, head - total * trail),
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
    alpha = opacity * s.skyK,
    tip = path.at(-1)!,
    gradient = ctx.createLinearGradient(...path[0]!, ...tip);
  gradient.addColorStop(0, rgba(color, 0));
  gradient.addColorStop(0.65, rgba(color, 0.5 * alpha));
  gradient.addColorStop(1, rgba(color, alpha));
  ctx.save();
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
  ctx.strokeStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(...path[0]!);
  for (const point of path.slice(1)) ctx.lineTo(...point);
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = width * 2.7;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.globalAlpha = 0.85 * alpha;
  const glow = width * 5 * s.sz;
  ctx.drawImage(s.tint(color), tip[0] - glow, tip[1] - glow, glow * 2, glow * 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = rgba([240, 253, 255], alpha);
  ctx.beginPath();
  ctx.arc(...tip, width * 0.55 * s.sz, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
