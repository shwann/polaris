import '../../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture, pointer } from '../../testFixture';
import { attachInput } from '../../input';
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
function setup(reduced = false) {
  const f = fixture(reduced);
  f.s.home = (star, t) => home(f.s, star, t);
  f.s.rebuild = () => rebuild(f.s);
  return f;
}

const lanes = ['done', 'waiting', 'doing', 'risk', 'release', 'planned'] as const;
const figureTasks = () =>
  lanes.flatMap((lane) =>
    Array.from({ length: lane === 'done' ? 69 : lane === 'waiting' ? 19 : 12 }, (_, i) => make(`${lane}${i}`, lane, i)),
  );
function runFrames(s: ReturnType<typeof setup>['s'], duration: number, fps = 60) {
  const start = s.last || 1000;
  for (let i = 1; i <= Math.ceil((duration * fps) / 1000); i++) s.frame(start + (i * 1000) / fps);
}
function expectSettled(s: ReturnType<typeof setup>['s']) {
  expect(s.figures.size).toBe(6);
  const skyK = s.skyK;
  s.skyK = 1; // Compare against the fully open chart, not a still-moving transition target.
  for (const [lane, figure] of s.figures) {
    const xs = figure.nodes.map((node) => node.point[0]),
      ys = figure.nodes.map((node) => node.point[1]),
      size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const error = Math.max(
      ...figure.nodes.map((node) => {
        const star = s.stars.get(node.id)!,
          [x, y] = s.home(star, s.last);
        return Math.hypot(star.x - x, star.y - y) / size;
      }),
    );
    expect.soft(error, `${lane} maximum distance / template size`).toBeLessThanOrEqual(0.04);
  }
  s.skyK = skyK;
}
function loadBoard(reduced = false) {
  const f = setup(reduced),
    { s } = f;
  vi.stubGlobal('innerWidth', 2000);
  vi.stubGlobal('innerHeight', 1250);
  s.sky = false;
  s.skyK = 0;
  s.size();
  updateTasks(s, figureTasks());
  runFrames(s, 3000);
  return f;
}
function openSky(s: ReturnType<typeof setup>['s']) {
  s.sky = true;
  s.rebuild();
  s.ripples.push({ x: s.w / 2, y: s.h / 2, c: [255, 255, 255], t0: s.last, power: 0.5, hit: new Set() });
}
it.each([30, 60, 144])(
  'forms every figure within 1.5 seconds of first opening the sky at %sHz without dragging',
  (fps) => {
    const { s, registry } = loadBoard();
    openSky(s);
    runFrames(s, 1500, fps);
    expectSettled(s);
    registry.dispose();
  },
  10000,
);
it('forms the figures again after returning to the board and reopening the sky', () => {
  const { s, registry } = loadBoard();
  openSky(s);
  runFrames(s, 1500);
  s.sky = false;
  s.rebuild();
  runFrames(s, 3000);
  openSky(s);
  runFrames(s, 1500);
  expectSettled(s);
  registry.dispose();
}, 10000);
it('keeps figures formed through desktop/mobile resizes and a viewport that initially has no size', () => {
  const { s, registry } = loadBoard();
  vi.stubGlobal('innerWidth', 0);
  vi.stubGlobal('innerHeight', 0);
  s.size();
  openSky(s);
  for (const [width, height] of [
    [2000, 1250],
    [1400, 900],
    [375, 812],
    [2000, 1250],
  ]) {
    vi.stubGlobal('innerWidth', width);
    vi.stubGlobal('innerHeight', height);
    s.size();
    runFrames(s, 1500);
    expectSettled(s);
  }
  registry.dispose();
});
it('forms new assignments after tasks are added, removed, or moved to another lane', () => {
  const { s, registry } = loadBoard();
  openSky(s);
  runFrames(s, 1500);
  const added = [
    ...figureTasks(),
    ...lanes.flatMap((lane) => Array.from({ length: 4 }, (_, i) => make(`${lane}-new${i}`, lane, i))),
  ];
  updateTasks(s, added);
  runFrames(s, 1500);
  expectSettled(s);
  const removed = added
    .filter((_, i) => i % 3 !== 0)
    .map((task, i) => (i % 7 === 0 ? { ...task, lane: 'doing' as const } : task));
  updateTasks(s, removed);
  runFrames(s, 1500);
  expectSettled(s);
  registry.dispose();
});
it('forms every figure on the first sky frame with reduced motion', () => {
  const { s, registry } = loadBoard(true);
  openSky(s);
  runFrames(s, 1000 / 60);
  expectSettled(s);
  registry.dispose();
});
it('ends formation projection once the migrating bases reach the slowly rotating sky layout', () => {
  const { s, registry } = loadBoard();
  openSky(s);
  runFrames(s, 4000);
  expect(s.figureMotion?.size).toBe(0);
  expectSettled(s);
  registry.dispose();
});

it.each(lanes)('returns the %s stars to their own slots in sequence after a long pull', (lane) => {
  const { s, registry } = setup(),
    detach = attachInput(s);
  updateTasks(
    s,
    figureTasks().filter((task) => task.lane === lane),
  );
  runFrames(s, 1800);
  const nodes = s.figures.get(lane)!.nodes;
  const root = s.stars.get(nodes.find((node) => node.main)?.id ?? nodes[0]!.id)!;
  const [x, y] = s.toScreen(...s.at(root.x, root.y, 14)),
    start = s.last;
  pointer('pointerdown', x, y, start);
  expect(s.drag?.star).toBe(root);
  pointer('pointermove', x - 300, y + 210, start + 16);
  runFrames(s, 480);
  const list = nodes.map((node) => s.stars.get(node.id)!);
  expect(Math.hypot(root.ox, root.oy)).toBeGreaterThan(300);
  pointer('pointerup', x - 300, y + 210, s.last + 1);
  pointer('pointerleave', x - 300, y + 210, s.last + 2);
  runFrames(s, 300);
  const displaced = list.filter((star) => Math.hypot(star.ox, star.oy) > 0.1);
  expect(displaced.length).toBeGreaterThan(1);
  runFrames(s, 1250);
  expect(Math.hypot(root.ox, root.oy)).toBeLessThan(0.001);
  expect(displaced.some((star) => Math.hypot(star.ox, star.oy) > 0.1)).toBe(true);
  runFrames(s, 2650);
  expect(list.every((star) => Math.hypot(star.ox, star.oy) < 0.001)).toBe(true);
  expect(s.figureReturns?.size).toBe(0);
  detach();
  registry.dispose();
});
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
