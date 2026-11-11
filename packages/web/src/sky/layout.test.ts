import '../../tests/support';
import { it, expect } from 'vitest';
import { LayoutRegistry } from '../layout/LayoutRegistry';
import type { LayoutKey } from '../layout/LayoutRegistry';
import { createState } from './createState';
import { measureHeader } from './layout';
it('reproduces the legacy header gap and mask and hides the small Dipper without enough room', () => {
  const registry = new LayoutRegistry();
  const add = (key: LayoutKey, x: number, y: number, w: number, h: number) => {
    const node = document.createElement('div');
    node.getBoundingClientRect = () => new DOMRect(x, y, w, h);
    return registry.register(key, node);
  };
  add('cover', 16, 26, 1408, 400);
  add('clock', 1150, 26, 250, 36);
  add('actions', 1000, 240, 300, 30);
  add('status', 1120, 70, 280, 20);
  add('watch', 1120, 100, 280, 100);
  add('tabs', 16, 240, 1408, 40);
  add('figures', 16, 320, 1408, 100);
  add('kicker', 16, 26, 100, 20);
  add('en', 16, 50, 200, 20);
  add('zh', 16, 75, 150, 70);
  add('motto', 16, 150, 260, 20);
  add('ticker', 16, 180, 280, 30);
  const canvas = document.createElement('canvas'),
    s = createState(canvas, canvas.getContext('2d')!, registry, {});
  measureHeader(s);
  expect(s.veilY).toBe(440);
  expect(s.smallBox).toEqual([595.2, 32, 1042, 204]);
  expect(s.smallPole?.[0]).toBeCloseTo(475.2, 8);
  expect(s.smallPole?.[1]).toBeCloseTo(115.52, 8);
  add('clock', 500, 26, 250, 36);
  measureHeader(s);
  expect(s.smallBox).toBeNull();
  registry.dispose();
});
