import '../../../../tests/support';
import { expect, it } from 'vitest';
import { fixture } from '../../testFixture';
import { home, rebuild } from '../clusters';
import { updateTasks } from '../../updateTasks';
import { constellation } from '../../motion/constellation';
import { releaseHeld } from '../../motion/drag';
import type { Task } from '../../../domain/types';

for (const lane of ['risk', 'release', 'planned'] as const) {
  it.each([1, 3])(`anchors the ${lane} silhouette and springs individual stars home at zoom %i`, (zoom) => {
    const { s, registry } = fixture();
    Object.assign(s, { w: 2000, h: 1250, unit: 1750, spinT: 60000 });
    s.home = (star, t) => home(s, star, t);
    s.rebuild = () => rebuild(s);
    s.cam.s = s.camT.s = zoom;
    const count = lane === 'risk' ? 8 : lane === 'release' ? 12 : 1;
    const input: Task[] = Array.from({ length: count }, (_, i) => ({
      id: `t${i}`,
      lane,
      systemKey: 'main',
      code: `T${i}`,
      title: `Task ${i}`,
      status: '',
      steps: [],
      reqIds: [],
      updatedAt: new Date(1700000000000 + i * 86400000).toISOString(),
    }));
    updateTasks(s, input);
    const stars = [...s.stars.values()],
      main = stars.find((star) => star.figureRole!.main)!;
    for (const star of stars) {
      [star.baseX, star.baseY] = s.home(star, 60000);
      [star.x, star.y] = [star.baseX, star.baseY];
      expect(s.home(star, 150000)).toEqual(s.home(star, 60000));
      if (lane === 'planned' || star.figureRole?.slot === 'pivot') {
        expect(s.home(star, 150000)).toEqual(s.home(star, 0));
      }
    }
    const check = (dx: number, dy: number) => {
      for (const star of stars) {
        expect(star.x - star.baseX!).toBeCloseTo(dx, 8);
        expect(star.y - star.baseY!).toBeCloseTo(dy, 8);
      }
    };
    for (let i = 0; i < 120; i++) constellation(s, stars, 1000 / 120);
    check(0, 0);
    // Main stars and dim satellites each follow the pointer independently.
    for (const root of [main, stars.at(-1)!]) {
      s.px = (root.baseX! + 130) * zoom;
      s.py = (root.baseY! - 80) * zoom;
      s.drag = { star: root, dip: -1, moved: true, grab: [0, 0], samples: [], x0: 0, y0: 0, cx: 0, cy: 0 };
      for (let i = 0; i < 120; i++) constellation(s, stars, 1000 / 120);
      expect(root.ox).toBeCloseTo(130, 8);
      expect(root.oy).toBeCloseTo(-80, 8);
      const neighbors = new Set(s.trees.get(lane)!.flatMap(([a, b]) => (a === root ? [b] : b === root ? [a] : [])));
      const others = stars.filter((star) => star !== root && !neighbors.has(star));
      if (others.length)
        expect(Math.max(...others.map((star) => Math.hypot(star.ox, star.oy)))).toBeLessThan(Math.hypot(130, 80) * 0.6);
      releaseHeld(s, s.drag, new MouseEvent('pointerup', { clientX: s.px, clientY: s.py }) as PointerEvent);
      s.drag = null;
      for (let i = 0; i < 492; i++) constellation(s, stars, 1000 / 120);
      const nodes = s.figures.get(lane)!.nodes;
      const size = Math.max(
        Math.max(...nodes.map((node) => node.point[0])) - Math.min(...nodes.map((node) => node.point[0])),
        Math.max(...nodes.map((node) => node.point[1])) - Math.min(...nodes.map((node) => node.point[1])),
        1,
      );
      expect(Math.max(...stars.map((star) => Math.hypot(star.ox, star.oy)))).toBeLessThanOrEqual(size * 0.04);
    }
    registry.dispose();
  });
}
