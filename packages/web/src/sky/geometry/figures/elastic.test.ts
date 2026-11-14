import '../../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../../testFixture';
import { home, rebuild } from '../clusters';
import { updateTasks } from '../../updateTasks';
import { constellation } from '../../motion/constellation';
import { releaseHeld } from '../../motion/drag';
import { drawFigure } from '../../draw/figures';
import type { Task } from '../../../domain/types';

const lanes = ['done', 'waiting', 'doing', 'risk', 'release', 'planned'] as const;
const figureTasks = (): Task[] =>
  lanes.flatMap((lane) =>
    Array.from({ length: lane === 'done' ? 69 : lane === 'waiting' ? 19 : 12 }, (_, i) => ({
      id: `${lane}${i}`,
      lane,
      systemKey: 'main',
      code: `${lane}${i}`,
      title: `${lane}${i}`,
      status: '',
      steps: [],
      reqIds: [],
      updatedAt: new Date(1700000000000 + i * 86400000).toISOString(),
      progress: i,
    })),
  );
function setup() {
  const f = fixture();
  f.s.home = (star, t) => home(f.s, star, t);
  f.s.rebuild = () => rebuild(f.s);
  return f;
}

it.each(lanes.flatMap((lane) => [30, 60, 144].flatMap((fps) => [false, true].map((fast) => ({ lane, fps, fast })))))(
  'pulls one $lane star at $fps Hz and returns home within 1.5 seconds (fast release: $fast)',
  ({ lane, fps, fast }) => {
    const { s, registry } = setup();
    Object.assign(s, { w: 2000, h: 1250, unit: 1750 });
    updateTasks(
      s,
      figureTasks().filter((task) => task.lane === lane),
    );
    const stars = [...s.stars.values()],
      figure = s.figures.get(lane)!,
      size = Math.max(
        Math.max(...figure.nodes.map((node) => node.point[0])) - Math.min(...figure.nodes.map((node) => node.point[0])),
        Math.max(...figure.nodes.map((node) => node.point[1])) - Math.min(...figure.nodes.map((node) => node.point[1])),
      );
    for (const star of stars) {
      [star.baseX, star.baseY] = s.home(star, 0);
      [star.x, star.y] = [star.baseX, star.baseY];
    }
    const main = stars.find((star) => star.figureRole?.main)!,
      outer = stars.reduce((a, b) => (Math.hypot(a.layoutX!, a.layoutY!) > Math.hypot(b.layoutX!, b.layoutY!) ? a : b));
    for (const root of new Set([main, outer])) {
      const angle = Math.atan2(root.layoutY!, root.layoutX!),
        dx = 150 * Math.cos(angle),
        dy = 150 * Math.sin(angle),
        neighbors = new Set((s.trees.get(lane) || []).flatMap(([a, b]) => (a === root ? [b] : b === root ? [a] : []))),
        others = stars.filter((star) => star !== root && !neighbors.has(star));
      let peak = 0;
      s.drag = { star: root, dip: -1, moved: true, grab: [0, 0], samples: [], x0: 0, y0: 0, cx: 0, cy: 0 };
      for (let i = 1; i <= fps; i++) {
        const k = Math.min(1, i / (fps * 0.3));
        s.px = root.baseX! + dx * k;
        s.py = root.baseY! + dy * k;
        constellation(s, stars, 1000 / fps);
        expect(root.ox).toBeCloseTo(dx * k, 8);
        expect(root.oy).toBeCloseTo(dy * k, 8);
        peak = Math.max(peak, ...others.map((star) => Math.hypot(star.ox, star.oy)));
      }
      expect.soft(peak, `${lane}/${root.figureRole?.slot} nonadjacent peak`).toBeLessThan(150 * 0.2);
      expect(Math.max(...[...neighbors].map((star) => Math.hypot(star.ox, star.oy)))).toBeGreaterThan(0.1);
      const before = Math.hypot(root.ox, root.oy);
      const up = new MouseEvent('pointerup', { clientX: s.px, clientY: s.py }) as PointerEvent;
      Object.defineProperty(up, 'timeStamp', { value: 1100 });
      if (fast)
        s.drag.samples = [
          { x: s.px - dx * 0.3, y: s.py - dy * 0.3, t: 1070 },
          { x: s.px, y: s.py, t: 1100 },
        ];
      releaseHeld(s, s.drag, up);
      s.drag = null;
      constellation(s, stars, 1000 / fps);
      expect(Math.hypot(root.ox, root.oy)).toBeGreaterThan(before * 0.5);
      for (let i = 1; i < Math.ceil(fps * 1.5); i++) constellation(s, stars, 1000 / fps);
      expect
        .soft(
          Math.max(...stars.map((star) => Math.hypot(star.ox, star.oy))) / size,
          `${lane}/${root.figureRole?.slot} return`,
        )
        .toBeLessThanOrEqual(0.04);
      expect(stars.every((star) => Number.isFinite(star.x) && Number.isFinite(star.y))).toBe(true);
      for (let i = 0; i < fps * 4; i++) constellation(s, stars, 1000 / fps);
      expect(Math.max(...stars.map((star) => Math.hypot(star.ox, star.oy)))).toBeLessThan(0.015);
    }
    registry.dispose();
  },
);

it.each([0.6, 1])('keeps elastic offsets independent through rebuilds at skyK %s', (skyK) => {
  const { s, registry } = setup();
  updateTasks(s, figureTasks());
  const stars = [...s.stars.values()],
    figure = s.figures.get('done')!,
    root = s.stars.get(figure.nodes[figure.edges[0]!.a]!.id)!;
  for (const star of stars) {
    [star.baseX, star.baseY] = s.home(star, 0);
    [star.x, star.y] = [star.baseX, star.baseY];
    star.alpha = 1;
  }
  s.skyK = skyK;
  s.px = root.x - 150;
  s.py = root.y;
  s.drag = { star: root, dip: -1, moved: true, grab: [0, 0], samples: [], x0: 0, y0: 0, cx: 0, cy: 0 };
  constellation(s, stars, 1000 / 60);
  s.rebuild();
  constellation(s, stars, 1000 / 60);
  expect(root.ox).toBeCloseTo(-150, 8);
  expect(stars.some((star) => star.group === 'done' && Math.abs(star.ox - root.ox) > 100)).toBe(true);
  vi.mocked(s.ctx.moveTo).mockClear();
  drawFigure(s, 'done');
  expect(s.ctx.moveTo).toHaveBeenCalledWith(...s.at(root.x, root.y, 14));
  releaseHeld(s, s.drag, new MouseEvent('pointerup', { clientX: s.px, clientY: s.py }) as PointerEvent);
  s.drag = null;
  s.rebuild();
  constellation(s, stars, 1000 / 60);
  expect(s.figureMotion?.get('done')).toBe('elastic');
  expect(root.ox).toBeLessThan(-75);
  expect(stars.some((star) => star.group === 'done' && Math.abs(star.ox - root.ox) > 50)).toBe(true);
  registry.dispose();
});
