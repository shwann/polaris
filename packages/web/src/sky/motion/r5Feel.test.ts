import '../../../tests/support';
import { expect, it } from 'vitest';
import { fixture, pointer } from '../testFixture';
import { attachInput } from '../input';
import { hubs } from '../layout';
import { syncHubs } from './constellation';
import type { Point, Star } from '../types';

function fling(hz: number, duration: number, dip = false, phase?: number) {
  const { s, star, registry } = fixture();
  s.w = 1440;
  s.h = 900;
  s.unit = 1260;
  s.hubs = () => hubs(s);
  syncHubs(s);
  const points: Point[] = [
    [950, 517],
    [908, 508],
    [870, 475],
    [825, 500],
    [810, 553],
    [858, 565],
    [770, 520],
    [750, 575],
    [790, 615],
  ];
  const list = dip
    ? []
    : points.map(([x, y], i) =>
        star(['CASH1', 'DESK1', 'DASH1', 'RISK1', 'RISK2', 'RISK3', 'RISK4', 'RISK5', 'RISK6'][i]!, x, y, 'risk'),
      );
  s.trees.set(
    'risk',
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [3, 6],
      [6, 7],
      [7, 8],
    ]
      .map(([a, b]) => [list[a!]!, list[b!]!] as [Star, Star])
      .filter(([a]) => !!a),
  );
  const root = dip ? s.hubParticles[3]! : list[0]!,
    [x, y] = dip ? s.hubs()[3]! : points[0]!,
    detach = attachInput(s);
  let frame = phase === undefined ? 1000 / hz : phase + 1000 / hz,
    last = 0;
  pointer('pointerdown', x, y, 0);
  const moves = phase === undefined ? 7 : duration / 10;
  for (let i = 1; i <= moves; i++) {
    const time = (duration * i) / moves;
    while (frame < time - 1e-8) {
      if (phase === undefined) s.physics(frame, frame - last, list);
      else s.frame(frame);
      last = frame;
      frame += 1000 / hz;
    }
    pointer('pointermove', x + (160 * i) / moves, y - (dip ? (60 * i) / moves : 0), time);
  }
  if (phase === undefined) s.physics(duration, duration - last, list);
  const lag = x + 160 - (dip ? x + root.ox : list[0]!.x);
  pointer('pointerup', x + 160, y - (dip ? 60 : 0), duration);
  if (!dip && duration === 70) expect(root.vx).toBeCloseTo(1400);
  if (phase !== undefined) expect(list[0]!.x).toBeCloseTo(x + 160);
  const peaks = s.hubParticles.map((p) => Math.hypot(p.ox, p.oy));
  const edges = s.trees.get('risk') || [];
  const order = () =>
    list
      .slice(1)
      .sort((a, b) => Math.atan2(a.y - list[0]!.y, a.x - list[0]!.x) - Math.atan2(b.y - list[0]!.y, b.x - list[0]!.x))
      .map((p) => p.id);
  const original = points
    .slice(1)
    .map((p, i) => ({ p, id: list[i + 1]?.id }))
    .sort(
      (a, b) =>
        Math.atan2(a.p[1] - points[0]![1], a.p[0] - points[0]![0]) -
        Math.atan2(b.p[1] - points[0]![1], b.p[0] - points[0]![0]),
    )
    .map((p) => p.id);
  const turn = (a: Star, b: Star, c: Star) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  let crossingFrames = 0,
    orderFrames = 0,
    settled = 0,
    settledSpeed = 0;
  let peak = 0,
    own = Math.hypot(root.ox, root.oy),
    carried = 0;
  for (let i = 1; i <= hz * 4; i++) {
    if (phase === undefined) s.physics(duration + (i * 1000) / hz, 1000 / hz, list);
    else s.frame(frame + ((i - 1) * 1000) / hz);
    if (!dip && duration === 70) {
      for (const [j, a] of list.entries())
        for (const b of list.slice(j + 1)) expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(20 - 1e-6);
      const crossed = edges.some(([a, b], j) =>
        edges
          .slice(j + 1)
          .some(
            ([c, d]) =>
              a !== c &&
              a !== d &&
              b !== c &&
              b !== d &&
              turn(a, b, c) * turn(a, b, d) < 0 &&
              turn(c, d, a) * turn(c, d, b) < 0,
          ),
      );
      if (crossed) crossingFrames++;
      const current = order(),
        start = current.indexOf(original[0]!);
      if (original.some((id, j) => id !== current[(start + j) % current.length])) orderFrames++;
      if (i === hz) {
        settled = Math.max(...list.map((p) => Math.hypot(p.ox, p.oy)));
        settledSpeed = Math.max(...list.map((p) => Math.hypot(p.vx, p.vy)));
      }
    }
    peak = Math.max(peak, root.ox - 160);
    carried = Math.max(carried, ...list.slice(1).map((p) => Math.hypot(p.ox, p.oy)));
    own = Math.max(own, Math.hypot(root.ox, root.oy));
    s.hubParticles.forEach((p, k) => (peaks[k] = Math.max(peaks[k]!, Math.hypot(p.ox, p.oy))));
    if (dip && i === hz) {
      expect(Math.max(...s.hubParticles.map((p) => Math.hypot(p.ox, p.oy)))).toBeLessThan(1);
      expect(Math.max(...s.hubParticles.map((p) => Math.hypot(p.vx, p.vy)))).toBeLessThan(4);
    }
  }
  detach();
  registry.dispose();
  expect(Math.max(0, ...list.map((p) => Math.hypot(p.ox, p.oy)))).toBeLessThan(0.5);
  return { peak, own, peaks, carried, lag, crossingFrames, orderFrames, settled, settledSpeed };
}
it('keeps a seven-event 160px/70ms outward fling visible with a nine-star risk tree at every refresh rate', () => {
  const runs = [30, 60, 144].map((hz) => fling(hz, 70));
  for (const r of runs) {
    expect(r.crossingFrames).toBe(0);
    expect(r.orderFrames).toBe(0);
    expect(r.settled).toBeLessThan(1);
    expect(r.settledSpeed).toBeLessThan(4);
    expect(r.carried).toBeGreaterThan(10);
    expect(r.peak).toBeGreaterThanOrEqual(40);
    expect(r.peak).toBeLessThanOrEqual(90);
  }
  expect(Math.max(...runs.map((r) => r.peak)) - Math.min(...runs.map((r) => r.peak))).toBeLessThan(5);
  for (const hz of [30, 60, 144]) expect(fling(hz, 4000).peak).toBe(0);
});
it.each([30, 60, 144])('attenuates the real Dipper/polar topology after a 60ms Tianquan fling at %sHz', (hz) => {
  const r = fling(hz, 60, true);
  for (const [k, peak] of r.peaks.entries())
    if (k !== 3) {
      expect(peak).toBeLessThanOrEqual(60);
      expect(peak).toBeLessThanOrEqual(r.own * 0.6);
    }
  expect(Math.max(...r.peaks.filter((_, k) => k !== 3))).toBeGreaterThan(3);
});

it.each([0, 4, 8, 12, 16])(
  'replays independent 10ms pointer timestamps through full 60Hz frames at phase %sms',
  (phase) => {
    const run = fling(60, 70, false, phase);
    expect(run.crossingFrames).toBe(0);
    expect(run.orderFrames).toBe(0);
    expect(run.settled).toBeLessThan(1);
    expect(run.settledSpeed).toBeLessThan(4);
    expect(run.lag).toBeGreaterThan(20);
    expect(run.peak).toBeGreaterThanOrEqual(40);
    expect(run.peak).toBeLessThanOrEqual(90);
  },
);

it('does not overshoot when independent 10ms inputs slowly drag 160px over one second', () => {
  expect(fling(60, 1000, false, 12).peak).toBe(0);
});
