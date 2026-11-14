import '../../../tests/support';
import { expect, it } from 'vitest';
import { fixture } from '../testFixture';
import { pickAt, pickRadius } from '../draw/picking';
import { advanceSpin, home } from '../geometry/clusters';
import { pausedGroups, PAUSE_PAD } from './pause';
import { physics } from '../physics';
import type { Star } from '../types';

function scene() {
  const f = fixture();
  f.s.onSky = true;
  const a = f.star('DASH1', 400, 300, 'waiting'),
    b = f.star('DOC1', 410, 300, 'waiting'),
    c = f.star('TB6', 700, 600, 'doing');
  return { ...f, a, b, c };
}
const aim = (s: ReturnType<typeof fixture>['s'], x: number, y: number) => {
  s.px = x;
  s.py = y;
  [s.wpx, s.wpy] = s.toWorld(x, y);
};

it('picks the nearest star when two sit 10px apart, with a hit radius of at least 14px', () => {
  const { s, a, b, registry } = scene();
  expect(pickRadius(0.5)).toBeGreaterThanOrEqual(14);
  expect(pickRadius(5)).toBeGreaterThanOrEqual(14);
  expect(pickAt(s, 403, 300).star).toBe(a);
  expect(pickAt(s, 407, 300).star).toBe(b);
  expect(pickAt(s, 405 + 13, 300).star).toBe(b);
  expect(pickAt(s, 405, 360).star).toBeNull();
  registry.dispose();
});

it('pauses the cluster under the pointer, over a star or anywhere inside its extent', () => {
  const { s, a, registry } = scene();
  aim(s, 405, 300 + PAUSE_PAD - 1);
  expect([...pausedGroups(s)]).toEqual(['waiting']);
  aim(s, 2000, 2000);
  expect(pausedGroups(s).size).toBe(0);
  s.hover = a;
  expect([...pausedGroups(s)]).toEqual(['waiting']);
  registry.dispose();
});

it('keeps the cluster of the open detail card still while others keep turning', () => {
  const { s, registry } = scene();
  const star = { group: 'waiting', layoutX: 80, layoutY: 0, ang: 0, rad: 1 } as unknown as Star,
    other = { group: 'doing', layoutX: 80, layoutY: 0, ang: 0, rad: 1 } as unknown as Star;
  s.centre = () => [500, 400, 100];
  s.selected = 'DASH1';
  s.paused = pausedGroups(s);
  expect(s.paused.has('waiting')).toBe(true);
  s.spinT = 1000;
  const still = home(s, star, 1),
    moving = home(s, other, 1);
  for (let i = 0; i < 300; i++) advanceSpin(s, 16);
  expect(home(s, star, 2)).toEqual(still);
  expect(home(s, other, 2)).not.toEqual(moving);
  // Closing the card resumes from where it stopped, without a jump.
  s.selected = null;
  s.paused = pausedGroups(s);
  advanceSpin(s, 16);
  const resumed = home(s, star, 3);
  expect(Math.hypot(resumed[0] - still[0], resumed[1] - still[1])).toBeLessThan(1);
  registry.dispose();
});

it('does not pull the stars of a paused cluster toward the pointer', () => {
  const { s, a, c, registry } = scene();
  aim(s, 420, 300);
  s.paused = pausedGroups(s);
  for (const p of [a, c]) [p.baseX, p.baseY] = [p.x, p.y];
  physics(s, 16, 16, [a, c]);
  expect([a.vx, a.vy]).toEqual([0, 0]);
  registry.dispose();
});

it('freezes parallax while the pointer rests on a cluster', () => {
  const { s, registry } = scene();
  aim(s, 405, 300);
  s.tx = 0.1;
  s.ty = 0.1;
  s.frame(16);
  s.frame(32);
  expect(s.paused?.has('waiting')).toBe(true);
  expect([s.tx, s.ty]).toEqual([0.1, 0.1]);
  registry.dispose();
});
