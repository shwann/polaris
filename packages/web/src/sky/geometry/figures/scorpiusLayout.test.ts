import '../../../../tests/support';
import { expect, it } from 'vitest';
import { fixture } from '../../testFixture';
import { home, rebuild } from '../clusters';
import { updateTasks } from '../../updateTasks';
import { constellation, clusterTether } from '../../motion/constellation';
import { SCORPIUS_BOUNDS, SCORPIUS_SLOTS } from './scorpius';
import { localPoint } from '../../draw/figures';
import type { Task } from '../../../domain/types';
import type { Point } from '../../types';

const tasks = (quiet: number): Task[] =>
  Array.from({ length: 19 }, (_, i) => ({
    id: `t${String(i).padStart(2, '0')}`,
    code: `T${i}`,
    title: `Task ${i}`,
    lane: 'waiting',
    systemKey: 'main',
    status: '',
    steps: [],
    reqIds: [],
    waitingOn: i < quiet ? (i % 2 ? 'dependency' : 'customer') : 'user',
    updatedAt: new Date(1700000000000 + i * 86400000).toISOString(),
  }));

it.each([1, 3])('keeps all nineteen normalized template positions within 4%% at zoom %s, idle and held', (zoom) => {
  const { s, registry } = fixture();
  Object.assign(s, { w: 2000, h: 1250, unit: 1750, spinT: 60000 });
  s.home = (star, t) => home(s, star, t);
  s.rebuild = () => rebuild(s);
  s.cam.s = s.camT.s = zoom;
  updateTasks(s, tasks(8));
  const [cx, cy, r] = s.centre('waiting'),
    [x0, y0, x1, y1] = SCORPIUS_BOUNDS;
  const scale = Math.min((2.5 * r) / (x1 - x0), (1.7 * r) / (y1 - y0));
  const extra: Point[] = [
    [0.2, 0.88],
    [0.29, 0.88],
    [0.38, 0.88],
    [0.47, 0.88],
  ];
  const stars = [...s.stars.values()];
  const targets = stars.map((star): Point => {
    const slot = star.figureRole!.slot,
      canonical = SCORPIUS_SLOTS.find(([name]) => name === slot);
    const [u, v] = canonical ? [canonical[1], canonical[2]] : extra[Number(slot.slice(6)) - 15]!;
    return [cx + (u - (x0 + x1) / 2) * scale, cy + (v - (y0 + y1) / 2) * scale];
  });
  stars.forEach((star) => {
    [star.baseX, star.baseY] = s.home(star, 60000);
    [star.x, star.y] = [star.baseX, star.baseY];
    star.alpha = 1;
  });
  const check = (dx = 0, dy = 0) => {
    const error =
      Math.max(...stars.map((star, i) => Math.hypot(star.x - dx - targets[i]![0], star.y - dy - targets[i]![1]))) /
      (scale * (x1 - x0));
    expect(error).toBeLessThanOrEqual(0.04);
  };
  for (let i = 0; i < 120; i++) constellation(s, stars, 1000 / 120);
  check();
  // The delta-to-heart tether ignores a previously selected satellite.
  s.tetherHub.set('waiting', stars[0]!.id);
  const heart = stars.find((star) => star.figureRole!.main)!;
  expect(clusterTether(s, 3, [cx - 500, cy - 200], true)?.star).toBe(heart);
  // Holding a claw and the heart must both translate every star without changing any proportions.
  for (const root of [stars.find((star) => star.figureRole!.slot === 'UJ1')!, heart]) {
    const dx = 130,
      dy = -80;
    s.px = (root.baseX! + dx) * zoom;
    s.py = (root.baseY! + dy) * zoom;
    s.drag = { star: root, dip: -1, moved: true, grab: [0, 0], samples: [], x0: 0, y0: 0, cx: 0, cy: 0 };
    constellation(s, stars, 1000 / 60);
    check(dx, dy);
    s.drag = null;
  }
  for (let i = 0; i < 600; i++) {
    s.physics(60000 + (i * 1000) / 120, 1000 / 120, stars);
    check(stars[0]!.ox, stars[0]!.oy);
  }
  const figure = s.figures.get('waiting')!,
    spur = figure.spur!;
  const tip = localPoint(figure.nodes[spur.from]!.point, figure.nodes[spur.at]!.point, spur.offset);
  expect(tip[0]).toBeLessThan(figure.nodes[spur.at]!.point[0]);
  expect(tip[1]).toBeGreaterThan(figure.nodes[spur.at]!.point[1]);
  registry.dispose();
});

it('keeps all fifteen skeleton slots for user waits, independently of external task count', () => {
  const { s, registry } = fixture();
  s.rebuild = () => rebuild(s);
  const input = tasks(0).slice(0, 15);
  updateTasks(s, [
    ...input,
    ...tasks(8)
      .slice(0, 8)
      .map((t) => ({ ...t, id: `external-${t.id}` })),
  ]);
  const figure = s.figures.get('waiting')!;
  expect(figure.nodes.filter((n) => n.bright)).toHaveLength(15);
  expect(figure.nodes.find((n) => n.slot === 'S')?.bright).toBe(true);
  expect(
    figure.nodes.filter((n) => n.id.startsWith('external-')).every((n) => !n.bright && !/^(T|S)/.test(n.slot)),
  ).toBe(true);
  registry.dispose();
});
