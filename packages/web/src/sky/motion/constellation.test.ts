import '../../../tests/support';
import { expect, it } from 'vitest';
import { attachInput } from '../input';
import { hubHomes, hubs } from '../layout';
import { fixture, pointer, callbacks } from '../testFixture';
import { clusterTether, syncHubs } from './constellation';

function setup(reduced = false) {
  const events = callbacks(),
    f = fixture(reduced, events);
  f.s.hubs = () => hubs(f.s);
  syncHubs(f.s);
  const detach = attachInput(f.s);
  return {
    ...f,
    events,
    dispose: () => {
      detach();
      f.registry.dispose();
    },
  };
}

it('drags a Dipper star without moving the camera, carries neighbors and its live tether star, then returns home', () => {
  const { s, star, dispose } = setup(),
    homes = hubHomes(s),
    [x, y] = homes[1]!,
    center = star('center', x + 140, y + 100, 'planned'),
    edge = star('edge', x + 200, y + 100, 'planned');
  s.trees.set('planned', [[center, edge]]);
  s.counts.set('planned', 2);
  pointer('pointerdown', x + 8, y + 3, 0);
  // Away from both adjacent links and the cluster's tether.
  for (let i = 1; i <= 20; i++) {
    pointer('pointermove', x + 8 - i * 5, y + 3 - i * 4, i * 16);
    s.physics(i * 16, 16, [...s.stars.values()]);
  }
  expect(s.hubs()[1]![0]).toBeCloseTo(x - 100);
  expect(s.hubs()[1]![1]).toBeCloseTo(y - 80);
  expect(s.hubParticles[0]!.ox ** 2 + s.hubParticles[0]!.oy ** 2).toBeGreaterThan(0);
  const displacement = (k: number) => Math.hypot(s.hubParticles[k]!.ox, s.hubParticles[k]!.oy);
  expect(displacement(0)).toBeGreaterThan(displacement(6));
  expect(Math.hypot(center.ox, center.oy)).toBeGreaterThan(0.1);
  expect(s.tetherHub.get('planned')).toBe('center');
  expect(s.cam).toEqual({ s: 1, x: 0, y: 0 });
  pointer('pointerup', x - 92, y - 77, 321);
  expect(s.inertia).toEqual([0, 0]);
  for (let t = 336; t < 3400; t += 16) s.physics(t, 16, [...s.stars.values()]);
  expect(Math.max(...s.hubParticles.map((p) => Math.hypot(p.ox, p.oy)))).toBeLessThan(0.5);
  expect(Math.hypot(center.ox, center.oy)).toBeLessThan(0.5);
  dispose();
});
it('pulls Dubhe through the polar pointer when Polaris is dragged', () => {
  const { s, dispose } = setup(),
    [x, y] = s.hubs()[7]!;
  pointer('pointerdown', x, y, 0);
  pointer('pointermove', x - 160, y - 80, 80);
  for (let i = 0; i < 20; i++) s.physics(i * 16, 16, []);
  expect(Math.hypot(s.hubParticles[0]!.ox, s.hubParticles[0]!.oy)).toBeGreaterThan(0.1);
  expect(s.camT).toEqual(s.cam);
  pointer('pointerup', x - 160, y - 80, 81);
  dispose();
});
it('keeps sub-5px anchor gestures as clicks, including Polaris, and consumes real drags', () => {
  const { s, events, dispose } = setup();
  for (const k of [1, 7]) {
    const [x, y] = s.hubs()[k]!;
    pointer('pointerdown', x, y, 0);
    pointer('pointermove', x + 4, y, 30);
    pointer('pointerup', x + 4, y, 40);
    expect(events.onPickDipper).toHaveBeenLastCalledWith(k);
  }
  events.onPickDipper.mockClear();
  const [x, y] = s.hubs()[2]!;
  pointer('pointerdown', x, y, 100);
  pointer('pointermove', x + 6, y, 120);
  pointer('pointerup', x + 6, y, 130);
  expect(events.onPickDipper).not.toHaveBeenCalled();
  dispose();
});
it.each(['board', 'reduced'])('does not drag anchors or pan through them in %s mode', (mode) => {
  const { s, dispose } = setup(mode === 'reduced');
  if (mode === 'board') {
    s.sky = false;
    s.skyK = 0;
  }
  const original = s.hubs(),
    [x, y] = original[1]!;
  pointer('pointerdown', x, y, 0);
  pointer('pointermove', x + 100, y + 80, 40);
  s.physics(40, 16, []);
  pointer('pointerup', x + 100, y + 80, 41);
  expect(s.hubs()).toEqual(original);
  expect(s.hubs()).toEqual(hubHomes(s));
  expect(s.cam).toEqual({ s: 1, x: 0, y: 0 });
  expect(s.inertia).toEqual([0, 0]);
  dispose();
});
it('moves only the held task under reduced motion and cancels to its home immediately', () => {
  const { s, star, dispose } = setup(true),
    a = star('a', 400, 400),
    b = star('b', 460, 400);
  s.trees.set('doing', [[a, b]]);
  pointer('pointerdown', 400, 400, 0);
  pointer('pointermove', 300, 300, 20);
  s.physics(20, 16, [a, b]);
  expect([a.x, a.y]).toEqual([300, 300]);
  expect([b.x, b.y]).toEqual([460, 400]);
  pointer('pointercancel', 300, 300, 21);
  expect([a.x, a.y, a.vx, a.vy]).toEqual([400, 400, 0, 0]);
  dispose();
});

it('isolates a task drag from the Dipper and every other lane', () => {
  const { s, star, dispose } = setup(),
    a = star('a', 400, 400),
    b = star('b', 460, 400),
    other = star('other', 600, 500, 'planned');
  s.trees.set('doing', [[a, b]]);
  pointer('pointerdown', 400, 400, 0);
  pointer('pointermove', 280, 300, 40);
  for (let t = 16; t <= 320; t += 16) s.physics(t, 16, [a, b, other]);
  expect(Math.hypot(b.ox, b.oy)).toBeGreaterThan(1);
  expect([other.ox, other.oy]).toEqual([0, 0]);
  expect(s.hubParticles.every((p) => p.ox === 0 && p.oy === 0)).toBe(true);
  dispose();
});

it('preserves mobile task follow ratios, zero-velocity release and anchor canvas panning', () => {
  const { s, star, dispose } = setup();
  s.w = 375;
  const a = star('a', 100, 400),
    b = star('b', 160, 400);
  s.trees.set('doing', [[a, b]]);
  pointer('pointerdown', 100, 400, 0);
  pointer('pointermove', 200, 400, 40);
  for (let t = 16; t < 1400; t += 16) s.physics(t, 16, [a, b]);
  expect(a.x).toBe(200);
  expect(b.ox).toBeCloseTo(35, 0);
  pointer('pointerup', 200, 400, 1401);
  expect([a.vx, a.vy]).toEqual([0, 0]);
  pointer('pointerdown', 200, 400, 1410);
  pointer('pointermove', 240, 400, 1430);
  s.physics(1430, 16, [a, b]);
  pointer('pointercancel', 250, 400, 1431);
  expect(a.x).toBe(240);
  expect([a.vx, a.vy]).toEqual([0, 0]);
  const [x, y] = s.hubs()[7]!;
  pointer('pointerdown', x, y, 1500);
  pointer('pointermove', x - 40, y, 1540);
  expect(s.cam.x).toBe(-40);
  pointer('pointerup', x - 40, y, 1541);
  expect(s.inertia[0]).toBeLessThan(0);
  dispose();
});

it('draws the exact attachment solved this frame even if dragging changes the nearest-center candidate', () => {
  const { s, star, dispose } = setup(),
    from = s.hubs()[2]!,
    a = star('a', 400, 400),
    b = star('b', 460, 400),
    c = star('c', 520, 400);
  expect(clusterTether(s, 2, from)?.star).toBe(b);
  a.x = 900;
  expect(clusterTether(s, 2, from, true)?.star).toBe(b);
  expect(clusterTether(s, 2, from)?.star).toBe(c);
  dispose();
});
