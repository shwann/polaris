import { COL } from '../../domain/lanes';
import { boundsOf } from '../geometry/cardPlacement';
import { stopCamera } from '../motion/cameraMotion';
import { rgba } from '../palette';
import { clearTooltip } from '../tooltip';
import type { Box, SkyState } from '../types';

export const doneSummary = (count: number, zoom: number) => ({
  text: `已完成 ${count} 项`,
  alpha: Math.max(0, Math.min(1, (2.4 - zoom) / 1)),
});

export function doneBounds(s: SkyState): Box | null {
  const points = [...s.stars.values()]
    .filter((star) => !star.dead && star.group === 'done')
    .map((star) => s.at(star.x, star.y, 14));
  return points.length ? boundsOf(points) : null;
}

export function doneLabel(s: SkyState) {
  const [cx, cy] = s.centre('done'),
    [x, y] = s.toScreen(...s.at(cx, cy, 14));
  const size = Math.max(10, s.unit * 0.0115) * s.sz * s.cam.s;
  const summary = doneSummary(s.laneCount('done'), s.cam.s);
  s.ctx.font = `600 ${size}px "JetBrains Mono", "Noto Sans SC", monospace`;
  const width = s.ctx.measureText(summary.text).width;
  const left = Math.max(12, Math.min(x + 22, s.w - width - 12));
  const top = Math.max(16, Math.min(y - 24, s.h - 100));
  return { ...summary, left, top, size, width };
}

/** Drawn in screen space, with the same font and colour as the other cluster labels. */
export function drawDoneOverview(s: SkyState) {
  if (!s.sky || s.w <= 560 || !s.laneCount('done')) return;
  const label = doneLabel(s);
  s.ctx.save();
  s.ctx.textAlign = 'left';
  s.ctx.fillStyle = rgba(COL.done, label.alpha * 0.95);
  s.ctx.shadowColor = 'rgba(4,10,20,.95)';
  s.ctx.shadowBlur = 5;
  s.ctx.fillText(label.text, label.left, label.top);
  s.ctx.restore();
}

export function hitDoneLabel(s: SkyState, x: number, y: number) {
  if (!s.sky || s.w <= 560 || !s.laneCount('done')) return false;
  const label = doneLabel(s);
  return (
    label.alpha > 0.05 &&
    x >= label.left - 8 &&
    x <= label.left + label.width + 8 &&
    y >= label.top - label.size - 6 &&
    y <= label.top + 8
  );
}

export function hitDone(s: SkyState, x: number, y: number) {
  if (!s.sky || s.w <= 560 || !s.laneCount('done')) return false;
  if (hitDoneLabel(s, x, y)) return true;
  const box = doneBounds(s);
  if (!box) return false;
  const [wx, wy] = s.toWorld(x, y);
  return wx >= box[0] - 12 && wx <= box[2] + 12 && wy >= box[1] - 12 && wy <= box[3] + 12;
}

export function zoomDone(s: SkyState, x: number, y: number) {
  const box = doneBounds(s);
  if (!box || !hitDone(s, x, y)) return false;
  clearTooltip(s);
  stopCamera(s);
  if (s.selected) {
    s.selected = null;
    s.events.onPickStar?.(null);
  }
  const scale = Math.min(
    5,
    Math.max(2.4, Math.min((s.w * 0.6) / Math.max(40, box[2] - box[0]), (s.h * 0.6) / Math.max(40, box[3] - box[1]))),
  );
  Object.assign(s.camT, {
    s: scale,
    x: s.w / 2 - ((box[0] + box[2]) / 2) * scale,
    y: s.h / 2 - ((box[1] + box[3]) / 2) * scale,
  });
  return true;
}
