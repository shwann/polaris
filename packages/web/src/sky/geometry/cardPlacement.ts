import type { Box, Point } from '../types';
import { intersects } from '../draw/labelObstacles';

export type CardSide = 'left' | 'right' | 'top' | 'bottom';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

/** Choose free screen area outside the cluster, then translate the star/card pair into view. */
function baseCard(star: Point, cluster: Box, size: Point, viewport: Point, preferred?: CardSide) {
  const [w, h] = viewport,
    [cw, ch] = size,
    [x, y] = star,
    margin = 16,
    gap = 26;
  const room = {
    left: Math.max(0, cluster[0] - gap - margin),
    right: Math.max(0, w - margin - cluster[2] - gap),
    top: Math.max(0, cluster[1] - gap - margin),
    bottom: Math.max(0, h - margin - cluster[3] - gap),
  };
  const sides: CardSide[] = ['right', 'left', 'bottom', 'top'];
  const score = (side: CardSide) => {
    const horizontal = side === 'left' || side === 'right';
    return (room[side] >= (horizontal ? cw : ch) ? w * h : 0) + room[side] * (horizontal ? h : w);
  };
  const side = preferred ?? sides.sort((a, b) => score(b) - score(a))[0]!;
  let left = clamp(x - cw / 2, margin, w - margin - cw),
    top = clamp(y - ch / 2, margin, h - margin - ch);
  // A huge cluster may exceed the viewport; keep the chosen star and card together in that case.
  if (side === 'right') left = Math.min(cluster[2] + gap, x + w - cw - margin * 2 - gap);
  if (side === 'left') left = Math.max(cluster[0] - gap - cw, x - w + margin * 2 + gap);
  if (side === 'bottom') top = Math.min(cluster[3] + gap, y + h - ch - margin * 2 - gap);
  if (side === 'top') top = Math.max(cluster[1] - gap - ch, y - h + margin * 2 + gap);
  const dx = clamp(0, margin - Math.min(x - gap, left), w - margin - Math.max(x + gap, left + cw));
  const dy = clamp(0, margin - Math.min(y - gap, top), h - margin - Math.max(y + gap, top + ch));
  return { side, left: left + dx, top: top + dy, pan: [dx, dy] as Point };
}

/** Try both sides and slides along each edge before asking the camera to translate the chart. */
export function placeCard(
  star: Point,
  cluster: Box,
  size: Point,
  viewport: Point,
  preferred?: CardSide,
  obstacles: Box[] = [],
) {
  const original = baseCard(star, cluster, size, viewport, preferred);
  if (!obstacles.length) return original;
  const [cw, ch] = size,
    [w, h] = viewport;
  const evaluate = (p: ReturnType<typeof baseCard>) => {
    const box: Box = [p.left, p.top, p.left + cw, p.top + ch];
    return obstacles.reduce((area, b) => {
      const shifted: Box = [b[0] + p.pan[0], b[1] + p.pan[1], b[2] + p.pan[0], b[3] + p.pan[1]];
      return (
        area +
        (intersects(box, shifted)
          ? (Math.min(box[2], shifted[2]) - Math.max(box[0], shifted[0])) *
            (Math.min(box[3], shifted[3]) - Math.max(box[1], shifted[1]))
          : 0)
      );
    }, 0);
  };
  if (evaluate(original) === 0 && Math.hypot(...original.pan) === 0) return original;
  const candidates = [original];
  for (const side of ['right', 'left', 'bottom', 'top'] as CardSide[]) {
    const p = baseCard(star, cluster, size, viewport, side),
      horizontal = side === 'right' || side === 'left';
    const slides = [
      horizontal ? p.top - p.pan[1] : p.left - p.pan[0],
      ...obstacles.flatMap((b) => (horizontal ? [b[1] - ch - 8, b[3] + 8] : [b[0] - cw - 8, b[2] + 8])),
    ];
    for (const slide of slides) {
      const left = horizontal ? p.left - p.pan[0] : slide,
        top = horizontal ? slide : p.top - p.pan[1],
        dx = clamp(0, 16 - Math.min(star[0] - 26, left), w - 16 - Math.max(star[0] + 26, left + cw)),
        dy = clamp(0, 16 - Math.min(star[1] - 26, top), h - 16 - Math.max(star[1] + 26, top + ch));
      candidates.push({ side, left: left + dx, top: top + dy, pan: [dx, dy] });
    }
  }
  // A tall overview near Polaris may fit only farther along an edge, away from the selected hub.
  const xs = [16, w - 16 - cw, original.left, ...obstacles.flatMap((b) => [b[0] - cw - 8, b[2] + 8])];
  const ys = [16, h - 16 - ch, original.top, ...obstacles.flatMap((b) => [b[1] - ch - 8, b[3] + 8])];
  for (const left of xs)
    for (const top of ys) {
      if (left < 16 || left + cw > w - 16 || top < 16 || top + ch > h - 16) continue;
      if (
        intersects(
          [left, top, left + cw, top + ch],
          [cluster[0] - 26, cluster[1] - 26, cluster[2] + 26, cluster[3] + 26],
        )
      )
        continue;
      if (star[0] >= left - 26 && star[0] <= left + cw + 26 && star[1] >= top - 26 && star[1] <= top + ch + 26)
        continue;
      const side: CardSide =
        left + cw <= star[0] ? 'left' : left >= star[0] ? 'right' : top >= star[1] ? 'bottom' : 'top';
      candidates.push({ side, left, top, pan: [0, 0] });
    }
  candidates.sort(
    (a, b) =>
      evaluate(a) - evaluate(b) ||
      Math.hypot(...a.pan) - Math.hypot(...b.pan) ||
      Math.hypot(a.left - original.left, a.top - original.top) -
        Math.hypot(b.left - original.left, b.top - original.top),
  );
  return candidates[0]!;
}

export function boundsOf(points: Point[]): Box {
  return [
    Math.min(...points.map((p) => p[0])),
    Math.min(...points.map((p) => p[1])),
    Math.max(...points.map((p) => p[0])),
    Math.max(...points.map((p) => p[1])),
  ];
}
