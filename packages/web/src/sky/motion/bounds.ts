import type { Box, Point } from '../types';

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Pan range that lets any part of the chart reach the middle of the screen while never losing it entirely:
 * the far edge of the content may travel in until it sits KEEP of the viewport from the opposite side.
 */
export const KEEP = 0.38;
export const CONTENT_MARGIN = 24;
export function panBounds(
  points: Point[],
  width: number,
  height: number,
  scale: number,
  compact = true,
  bottomInset = 0,
): Box {
  if (!points.length) return [0, 0, 0, 0];
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const x0 = width * KEEP - Math.max(...xs) * scale,
    x1 = width * (1 - KEEP) - Math.min(...xs) * scale,
    y0 = height * KEEP - Math.max(...ys) * scale,
    y1 = height * (1 - KEEP) - Math.min(...ys) * scale;
  const axis = (lo: number, hi: number, viewport: number, a: number, b: number, inset = 0): Point => {
    if (!compact || (hi - lo) * scale >= viewport) return [Math.min(a, b), Math.max(a, b)];
    const start = CONTENT_MARGIN - lo * scale,
      end = viewport - CONTENT_MARGIN - inset - hi * scale;
    // If margins alone do not fit, centre the content in the usable area.
    return start <= end ? [start, end] : [(start + end) / 2, (start + end) / 2];
  };
  const [left, right] = axis(Math.min(...xs), Math.max(...xs), width, x0, x1);
  const [top, bottom] = axis(Math.min(...ys), Math.max(...ys), height, y0, y1, bottomInset);
  return [left, top, right, bottom];
}

export function constrain([x, y]: Point, [x0, y0, x1, y1]: Box): Point {
  return [clamp(x, x0, x1), clamp(y, y0, y1)];
}

/** Continuous at the edge, with a diminishing derivative outside it. */
export function rubber(n: number, min: number, max: number, length = 140) {
  const edge = clamp(n, min, max),
    over = n - edge;
  return edge + Math.sign(over) * length * (1 - Math.exp(-Math.abs(over) / length));
}

export function rubberPoint([x, y]: Point, [x0, y0, x1, y1]: Box): Point {
  return [rubber(x, x0, x1), rubber(y, y0, y1)];
}
