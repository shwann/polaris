import '../../../tests/support';
import { expect, it } from 'vitest';
import { fixture, pointer } from '../testFixture';
import { attachInput } from '../input';
import { doneBounds, doneLabel, doneSummary, hitDone, zoomDone } from './doneOverview';

it('shows the actual filtered count and fades away as links become readable', () => {
  expect(doneSummary(44, 1)).toEqual({ text: '已完成 44 项', alpha: 1 });
  expect(doneSummary(7, 1).text).toBe('已完成 7 项');
  expect(doneSummary(7, 1.9).alpha).toBeCloseTo(0.5);
  expect(doneSummary(7, 2.4).alpha).toBe(0);
  const { s, star, registry } = fixture();
  star('done', 200, 600, 'done');
  s.rebuild();
  expect(doneLabel(s).text).toBe('已完成 1 项');
  s.stars.get('done')!.dead = true;
  s.rebuild();
  expect(doneBounds(s)).toBeNull();
  expect(hitDone(s, 200, 600)).toBe(false);
  registry.dispose();
});
it('clicks the collision-free label and zooms cluster blank space to a readable fit', () => {
  const { s, star, registry } = fixture(),
    detach = attachInput(s);
  star('a', 180, 500, 'done');
  star('b', 340, 660, 'done');
  s.counts.set('done', 2);
  star('near-label', 195, 470, 'doing');
  const label = doneLabel(s),
    x = label.left + 10,
    y = label.top;
  // The summary now avoids stars; clicking its current position still takes precedence.
  expect(Math.hypot(x - 195, y - 470)).toBeGreaterThan(10);
  pointer('pointerdown', x, y, 0);
  pointer('pointerup', x, y, 10);
  expect(s.selected).toBeNull();
  expect(s.cam.s).toBe(1);
  expect(s.camT.s).toBeCloseTo(3);
  expect(260 * s.camT.s + s.camT.x).toBeCloseTo(s.w / 2);
  expect(580 * s.camT.s + s.camT.y).toBeCloseTo(s.h / 2);
  Object.assign(s.camT, { s: 1, x: 0, y: 0 });
  s.selected = 'near-label';
  pointer('pointerdown', 260, 580, 100);
  pointer('pointerup', 260, 580, 110);
  expect(s.camT.s).toBeCloseTo(3);
  expect(s.selected).toBeNull();
  expect(zoomDone(s, 990, 790)).toBe(false);
  detach();
  registry.dispose();
});
