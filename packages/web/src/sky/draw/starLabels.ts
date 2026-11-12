import type { Box, Color, SkyState } from '../types';
import { rgba } from '../palette';

/**
 * Semantic zoom for star labels in the sky view: the further in, the more of the task title shows.
 * Pure text layout so it can be tested without a canvas.
 */

/** Below this camera scale a star shows only its code. */
export const TITLE_FROM = 2.4;
/** From this camera scale the whole title shows, wrapped. */
export const FULL_FROM = 3.6;
const SHORT_MIN = 4;
const SHORT_MAX = 12;
const WRAP = 16;
const MAX_LINES = 3;

const clip = (text: string, n: number) => (text.length > n ? text.slice(0, n) + '…' : text);

/** Characters of title shown between TITLE_FROM and FULL_FROM, growing with zoom. */
export function shortLength(zoom: number): number {
  const k = Math.min(1, Math.max(0, (zoom - TITLE_FROM) / (FULL_FROM - TITLE_FROM)));
  return Math.round(SHORT_MIN + k * (SHORT_MAX - SHORT_MIN));
}

/** Wrap a title into lines of WRAP characters, at most MAX_LINES, the last one clipped. */
export function wrapTitle(title: string): string[] {
  const lines: string[] = [];
  for (let i = 0; i < title.length && lines.length < MAX_LINES; i += WRAP) lines.push(title.slice(i, i + WRAP));
  if (title.length > WRAP * MAX_LINES) lines[MAX_LINES - 1] = clip(lines[MAX_LINES - 1]!, WRAP - 1);
  return lines;
}

/**
 * Lines for one star label: the code first, then as much title as the zoom allows.
 * @param sky - Only the full sky view grows labels; the header chart keeps codes.
 */
export function labelLines(code: string, title: string, zoom: number, sky: boolean): string[] {
  const text = title.trim();
  if (!sky || !text || zoom < TITLE_FROM) return [code];
  if (zoom < FULL_FROM) return [code, clip(text, shortLength(zoom))];
  return [code, ...wrapTitle(text)];
}

/** Final world-space text bounds, including padding, before collision detection. */
export function placeLabel(
  x: number,
  y: number,
  gap: number,
  width: number,
  height: number,
  view: import('../types').Box,
  ascent: number,
  padding: number,
  flip = false,
) {
  const [left, top, right, bottom] = view;
  const w = Math.min(width, Math.max(0, right - left - padding * 2));
  const onRight = x + gap + w + padding <= right;
  const align = onRight !== flip ? 'left' : 'right';
  const preferred = align === 'left' ? x + gap : x - gap - w;
  const bx = Math.max(left + padding, Math.min(preferred, right - w - padding));
  const by = Math.max(top + padding, Math.min(y - ascent, bottom - height - padding));
  return {
    x: align === 'left' ? bx : bx + w,
    y: by + ascent,
    align: align as CanvasTextAlign,
    width: w,
    box: [bx - padding, by - padding, bx + w + padding, by + height + padding] as import('../types').Box,
  };
}

interface Label {
  lines: string[];
  x: number;
  y: number;
  gap: number;
  c: Color;
  a: number;
  pri: number;
}
export const overlaps = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

/** Measure every baseline and ink bearing with the exact fonts used by the renderer. */
export function measureLabel(ctx: CanvasRenderingContext2D, lines: string[], size: number) {
  const fonts = lines.map((_, i) =>
    i ? `400 ${size * 0.92}px "Noto Sans SC", sans-serif` : `500 ${size}px "JetBrains Mono", monospace`,
  );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const measured = lines.map((line, i) => {
    ctx.font = fonts[i]!;
    const m = ctx.measureText(line);
    return {
      width: m.width,
      left: m.actualBoundingBoxLeft || 0,
      right: Math.max(m.width, m.actualBoundingBoxRight || 0),
      ascent: m.actualBoundingBoxAscent ?? size,
      descent: m.actualBoundingBoxDescent ?? size * 0.25,
    };
  });
  const left = Math.max(0, ...measured.map((m) => m.left)),
    right = Math.max(0, ...measured.map((m) => m.right)),
    lineH = Math.max(size * 1.25, ...measured.slice(1).map((m, i) => measured[i]!.descent + m.ascent + size * 0.1)),
    top = Math.min(0, ...measured.map((m, i) => i * lineH - m.ascent)),
    bottom = Math.max(0, ...measured.map((m, i) => i * lineH + m.descent));
  return {
    width: left + right,
    height: bottom - top,
    ascent: -top,
    left,
    lineH,
    fonts,
    advances: measured.map((m) => m.width),
  };
}

/** Placement and drawing share measured ink bounds; lower priority labels may fall back to code only. */
export function drawStarLabels(state: SkyState, labels: Label[]) {
  const ctx = state.ctx,
    size = Math.max(10, state.unit * 0.0098) * state.sz,
    view = [...state.toWorld(8, 8), ...state.toWorld(state.w - 8, state.h - 8)] as Box,
    placed: Box[] = [];
  ctx.save();
  for (const L of labels.sort((a, b) => b.pri - a.pri)) {
    const variants = L.lines.length > 1 ? [L.lines, L.lines.slice(0, 1)] : [L.lines];
    variants: for (const lines of variants) {
      const metrics = measureLabel(ctx, lines, size);
      const candidates = [false, true].map((flip) =>
        placeLabel(L.x, L.y, L.gap, metrics.width, metrics.height, view, metrics.ascent, 2 * state.sz, flip),
      );
      for (const placement of candidates) {
        if (placement.width <= metrics.left || placed.some((box) => overlaps(placement.box, box))) continue;
        const { x, y, width, align, box } = placement,
          textX = (align === 'left' ? x : x - width) + metrics.left;
        placed.push(box);
        ctx.shadowColor = 'rgba(4,10,20,.95)';
        ctx.shadowBlur = 5 * state.sz;
        lines.forEach((line, i) => {
          ctx.font = metrics.fonts[i]!;
          ctx.fillStyle = i ? rgba([214, 228, 245], L.a * 0.85) : rgba(L.c, L.a);
          const scale = Math.min(1, (width - metrics.left) / (metrics.width - metrics.left));
          ctx.fillText(line, textX, y + i * metrics.lineH, metrics.advances[i]! * scale);
        });
        break variants;
      }
    }
  }
  ctx.restore();
  return placed;
}
