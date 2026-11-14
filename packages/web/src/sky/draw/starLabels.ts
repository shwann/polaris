import { TITLE_BAND } from '../motion/labelZoom';
import type { Box, Color, SkyState } from '../types';
import { labelFits, labelObstacles, outlinedText } from './labelObstacles';
import { rgba } from '../palette';
import { labelSize } from '../geometry/spacing';

/**
 * Semantic zoom for star labels in the sky view: the further in, the more of the task title shows.
 * Pure text layout so it can be tested without a canvas.
 */

/** Below this camera scale a star shows only its code. */
export const TITLE_FROM = 2.4;
/** From this camera scale the whole title shows, wrapped. */
export const FULL_FROM = 3.6;
/** Characters of title at the first title zoom: enough to tell neighbours apart. */
export const SHORT_MIN = 8;
/** Characters of title just before the full wrapped title takes over. */
export const SHORT_MAX = 16;
const SHORT_STEP = 4;
const WRAP = 16;
const MAX_LINES = 3;

const clip = (text: string, n: number) => (text.length > n ? text.slice(0, n) + '…' : text);

/** Desktop title length changes in discrete bands; mobile retains its existing continuous rule. */
export function shortLength(zoom: number, stepped = true): number {
  if (!stepped)
    return Math.round(
      SHORT_MIN + Math.min(1, Math.max(0, (zoom - TITLE_FROM) / (FULL_FROM - TITLE_FROM))) * (SHORT_MAX - SHORT_MIN),
    );
  const band = Math.min(2, Math.max(0, Math.floor((zoom - TITLE_FROM + 1e-8) / TITLE_BAND)));
  return zoom >= FULL_FROM ? SHORT_MAX : SHORT_MIN + band * SHORT_STEP;
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
 * @param short - The title without the lead-in it shares with its cluster, used while the title is clipped.
 */
export function labelLines(
  code: string,
  title: string,
  zoom: number,
  sky: boolean,
  stepped = true,
  short?: string,
): string[] {
  const text = title.trim();
  if (!sky || !text || zoom < TITLE_FROM) return [code];
  if (zoom < FULL_FROM) return [code, clip(short?.trim() || text, shortLength(zoom, stepped))];
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

export interface Label {
  id?: string;
  lines: string[];
  x: number;
  y: number;
  gap: number;
  c: Color;
  a: number;
  pri: number;
  size?: number;
  secondary?: Color;
  flip?: boolean;
  preferFull?: boolean;
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

interface LabelChoice {
  full: boolean;
  direction: number;
  flip: boolean;
}
/** Last placement per sky state, so drifting clusters do not make labels hop every frame. */
const memory = new WeakMap<object, Map<string, LabelChoice>>();
const revisions = new WeakMap<object, number>();
/** Extra clearance, in sz, a code-only label needs before it grows its title back. */
export const LABEL_UPGRADE_MARGIN = 6;
/** Clear space, in sz, kept between two task labels so stacked codes never read as one two-line label. */
export const LABEL_GAP = 2;
const grow = (b: Box, m: number) => [b[0] - m, b[1] - m, b[2] + m, b[3] + m] as Box;

/**
 * Placement and drawing share measured ink bounds; lower priority labels may fall back to code only.
 * In the sky view a label keeps its previous side and title state while it still fits.
 */
export function drawStarLabels(state: SkyState, labels: Label[], avoid: Box[] = []) {
  const ctx = state.ctx,
    view = [...state.toWorld(8, 8), ...state.toWorld(state.w - 8, state.h - 8)] as Box,
    placed: Box[] = [];
  const obstacles = state.sky ? labelObstacles(state) : { boxes: [], halos: [], segments: [] };
  obstacles.boxes.push(...avoid);
  let memo = memory.get(state);
  if (state.sky && !memo) memory.set(state, (memo = new Map()));
  if (state.labelLayout && revisions.get(state) !== state.labelLayout.revision) {
    // A settled zoom gets one fresh layout; afterwards labels keep their places with hysteresis.
    memo?.clear();
    revisions.set(state, state.labelLayout.revision);
  }
  const chosen = new Map<string, LabelChoice>();
  ctx.save();
  for (const L of labels.sort((a, b) => b.pri - a.pri)) {
    if (L.a <= 0) continue;
    const size = L.size ?? labelSize(state.unit) * state.sz;
    const ownHalo = obstacles.halos.find((h) => h.id === L.id),
      gap = Math.max(L.gap, (ownHalo?.radius || 0) + 2 * state.sz);
    const hasTitle = L.lines.length > 1;
    const variants = hasTitle ? [L.lines, L.lines.slice(0, 1)] : [L.lines];
    const metrics = variants.map((lines) => measureLabel(ctx, lines, size));
    // Prefer the original code-only anchor before moving a label away from its star.
    const candidates = (state.sky ? [0, -1, 1] : [0]).flatMap((direction) =>
      variants.flatMap((lines, v) =>
        [!!L.flip, !L.flip].map((flip) => ({ v, direction, flip, full: hasTitle && v === 0 })),
      ),
    );
    const tries = L.preferFull
      ? [...candidates.filter((t) => t.full), ...candidates.filter((t) => !t.full)]
      : candidates;
    const prev = L.id ? memo?.get(L.id) : undefined;
    const same = (t: (typeof tries)[number]) =>
      !!prev && t.full === prev.full && t.direction === prev.direction && t.flip === prev.flip;
    const upgrading = !!prev && !prev.full && hasTitle;
    const ordered = prev
      ? upgrading
        ? [...tries.filter((t) => t.full), ...tries.filter(same), ...tries.filter((t) => !t.full && !same(t))]
        : [...tries.filter(same), ...tries.filter((t) => !same(t))]
      : tries;
    for (const t of ordered) {
      const lines = variants[t.v]!,
        m = metrics[t.v]!;
      const placement = placeLabel(
        L.x,
        L.y + t.direction * (m.height + size),
        gap,
        m.width,
        m.height,
        view,
        m.ascent,
        2 * state.sz,
        t.flip,
      );
      const margin = upgrading && t.full ? LABEL_UPGRADE_MARGIN * state.sz : 0;
      if (
        placement.width <= m.left ||
        !labelFits(grow(placement.box, margin), obstacles.boxes, obstacles.halos, obstacles.segments) ||
        placed.some((b) => overlaps(grow(placement.box, margin + LABEL_GAP * state.sz), b))
      )
        continue;
      const { x, y, width, align, box } = placement,
        textX = (align === 'left' ? x : x - width) + m.left;
      placed.push(box);
      if (L.id) chosen.set(L.id, { full: t.full, direction: t.direction, flip: t.flip });
      ctx.shadowColor = 'rgba(4,10,20,.95)';
      ctx.shadowBlur = 5 * state.sz;
      lines.forEach((line, i) => {
        ctx.font = m.fonts[i]!;
        const alpha = L.a * (i ? 0.85 : 1);
        ctx.fillStyle = rgba(i ? (L.secondary ?? [214, 228, 245]) : L.c, state.sky ? 1 : alpha);
        const scale = Math.min(1, (width - m.left) / (m.width - m.left));
        if (state.sky) outlinedText(ctx, line, textX, y + i * m.lineH, 1, alpha, m.advances[i]! * scale);
        else ctx.fillText(line, textX, y + i * m.lineH, m.advances[i]! * scale);
      });
      break;
    }
  }
  ctx.restore();
  if (memo) {
    memo.clear();
    for (const [id, c] of chosen) memo.set(id, c);
  }
  return placed;
}
