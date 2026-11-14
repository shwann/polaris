import '../../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../../testFixture';
import { home, rebuild } from '../clusters';
import { updateTasks } from '../../updateTasks';
import { constellation } from '../../motion/constellation';
import { drawFigure } from '../../draw/figures';
import { drawClusters } from '../../draw/clusters';
import { chainLit } from '../../draw/stars';
import type { Task } from '../../../domain/types';

const make = (id: string, lane: Task['lane'], i = 0): Task => ({
  id,
  lane,
  systemKey: 'main',
  code: id,
  title: id,
  status: '',
  steps: [],
  reqIds: ['R1'],
  updatedAt: new Date(1700000000000 + i * 86400000).toISOString(),
  progress: i,
});
function setup() {
  const f = fixture();
  f.s.home = (star, t) => home(f.s, star, t);
  f.s.rebuild = () => rebuild(f.s);
  return f;
}
it('rebuilds the arrow assignment when progress changes without a lane change', () => {
  const { s, registry } = setup(),
    input = Array.from({ length: 5 }, (_, i) => make(`t${i}`, 'doing', i));
  updateTasks(s, input);
  expect(s.stars.get('t4')!.figureRole?.main).toBe(true);
  updateTasks(
    s,
    input.map((t) => (t.id === 't0' ? { ...t, progress: 100 } : t)),
  );
  expect(s.stars.get('t0')!.figureRole?.main).toBe(true);
  expect(s.stars.get('t4')!.figureRole?.main).toBe(false);
  registry.dispose();
});
it('keeps the board layout and assigns all six figures only in the sky', () => {
  const { s, registry } = setup();
  s.sky = false;
  updateTasks(
    s,
    ['doing', 'waiting', 'done', 'planned', 'release', 'risk'].flatMap((lane) =>
      Array.from({ length: 5 }, (_, i) => make(`${lane}${i}`, lane as Task['lane'], i)),
    ),
  );
  expect(s.figures.size).toBe(0);
  s.sky = true;
  rebuild(s);
  expect([...s.figures.keys()].sort()).toEqual(['doing', 'done', 'planned', 'release', 'risk', 'waiting']);
  for (const lane of ['planned', 'release', 'risk'] as const) {
    expect(s.trees.get(lane)?.length).toBeGreaterThanOrEqual(4);
    expect([...s.stars.values()].filter((t) => t.group === lane).every((t) => t.figureRole)).toBe(true);
  }
  registry.dispose();
});
it('draws the done outline at overview and adds dim triangles when zoomed in', () => {
  const { s, registry } = setup();
  updateTasks(
    s,
    Array.from({ length: 69 }, (_, i) => make(`t${i}`, 'done', i)),
  );
  for (const star of s.stars.values()) star.alpha = 1;
  const stroke = vi.fn();
  s.ctx.stroke = stroke;
  s.cam.s = 1;
  drawClusters(s, 0, [...s.stars.values()]);
  const overview = stroke.mock.calls.length;
  expect(overview).toBeGreaterThan(30);
  stroke.mockClear();
  s.cam.s = 3;
  drawFigure(s, 'done');
  expect(stroke.mock.calls.length).toBeGreaterThan(overview);
  expect(vi.mocked(s.ctx.setLineDash).mock.calls.some(([dash]) => Array.from(dash)[0] === 2)).toBe(true);
  expect(vi.mocked(s.ctx.setLineDash).mock.calls.some(([dash]) => Array.from(dash)[0] === 4)).toBe(true);
  registry.dispose();
});
it('retains requirement hover highlighting after figure assignment', () => {
  const { s, registry } = setup();
  updateTasks(
    s,
    Array.from({ length: 5 }, (_, i) => make(`t${i}`, 'doing', i)),
  );
  for (const star of s.stars.values()) star.alpha = 1;
  s.hover = s.stars.get('t0')!;
  expect(chainLit(s, s.stars.get('t4')!)).toBe(true);
  const style = vi.fn();
  Object.defineProperty(s.ctx, 'strokeStyle', { configurable: true, set: style });
  drawFigure(s, 'doing');
  expect(style.mock.calls.some(([value]) => typeof value === 'string' && value.endsWith(',1.000)'))).toBe(true);
  registry.dispose();
});
it.each(['waiting', 'doing', 'done', 'risk', 'release', 'planned'] as const)(
  'transmits a held %s star through the existing soft body to every star',
  (lane) => {
    const { s, registry } = setup(),
      count = lane === 'waiting' ? 19 : lane === 'done' ? 69 : 5;
    updateTasks(
      s,
      Array.from({ length: count }, (_, i) => make(`t${i}`, lane, i)),
    );
    const stars = [...s.stars.values()];
    for (const star of stars) {
      [star.baseX, star.baseY] = s.home(star, 0);
      [star.x, star.y] = [star.baseX, star.baseY];
    }
    const root = stars.find((star) => star.figureRole?.main)!;
    s.px = root.x + 300;
    s.py = root.y - 200;
    s.drag = { star: root, dip: -1, moved: true, grab: [0, 0], samples: [], x0: 0, y0: 0, cx: 0, cy: 0 };
    for (let i = 0; i < 120; i++) constellation(s, stars, 1000 / 120);
    expect(Math.min(...stars.map((star) => Math.hypot(star.ox, star.oy)))).toBeGreaterThan(0.1);
    expect(stars.every((star) => Number.isFinite(star.x) && Number.isFinite(star.y))).toBe(true);
    registry.dispose();
  },
);

it('keeps dense fish at their exact homes without collision pressure distorting the outline', () => {
  const { s, registry } = setup();
  updateTasks(
    s,
    Array.from({ length: 69 }, (_, i) => make(`t${i}`, 'done', i)),
  );
  const stars = [...s.stars.values()];
  for (const star of stars) {
    [star.baseX, star.baseY] = s.home(star, 0);
    [star.x, star.y] = [star.baseX, star.baseY];
  }
  for (let i = 0; i < 120; i++) constellation(s, stars, 1000 / 120);
  expect(stars.every((star) => Math.hypot(star.ox, star.oy) < 1e-8)).toBe(true);
  registry.dispose();
});

it.each(['risk', 'release', 'planned'] as const)('reassigns the %s main star when its date changes', (lane) => {
  const { s, registry } = setup(),
    input = Array.from({ length: 4 }, (_, i) => ({
      ...make(`t${i}`, lane, i),
      createdAt: make('', lane, i).updatedAt,
    }));
  updateTasks(s, input);
  expect(s.stars.get('t0')!.figureRole?.main).toBe(true);
  updateTasks(
    s,
    input.map((task) =>
      task.id === 't3'
        ? {
            ...task,
            ...(lane === 'risk'
              ? { waitingSince: '2000-01-01' }
              : lane === 'planned'
                ? { createdAt: '2000-01-01' }
                : { updatedAt: '2000-01-01' }),
          }
        : task,
    ),
  );
  expect(s.stars.get('t3')!.figureRole?.main).toBe(true);
  registry.dispose();
});
