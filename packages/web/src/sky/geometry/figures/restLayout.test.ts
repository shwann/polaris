import '../../../../tests/support';
import { expect, it } from 'vitest';
import { fixture } from '../../testFixture';
import { home, rebuild } from '../clusters';
import { updateTasks } from '../../updateTasks';
import { constellation } from '../../motion/constellation';
import type { Task } from '../../../domain/types';

for (const lane of ['risk', 'release', 'planned'] as const) {
  it.each([1, 3])(`preserves the entire ${lane} silhouette while idle, held and returning at zoom %i`, (zoom) => {
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
      expect(s.home(star, 150000)).toEqual(s.home(star, 0));
    }
    const check = (dx: number, dy: number) => {
      for (const star of stars) {
        expect(star.x - star.baseX!).toBeCloseTo(dx, 8);
        expect(star.y - star.baseY!).toBeCloseTo(dy, 8);
      }
    };
    for (let i = 0; i < 120; i++) constellation(s, stars, 1000 / 120);
    check(0, 0);
    // Holding either the main star or the last dim satellite translates every star identically.
    for (const root of [main, stars.at(-1)!]) {
      s.px = (root.baseX! + 130) * zoom;
      s.py = (root.baseY! - 80) * zoom;
      s.drag = { star: root, dip: -1, moved: true, grab: [0, 0], samples: [], x0: 0, y0: 0, cx: 0, cy: 0 };
      constellation(s, stars, 1000 / 60);
      check(130, -80);
      s.drag = null;
    }
    for (let i = 0; i < 600; i++) {
      s.physics(60000 + (i * 1000) / 120, 1000 / 120, stars);
      check(main.ox, main.oy);
    }
    expect(Math.hypot(main.ox, main.oy)).toBeLessThan(1);
    registry.dispose();
  });
}
