import type { Box, SkyState } from '../types';

/** Record the actual rendered text ink bounds rather than guessing label widths from character counts. */
export function textBox(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): Box {
  const m = ctx.measureText(text),
    shift = ctx.textAlign === 'center' ? m.width / 2 : ctx.textAlign === 'right' ? m.width : 0;
  return [
    x - shift - 4,
    y - (m.actualBoundingBoxAscent || 14) - 4,
    x - shift + Math.max(m.width, m.actualBoundingBoxRight || 0) + 4,
    y + (m.actualBoundingBoxDescent || 4) + 4,
  ];
}
export function hubObstacles(s: SkyState, exclude = -1): Box[] {
  if (!s.sky || s.w <= 560) return [];
  return s.hubs().flatMap(([x, y], k) => {
    if (k === exclude) return [];
    const r = (k === 7 ? 36 : 18) * s.sz;
    return [[x - r, y - r, x + r, y + r] as Box, ...(s.hubLabelBoxes?.[k] || [])].map(
      (b) => [...s.toScreen(b[0], b[1]), ...s.toScreen(b[2], b[3])] as Box,
    );
  });
}
