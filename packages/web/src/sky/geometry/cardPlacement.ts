import type { Box, Point } from '../types';

export type CardSide = 'left' | 'right' | 'top' | 'bottom';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

/** Choose free screen area outside the cluster, then translate the star/card pair into view. */
export function placeCard(star: Point, cluster: Box, size: Point, viewport: Point, preferred?: CardSide) {
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

export function boundsOf(points: Point[]): Box {
  return [
    Math.min(...points.map((p) => p[0])),
    Math.min(...points.map((p) => p[1])),
    Math.max(...points.map((p) => p[0])),
    Math.max(...points.map((p) => p[1])),
  ];
}
