import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../testFixture';
import { outlinedText, hitsHalo, labelObstacles } from './labelObstacles';
import { drawDoneOverview } from './doneOverview';
import { drawStarLabels } from './starLabels';
import { drawHubLabels, paintHubLabels } from './labels';

function inkContext(ctx: CanvasRenderingContext2D) {
  const stack: number[] = [],
    calls: { type: string; alpha: number; shadow: string; stroke: string }[] = [];
  ctx.globalAlpha = 1;
  ctx.save = vi.fn(() => {
    stack.push(ctx.globalAlpha);
  });
  ctx.restore = vi.fn(() => {
    ctx.globalAlpha = stack.pop()!;
  });
  for (const type of ['fillText', 'strokeText'] as const)
    ctx[type] = vi.fn(() => {
      calls.push({ type, alpha: ctx.globalAlpha, shadow: ctx.shadowColor, stroke: String(ctx.strokeStyle) });
    });
  return calls;
}

it.each([0, 0.3, 1])('applies alpha %s to outline, shadow and fill and restores parent alpha', (alpha) => {
  const { s, registry } = fixture(),
    calls = inkContext(s.ctx);
  s.ctx.globalAlpha = 0.5;
  s.ctx.shadowColor = 'rgba(4,10,20,.95)';
  outlinedText(s.ctx, '已完成 47 项', 100, 100, 1, alpha);
  expect(calls).toHaveLength(alpha ? 2 : 0);
  for (const call of calls) {
    expect(call.alpha).toBeCloseTo(0.5 * alpha);
    expect(call.shadow).toBe('rgba(4,10,20,.95)');
  }
  expect(s.ctx.globalAlpha).toBe(0.5);
  registry.dispose();
});
it.each([2.1, 2.4, 5])('fades the entire completed summary at zoom %s', (zoom) => {
  const { s, star, registry } = fixture(),
    calls = inkContext(s.ctx);
  star('done', 100, 250, 'done');
  s.counts.set('done', 1);
  s.cam.s = zoom;
  drawDoneOverview(s);
  expect(calls).toHaveLength(zoom >= 2.4 ? 0 : 2);
  for (const call of calls) expect(call.alpha).toBeCloseTo(0.3 * 0.95);
  registry.dispose();
});
it.each([0, 0.3])('keeps every task title line and outline at the same fade factor %s', (alpha) => {
  const { s, registry } = fixture(),
    calls = inkContext(s.ctx);
  drawStarLabels(s, [{ x: 300, y: 300, gap: 20, lines: ['DASH1', '60 项'], a: alpha, c: [255, 255, 255], pri: 99 }]);
  expect(calls.map((c) => c.alpha)).toEqual(alpha ? [alpha, alpha, alpha * 0.85, alpha * 0.85] : []);
  registry.dispose();
});
it('keeps the task core visible on the board and fades in its label and halo with the chart', () => {
  const { s, star, registry } = fixture(true);
  const task = star('DASH1', 330, 440);
  s.hover = task;
  const ink = inkContext(s.ctx),
    halos: number[] = [],
    drawCore = vi.mocked(s.ctx.fill);
  s.tint = () => s.cvs;
  s.ctx.drawImage = vi.fn(() => {
    halos.push(s.ctx.globalAlpha);
  });

  s.sky = false;
  s.skyK = 0;
  s.drawStars(0, [task]);
  expect(drawCore).toHaveBeenCalledTimes(2);
  expect(ink).toHaveLength(0);
  expect(halos).toHaveLength(0);

  s.sky = true;
  s.skyK = 0.4;
  s.drawStars(0, [task]);
  expect(ink.map((call) => call.alpha)).toEqual([0.4, 0.4]);
  expect(halos).toHaveLength(1);
  expect(halos[0]).toBeCloseTo(0.36);
  expect(s.ctx.globalAlpha).toBe(1);
  registry.dispose();
});
it('multiplies the full Dipper label fade by its parent transition alpha', () => {
  const { s, registry } = fixture(),
    calls = inkContext(s.ctx);
  s.dipPos = [[100, 100]];
  s.skyK = 0.3;
  s.board = { ...s.board, nextRelease: '.40' };
  drawHubLabels(s);
  paintHubLabels(s);
  expect(calls.filter((c, i) => i > 0).map((c) => c.alpha)).toEqual([0.3 * 0.95, 0.3 * 0.95, 0.3 * 0.6, 0.3 * 0.6]);
  registry.dispose();
});
it.each([1, 5])('starts a multiline label outside its own current halo at zoom %s', (zoom) => {
  const { s, star, registry } = fixture();
  s.cam.s = zoom;
  s.sz = zoom ** -0.6;
  const own = star('DASH1', 100, 100, 'risk');
  own.flare = 0.7;
  s.hover = own;
  const boxes = drawStarLabels(s, [
    {
      id: own.id,
      x: own.x,
      y: own.y - 3 * s.sz,
      gap: 9 * s.sz,
      lines: ['DASH1', '60 项'],
      a: 1,
      c: [255, 255, 255],
      pri: 99,
    },
  ]);
  expect(boxes).toHaveLength(1);
  expect(hitsHalo(boxes[0]!, labelObstacles(s).halos[0]!)).toBe(false);
  expect(boxes[0]![0]).toBeGreaterThanOrEqual(own.x + labelObstacles(s).halos[0]!.radius - 1e-8);
  registry.dispose();
});
