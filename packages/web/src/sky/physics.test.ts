import '../../tests/support';
import { expect, it } from 'vitest';
import { attachInput } from './input';
import { fixture, pointer } from './testFixture';

it('pulls tree neighbors through distances and rebounds without migration easing flattening it', () => {
  const { s, star, registry } = fixture();
  const a = star('a', 400, 400),
    b = star('b', 460, 400),
    c = star('c', 520, 400),
    other = star('other', 600, 500, 'planned');
  s.trees.set('doing', [
    [a, b],
    [b, c],
  ]);
  const detach = attachInput(s);
  pointer('pointerdown', 400, 400, 0);
  pointer('pointermove', 300, 320, 40);
  s.frame(40);
  expect(a.x).toBe(300);
  expect(b.ox).toBeLessThan(0);
  expect(Math.abs(b.ox)).toBeLessThan(100);
  expect(Math.abs(c.ox)).toBeLessThan(Math.abs(b.ox));
  expect(other.ox).toBe(0);
  expect(other.x).toBe(600);
  for (let t = 56; t < 1500; t += 16) s.frame(t);
  expect(b.oy).toBeLessThan(0);
  expect(Math.abs(b.ox)).toBeGreaterThan(Math.abs(c.ox));
  pointer('pointerup', 300, 320, 1501);
  s.px = s.py = -1e4;
  let maximum = 0;
  for (let t = 1516; t <= 4500; t += 16) {
    s.frame(t);
    maximum = Math.max(maximum, a.ox);
  }
  // Recovery damping keeps a small overshoot while settling faster.
  expect(maximum).toBeGreaterThan(0.1);
  expect(Math.abs(a.ox)).toBeLessThan(0.1);
  expect(Math.abs(b.ox)).toBeLessThan(0.1);
  expect(other.x).toBe(600);
  detach();
  registry.dispose();
});

it('keeps the initial grab offset instead of snapping a star center to the cursor', () => {
  const { s, star, registry } = fixture();
  const a = star('a', 400, 400),
    detach = attachInput(s);
  pointer('pointerdown', 415, 400, 0);
  pointer('pointermove', 515, 400, 40);
  s.frame(40);
  expect(a.x).toBe(500);
  detach();
  registry.dispose();
});

it('preserves separate easing when a task moves to a different group', () => {
  const { s, star, registry } = fixture();
  const a = star('a', 400, 400);
  s.physics(0, 16, [a]);
  a.ang = 700;
  a.group = 'planned';
  s.physics(16, 16, [a]);
  expect(a.x).toBeGreaterThan(400);
  expect(a.x).toBeLessThan(450);
  expect(a.ox).toBe(0);
  for (let t = 32; t <= 3000; t += 16) s.physics(t, 16, [a]);
  expect(a.x).toBeCloseTo(700, 0);
  registry.dispose();
});
