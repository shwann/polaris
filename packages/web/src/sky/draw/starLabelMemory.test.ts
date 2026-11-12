import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../testFixture';
import { LABEL_UPGRADE_MARGIN, drawStarLabels } from './starLabels';
import type { Box } from '../types';

const label = (x = 700, y = 400) => ({
  id: 'drift',
  x,
  y,
  gap: 10,
  c: [255, 255, 255] as [number, number, number],
  a: 1,
  pri: 10,
  lines: ['DASH1', 'A long title line'],
});
function withBar(box: () => DOMRect) {
  const ctx = fixture(),
    node = document.createElement('div');
  vi.spyOn(node, 'getBoundingClientRect').mockImplementation(box);
  ctx.registry.register('skybar', node);
  return ctx;
}

it('keeps a label on its previous side while it still fits', () => {
  let bar = new DOMRect(712, 360, 60, 80);
  const { s, registry } = withBar(() => bar);
  const first = drawStarLabels(s, [label()])[0]!;
  expect(first[2]).toBeLessThanOrEqual(700);
  bar = new DOMRect(1300, 800, 10, 10);
  registry.update();
  for (let i = 0; i < 5; i++) {
    const box = drawStarLabels(s, [label(700 + i, 400)])[0] as Box;
    expect(box[2]).toBeLessThanOrEqual(700 + i);
  }
  registry.dispose();
});

it('grows a code-only label back to its title only with clear room', () => {
  const tall = (b: Box) => b[3] - b[1];
  // Anchor at the top edge: rows above clamp onto the same box, so only room below matters.
  const free = fixture();
  const full = drawStarLabels(free.s, [label(700, 12)])[0]!;
  const code = drawStarLabels(fixture().s, [{ ...label(700, 12), lines: ['DASH1'] }])[0]!;
  free.registry.dispose();
  expect(tall(full)).toBeGreaterThan(tall(code));
  // A bar right under the code line leaves room only for the code.
  let bar = new DOMRect(300, code[3] + 1, 800, 400);
  const { s, registry } = withBar(() => bar);
  expect(tall(drawStarLabels(s, [label(700, 12)])[0]!)).toBe(tall(code));
  // Barely enough room for the title: stays code-only instead of flickering.
  bar = new DOMRect(300, full[3] + (LABEL_UPGRADE_MARGIN * s.sz) / 2, 800, 400);
  registry.update();
  expect(tall(drawStarLabels(s, [label(700, 12)])[0]!)).toBe(tall(code));
  // Clear room: the title comes back.
  bar = new DOMRect(300, 800, 800, 50);
  registry.update();
  expect(tall(drawStarLabels(s, [label(700, 12)])[0]!)).toBe(tall(full));
  registry.dispose();
});
