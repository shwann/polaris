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
) {
  const [left, top, right, bottom] = view;
  const w = Math.min(width, Math.max(0, right - left - padding * 2));
  const align = x + gap + w + padding <= right ? 'left' : 'right';
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
