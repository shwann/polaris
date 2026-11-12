import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../testFixture';
import type { Box } from '../types';
import { drawStarLabels, measureLabel, overlaps } from './starLabels';

function measuredCanvas(ctx: CanvasRenderingContext2D, overhang = 1) {
  const ink = (text: string) => {
    const size = Number(ctx.font.match(/[\d.]+(?=px)/)?.[0] || 10);
    return {
      width: text.length * size * 0.65,
      actualBoundingBoxLeft: 1,
      actualBoundingBoxRight: text.length * size * 0.65 + overhang,
      actualBoundingBoxAscent: size * 1.1,
      actualBoundingBoxDescent: size * 0.3,
    };
  };
  vi.spyOn(ctx, 'measureText').mockImplementation((text) => ink(text) as TextMetrics);
  const drawn: { text: string; box: Box }[] = [];
  ctx.fillText = vi.fn((text: string, x: number, y: number, maxWidth?: number) => {
    const m = ink(text),
      k = Math.min(1, (maxWidth ?? m.width) / m.width);
    drawn.push({
      text,
      box: [
        x - m.actualBoundingBoxLeft * k,
        y - m.actualBoundingBoxAscent,
        x + m.actualBoundingBoxRight * k,
        y + m.actualBoundingBoxDescent,
      ],
    });
  });
  return drawn;
}

it('includes code bearings, descenders and every title baseline at large viewport font sizes', () => {
  const { s, registry } = fixture();
  measuredCanvas(s.ctx);
  const m = measureLabel(s.ctx, ['PRD 5.1 REL3', '任务标题', '第三行'], 24);
  expect(m.ascent).toBeCloseTo(26.4);
  expect(m.height).toBeCloseTo(26.4 + 2 * (7.2 + 24 * 0.92 * 1.1 + 2.4) + 24 * 0.92 * 0.3);
  expect(m.width).toBeCloseTo('PRD 5.1 REL3'.length * 24 * 0.65 + 2);
  registry.dispose();
});

it.each([0.5, 1, 2.4, 3.6, 5])('draws dense done labels without ink overlaps at zoom %s', (zoom) => {
  const { s, star, registry } = fixture();
  s.unit = 1800;
  Object.assign(s.cam, { s: zoom, x: 0, y: 0 });
  s.sz = zoom ** -0.6;
  const drawn = measuredCanvas(s.ctx),
    stars = Array.from({ length: 12 }, (_, i) =>
      star(
        ['CASH+UX3', 'PRD 5.1 REL3'][i % 2]! + i,
        (420 + (i % 3) * 18) / zoom,
        (240 + Math.floor(i / 3) * 22) / zoom,
        'done',
      ),
    );
  for (const st of stars) st.title = '包含上下伸出的字形和多行标题';
  s.hover = stars[0]!;
  s.selected = stars[1]!.id;
  s.drawStars(0, stars);
  expect(drawn[0]!.text).toBe(stars[0]!.code);
  expect(drawn.length).toBeGreaterThan(0);
  drawn.forEach((a, i) =>
    drawn.slice(i + 1).forEach((b) => expect(overlaps(a.box, b.box), `${a.text} / ${b.text}`).toBe(false)),
  );
  registry.dispose();
});

it('falls back to the code when only the title collides, and respects priority independent of input order', () => {
  const { s, registry } = fixture(),
    drawn = measuredCanvas(s.ctx);
  const base = { x: 300, gap: 10, c: [255, 255, 255] as [number, number, number], a: 1 };
  const boxes = drawStarLabels(s, [
    { ...base, y: 220, lines: ['LOW', 'TITLE'], pri: 1 },
    { ...base, y: 240, lines: ['HOVER'], pri: 99 },
    { ...base, x: 245, y: 240, lines: ['BLOCK'], pri: 98 },
  ]);
  expect(drawn.map((v) => v.text)).toEqual(['HOVER', 'BLOCK', 'LOW']);
  expect(overlaps(boxes[0]!, boxes[1]!)).toBe(false);
  drawn.forEach((v, i) => {
    expect(v.box[0]).toBeGreaterThanOrEqual(boxes[i]![0]);
    expect(v.box[1]).toBeGreaterThanOrEqual(boxes[i]![1]);
    expect(v.box[2]).toBeLessThanOrEqual(boxes[i]![2]);
    expect(v.box[3]).toBeLessThanOrEqual(boxes[i]![3]);
  });
  registry.dispose();
});

it('shows every code in a resting 12-star risk cluster, including the CASH1/DESK1 close pair', async () => {
  const { separatePoints, STAR_SPACING } = await import('../geometry/spacing');
  const { s, star, registry } = fixture(),
    drawn = measuredCanvas(s.ctx);
  const input: [number, number][] = [
    [400, 400],
    [420, 400],
    ...Array.from({ length: 10 }, (_, i): [number, number] => [350 + (i % 5) * 65, 470 + Math.floor(i / 5) * 65]),
  ];
  const stars = separatePoints(input, STAR_SPACING).map(([x, y], i) =>
    star(i === 0 ? 'CASH1' : i === 1 ? 'DESK1' : `TASK${i}`, x, y, 'risk'),
  );
  s.drawStars(0, stars);
  expect(drawn.map((v) => v.text).sort()).toEqual(stars.map((st) => st.code).sort());
  registry.dispose();
});

it('keeps overhanging glyphs inside the final box when viewport clamping condenses a long code', () => {
  const { s, registry } = fixture();
  s.w = s.h = 100;
  const drawn = measuredCanvas(s.ctx, 60),
    boxes = drawStarLabels(s, [
      { x: 50, y: 50, gap: 10, c: [255, 255, 255], a: 1, pri: 1, lines: ['A VERY LONG CODE WITH OVERHANG'] },
    ]);
  expect(drawn).toHaveLength(1);
  expect(drawn[0]!.box[0]).toBeGreaterThanOrEqual(boxes[0]![0]);
  expect(drawn[0]!.box[2]).toBeLessThanOrEqual(boxes[0]![2]);
  registry.dispose();
});
