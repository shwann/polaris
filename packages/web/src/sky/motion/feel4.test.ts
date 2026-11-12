import '../../../tests/support';
import { expect, it } from 'vitest';
import { attachInput } from '../input';
import { fixture, pointer } from '../testFixture';
import { advance, COMPRESSION, launch, softBody, STEP, type Particle } from './softbody';
import { MIN_SEPARATION } from './separation';

function gesture(hz: number, duration: number) {
  const { s, star, registry } = fixture(),
    root = star('root', 400, 400),
    neighbor = star('next', 460, 400),
    other = star('other', 650, 500, 'planned'),
    detach = attachInput(s),
    list = [root, neighbor, other];
  s.trees.set('doing', [[root, neighbor]]);
  pointer('pointerdown', 400, 400, 0);
  let last = 0;
  for (let t = 1000 / hz; t < duration; t += 1000 / hz) {
    pointer('pointermove', 400 - (160 * t) / duration, 400, t);
    s.physics(t, t - last, list);
    last = t;
  }
  pointer('pointermove', 240, 400, duration);
  s.physics(duration, duration - last, list);
  pointer('pointerup', 240, 400, duration);
  let peak = 0,
    carried = 0;
  for (let i = 1; i <= hz * 4; i++) {
    s.physics(duration + (i * 1000) / hz, 1000 / hz, list);
    peak = Math.max(peak, 240 - root.x);
    carried = Math.max(carried, Math.hypot(neighbor.ox, neighbor.oy));
  }
  expect([other.ox, other.oy]).toEqual([0, 0]);
  expect(Math.max(...list.map((p) => Math.hypot(p.ox, p.oy)))).toBeLessThan(0.5);
  detach();
  registry.dispose();
  return { peak, carried };
}

it('throws 40–90px beyond a 160px/70ms release at 30/60/144Hz and carries the chain', () => {
  const runs = [30, 60, 144].map((hz) => gesture(hz, 70));
  for (const { peak, carried } of runs) {
    expect(peak).toBeGreaterThanOrEqual(40);
    expect(peak).toBeLessThanOrEqual(90);
    expect(carried).toBeGreaterThan(15);
  }
  expect(Math.max(...runs.map((r) => r.peak)) - Math.min(...runs.map((r) => r.peak))).toBeLessThan(4.8);
  expect(gesture(60, 140).peak).toBeLessThan(runs[1]!.peak);
  for (const hz of [30, 60, 144]) expect(gesture(hz, 4000).peak).toBe(0);
});

it.each([30, 60, 144])('separates all pairs of a 12-star cluster throughout fling and settling at %sHz', (hz) => {
  const particles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      baseX: (i % 4) * 40,
      baseY: Math.floor(i / 4) * 40,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
    })),
    edges = particles.slice(1).map((b, i) => ({ a: particles[i]!, b })),
    body = softBody(),
    root = particles[0]!;
  for (let i = 0; i < 9; i++)
    advance(body, particles, edges, STEP * 1000, { particle: root, point: [(160 * (i + 1)) / 9, 0] }, [particles]);
  launch(root, [160 / 0.07, 0], 1, body, particles);
  for (let frame = 0; frame < hz * 6; frame++) {
    advance(body, particles, edges, 1000 / hz, undefined, [particles]);
    particles.forEach((a, i) =>
      particles.slice(i + 1).forEach((b) => {
        expect(Math.hypot(b.baseX! + b.ox - a.baseX! - a.ox, b.baseY! + b.oy - a.baseY! - a.oy)).toBeGreaterThanOrEqual(
          MIN_SEPARATION - 1e-6,
        );
      }),
    );
  }
  expect(Math.max(...particles.map((p) => Math.hypot(p.ox, p.oy)))).toBeLessThan(0.5);
  expect(COMPRESSION).toBe(0.8);
});

it('softens only the released group for the fixed-clock launch window and leaves slow releases unchanged', () => {
  const make = (x: number): Particle => ({ baseX: x, baseY: 0, ox: -80, oy: 0, vx: 0, vy: 0 });
  const root = make(0),
    neighbor = make(60),
    other = make(600),
    reference = make(600),
    body = softBody();
  launch(root, [-1400, 0], 1, body, [root, neighbor]);
  advance(body, [root, neighbor, other], [], STEP * 1000);
  advance(softBody(), [reference], [], STEP * 1000);
  expect(other).toEqual(reference);
  expect(Math.abs(neighbor.vx)).toBeLessThan(Math.abs(other.vx));
  for (let i = 0; i < 24; i++) advance(body, [root, neighbor, other], [], STEP * 1000);
  expect(body.releases?.size).toBe(0);
  launch(root, [-40, 0], 1, body, [root, neighbor]);
  expect(body.releases?.size).toBe(0);
});

it.each([0.5, 1, 2.4])(
  'keeps all eight Dipper/Polaris particles separated in screen space at zoom %s',
  async (zoom) => {
    const { hubs } = await import('../layout');
    const { syncHubs } = await import('./constellation');
    const { s, registry } = fixture();
    s.cam.s = s.camT.s = zoom;
    s.hubs = () => hubs(s);
    syncHubs(s);
    const detach = attachInput(s),
      [x, y] = s.toScreen(...s.hubs()[1]!);
    pointer('pointerdown', x, y, 0);
    for (let i = 1; i <= 9; i++) {
      pointer('pointermove', x + (160 * i) / 9, y, (i * 1000) / 120);
      s.physics((i * 1000) / 120, 1000 / 120, []);
    }
    pointer('pointerup', x + 160, y, 75);
    expect(s.soft.releases?.size).toBe(8);
    for (let i = 0; i < 720; i++) {
      s.physics(75 + (i * 1000) / 120, 1000 / 120, []);
      const points = s.hubs().map((p) => s.toScreen(...p));
      points.forEach((a, j) =>
        points
          .slice(j + 1)
          .forEach((b) => expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeGreaterThanOrEqual(MIN_SEPARATION - 1e-6)),
      );
    }
    expect(Math.max(...s.hubParticles.map((p) => Math.hypot(p.ox, p.oy)))).toBeLessThan(0.5);
    detach();
    registry.dispose();
  },
);
