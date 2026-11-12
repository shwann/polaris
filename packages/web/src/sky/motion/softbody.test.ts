import { describe, expect, it } from 'vitest';
import {
  advance,
  COMPLIANCE,
  COMPRESSION,
  HOME,
  launch,
  softBody,
  STEP,
  THROW_SPEED,
  type Constraint,
  type Particle,
} from './softbody';
import { MIN_SEPARATION } from './separation';

const particle = (x = 0, y = 0): Particle => ({ baseX: x, baseY: y, ox: 0, oy: 0, vx: 0, vy: 0 });
const distance = (p: Particle) => Math.hypot(p.ox, p.oy);
function chain() {
  const particles = [particle(), particle(60), particle(120), particle(180)],
    edges = particles.slice(1).map((b, i) => ({ a: particles[i]!, b }));
  return { particles, edges, body: softBody() };
}
function trajectory(hz: number) {
  const { particles, edges, body } = chain(),
    root = particles[0]!;
  // An identical linear pointer trajectory sampled at each display rate.
  for (let i = 1; i <= hz; i++)
    advance(body, particles, edges, 1000 / hz, { particle: root, point: [(-120 * i) / hz, (80 * i) / hz] });
  launch(root, [-120, 80]);
  const checkpoints: number[][] = [];
  for (let i = 1; i <= hz; i++) {
    advance(body, particles, edges, 1000 / hz);
    if (i === hz / 2 || i === hz) checkpoints.push(particles.flatMap((p) => [p.ox, p.oy, p.vx / 12, p.vy / 12]));
  }
  return checkpoints;
}

describe('soft body', () => {
  it('matches drag and release at 30/60/144Hz to within 3% of the gesture distance', () => {
    const runs = [30, 60, 144].map(trajectory);
    for (const run of runs.slice(1))
      for (let i = 0; i < 2; i++)
        expect(Math.max(...run[i]!.map((v, j) => Math.abs(v - runs[0]![i]![j]!)))).toBeLessThan(144 * 0.03);
  });
  it('transmits along links with lag, attenuation and rotation, leaving disconnected particles still', () => {
    const { particles, edges, body } = chain(),
      [a, b, c] = particles as [Particle, Particle, Particle, Particle],
      other = particle(600, 600);
    particles.push(other);
    advance(body, particles, edges, STEP * 1000, { particle: a, point: [-50, 60] });
    expect(distance(b)).toBeGreaterThan(distance(c));
    expect(distance(b)).toBeLessThan(distance(a));
    const angle = Math.atan2(b.oy - a.oy, 60 + b.ox - a.ox);
    expect(Math.abs(angle)).toBeGreaterThan(0.1);
    const early = distance(c);
    for (let i = 0; i < 20; i++) advance(body, particles, edges, STEP * 1000, { particle: a, point: [-50, 60] });
    expect(distance(c)).toBeGreaterThan(early);
    expect(distance(other)).toBe(0);
  });
  it('flings past the same endpoint farther with a fast hand and caps world-space speed at every zoom', () => {
    const peak = (speed: number) => {
      const p = particle(),
        body = softBody();
      p.ox = 100;
      launch(p, [speed, 0]);
      let max = p.ox;
      for (let i = 0; i < 180; i++) {
        advance(body, [p], [], STEP * 1000);
        max = Math.max(max, p.ox);
      }
      return max - 100;
    };
    expect(peak(1200)).toBeGreaterThan(peak(40) + 12);
    for (const zoom of [0.5, 1, 5]) {
      const p = particle();
      launch(p, [10000, -10000], zoom);
      expect(Math.hypot(p.vx, p.vy)).toBeLessThanOrEqual(THROW_SPEED + 1e-8);
    }
    const p = particle();
    launch(p, [400, 0], 2);
    expect(p.vx).toBe(200);
  });
  it('overshoots gently after slow release and returns the whole chain within 0.5px in 2.5 seconds', () => {
    const { particles, edges, body } = chain(),
      root = particles[0]!;
    for (let i = 0; i < 120; i++) advance(body, particles, edges, STEP * 1000, { particle: root, point: [-120, 80] });
    launch(root, [0, 0]);
    let over = false;
    for (let i = 0; i < 300; i++) {
      advance(body, particles, edges, STEP * 1000);
      over ||= root.ox > 0;
    }
    expect(over).toBe(true);
    expect(Math.max(...particles.map(distance))).toBeLessThan(0.5);
  });
  it('dissipates unforced mechanical energy monotonically and stays asleep during a long run', () => {
    const p = particle(),
      body = softBody();
    p.ox = 200;
    p.vy = 100;
    const energy = () => (p.vx ** 2 + p.vy ** 2 + HOME * (p.ox ** 2 + p.oy ** 2)) / 2;
    let previous = energy();
    for (let i = 0; i < 120 * 30; i++) {
      advance(body, [p], [], STEP * 1000);
      const current = energy();
      expect(current).toBeLessThanOrEqual(previous + 1e-8);
      previous = current;
    }
    expect(previous).toBe(0);
  });
  it('survives compression, coincident particles and suspended-tab time without exploding', () => {
    const { particles, edges, body } = chain(),
      root = particles[0]!;
    const coincident: Constraint = { a: root, b: particle() };
    edges.push(coincident);
    for (let i = 0; i < 1000; i++)
      advance(
        body,
        particles,
        edges,
        i === 10 ? 100000 : 1000 / 30,
        i < 30 ? { particle: root, point: [60, 0] } : undefined,
      );
    expect(particles.every((p) => Number.isFinite(distance(p)))).toBe(true);
    expect(Math.max(...particles.map(distance))).toBe(0);
    expect(body.remainder).toBeLessThan(STEP);
  });
});

it('keeps connected beads separated even when the pointer lands on its neighbor exactly', () => {
  const a = particle(),
    b = particle(60),
    body = softBody();
  advance(body, [a, b], [{ a, b }], STEP * 1000, { particle: a, point: [60, 0] });
  expect(Math.hypot(60 + b.ox - a.ox, b.oy - a.oy)).toBeGreaterThanOrEqual(MIN_SEPARATION);
});

it('dissipates the total kinetic, home and elastic energy of a released chain', () => {
  const { particles, edges, body } = chain(),
    root = particles[0]!;
  for (let i = 0; i < 60; i++) advance(body, particles, edges, STEP * 1000, { particle: root, point: [-100, 60] });
  launch(root, [-700, 400]);
  const energy = () =>
    particles.reduce((total, p) => total + (p.vx ** 2 + p.vy ** 2 + HOME * (p.ox ** 2 + p.oy ** 2)) / 2, 0) +
    edges.reduce((total, { a, b }) => {
      const rest = Math.hypot(b.baseX! - a.baseX!, b.baseY! - a.baseY!),
        length = Math.hypot(b.baseX! + b.ox - a.baseX! - a.ox, b.baseY! + b.oy - a.baseY! - a.oy),
        e = Math.max(0, length - rest),
        c = Math.min(0, length - rest * COMPRESSION);
      return total + ((e * e) / 2 + (1.5 * e ** 4) / rest ** 2 + (c * c) / 8) / COMPLIANCE;
    }, 0);
  let previous = energy();
  for (let i = 0; i < 120 * 10; i++) {
    advance(body, particles, edges, STEP * 1000);
    const current = energy();
    expect(current).toBeLessThanOrEqual(previous + 1e-6);
    previous = current;
  }
  expect(previous).toBe(0);
});
