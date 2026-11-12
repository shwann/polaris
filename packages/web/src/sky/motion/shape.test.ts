import { expect, it } from 'vitest';
import { repairOrder, shapeTargets } from './shape';
import type { Particle } from './softbody';

it('fits a translated and rotated shape without adding shrinkage or resisting its centroid', () => {
  const angle = 0.7,
    tx = 40,
    ty = -25;
  const group = [
    [0, 0],
    [30, 10],
    [-40, 50],
    [20, -30],
  ].map(([x, y]) => ({
    baseX: x!,
    baseY: y!,
    ox: tx + x! * Math.cos(angle) - y! * Math.sin(angle) - x!,
    oy: ty + x! * Math.sin(angle) + y! * Math.cos(angle) - y!,
    vx: 0,
    vy: 0,
  }));
  shapeTargets(group).forEach((target, i) => {
    expect(target[0]).toBeCloseTo(group[i]!.ox, 8);
    expect(target[1]).toBeCloseTo(group[i]!.oy, 8);
  });
});

it('preserves a fixed root and radial distances when removing a swapped pair of angular neighbours', () => {
  const group: Particle[] = [
    [0, 0],
    [-40, -10],
    [-80, -30],
    [-100, 20],
    [-50, 60],
  ].map(([x, y]) => ({ baseX: x, baseY: y, ox: 0, oy: 0, vx: 0, vy: 0 }));
  const root = group[0]!;
  group[1]!.oy = -15;
  group[2]!.oy = 10;
  const radii = group.map((p) => Math.hypot(p.baseX! + p.ox, p.baseY! + p.oy));
  repairOrder(group, root);
  expect([root.ox, root.oy]).toEqual([0, 0]);
  group.forEach((p, i) => expect(Math.hypot(p.baseX! + p.ox, p.baseY! + p.oy)).toBeCloseTo(radii[i]!, 8));
  const angle = (p: Particle) => Math.atan2(p.baseY! + p.oy, p.baseX! + p.ox);
  expect(angle(group[1]!)).toBeLessThan(angle(group[2]!));
});
