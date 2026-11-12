import '../../../tests/support';
import { expect, it } from 'vitest';
import { fixture, pointer } from '../testFixture';
import { attachInput } from '../input';
import { hubs } from '../layout';
import { syncHubs } from './constellation';
import type { Point, Star } from '../types';

function fling(hz: number, duration: number, dip = false) {
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
  let frame = 1000 / hz,
    last = 0;
  pointer('pointerdown', x, y, 0);
  for (let i = 1; i <= 7; i++) {
    const time = (duration * i) / 7;
    while (frame < time - 1e-8) {
      s.physics(frame, frame - last, list);
      last = frame;
      frame += 1000 / hz;
    }
    pointer('pointermove', x + (160 * i) / 7, y - (dip ? (60 * i) / 7 : 0), time);
  }
  s.physics(duration, duration - last, list);
  pointer('pointerup', x + 160, y - (dip ? 60 : 0), duration);
  if (!dip && duration === 70) expect(root.vx).toBeCloseTo(1400);
  const peaks = s.hubParticles.map((p) => Math.hypot(p.ox, p.oy));
  let peak = 0,
    own = Math.hypot(root.ox, root.oy),
    carried = 0;
  for (let i = 1; i <= hz * 4; i++) {
    s.physics(duration + (i * 1000) / hz, 1000 / hz, list);
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
  return { peak, own, peaks, carried };
}
it('keeps a seven-event 160px/70ms outward fling visible with a nine-star risk tree at every refresh rate', () => {
  const runs = [30, 60, 144].map((hz) => fling(hz, 70));
  for (const r of runs) {
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
