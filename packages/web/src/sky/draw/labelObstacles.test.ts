import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../testFixture';
import { hitsHalo, labelFits, labelObstacles, outlinedText } from './labelObstacles';
import { placeSummary } from './summaryPlacement';
import { drawStarLabels, overlaps } from './starLabels';
import type { Box } from '../types';

it('rejects every title line intersecting every halo including the owner while allowing empty circle corners', () => {
  const halo = { id: 'other', point: [200, 200] as [number, number], radius: 18 };
  expect(labelFits([180, 150, 240, 210], [], [halo])).toBe(false);
  expect(labelFits([180, 150, 240, 210], [], [halo])).toBe(false);
  expect(hitsHalo([180, 180, 185, 185], halo)).toBe(false);
  expect(labelFits([350, 835, 500, 860], [[357, 832, 1083, 877]], [])).toBe(false);
});
it('reads the registered toolbar bounds and tracks resize and camera transforms', () => {
  const { s, registry } = fixture(),
    node = document.createElement('div');
  let box = new DOMRect(357, 832, 726, 45);
  vi.spyOn(node, 'getBoundingClientRect').mockImplementation(() => box);
  registry.register('skybar', node);
  expect(labelObstacles(s).boxes).toEqual([[357, 832, 1083, 877]]);
  box = new DOMRect(200, 600, 600, 40);
  registry.update();
  Object.assign(s.cam, { s: 2, x: 100, y: 200 });
  expect(labelObstacles(s).boxes).toEqual([[50, 200, 350, 220]]);
  registry.dispose();
});
it.each([1, 5])('puts a rounded ink underlay immediately before every glyph at zoom %s', (zoom) => {
  const { s, registry } = fixture(),
    order: string[] = [];
  s.ctx.strokeText = vi.fn(() => order.push('outline'));
  s.ctx.fillText = vi.fn(() => order.push('fill'));
  outlinedText(s.ctx, 'AIXG', 100, 100, zoom ** -0.6);
  expect(order).toEqual(['outline', 'fill']);
  expect(s.ctx.strokeText).toHaveBeenCalledWith('AIXG', 100, 100, undefined);
  registry.dispose();
});
it('falls back or hides labels that cannot fit beside the toolbar and every other star halo', () => {
  const { s, star, registry } = fixture(),
    node = document.createElement('div');
  vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(new DOMRect(350, 700, 400, 80));
  registry.register('skybar', node);
  star('neighbor', 450, 670);
  const boxes = drawStarLabels(s, [
    {
      id: 'self',
      x: 400,
      y: 690,
      gap: 10,
      c: [255, 255, 255],
      a: 1,
      pri: 99,
      lines: ['DASH1', 'A long title', 'Third line'],
    },
  ]);
  for (const box of boxes) expect(labelFits(box, labelObstacles(s).boxes, labelObstacles(s).halos)).toBe(true);
  registry.dispose();
});
it.each([0.5, 1])('places the done summary outside the cluster and away from all star halos at zoom %s', (zoom) => {
  const halos = [
    { id: 'green', point: [400 * zoom, 500 * zoom] as [number, number], radius: 16 },
    { id: 'other', point: [400 * zoom, 450 * zoom] as [number, number], radius: 20 },
  ];
  const bounds: Box = [380 * zoom, 480 * zoom, 600 * zoom, 650 * zoom];
  const p = placeSummary(bounds, 120, 14, [1440, 900], halos);
  expect(p.visible).toBe(true);
  const box: Box = [p.left, p.top - 14, p.left + 120, p.top];
  expect(overlaps(box, bounds)).toBe(false);
  expect(halos.some((h) => hitsHalo(box, h))).toBe(false);
});
it('keeps label obstacles steady while late stars throb and twinkle', () => {
  const { s } = fixture(),
    stars = [...s.stars.values()];
  for (const star of stars) Object.assign(star, { late: true, flare: 0 });
  const radii = () => labelObstacles(s).halos.map((h) => h.radius);
  s.last = 0;
  const first = radii();
  for (const t of [137, 420, 911, 1650]) {
    s.last = t;
    stars.forEach((star, i) => (star.flare = (i % 3) / 3));
    expect(radii()).toEqual(first);
  }
});
