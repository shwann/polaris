import '../../../../tests/support';
import { expect, it, vi } from 'vitest';
import { aquarius, pickRelease, releaseStars, pickAquarius, aquariusParticles, jarOutline } from './aquarius';
import { aquariusJar } from './aquariusJar';
import { drawReleases, releaseCaption } from '../../draw/releases';
import { attachInput } from '../../input';
import { fixture, pointer } from '../../testFixture';
import { drawPicking } from '../../draw/picking';
import { physics } from '../../physics';
import { selectRelease } from '../../../hooks/skyBridge';
import { uiStore } from '../../../store/uiStore';
import { emitTooltip } from '../../tooltip';
import type { Release } from '@polaris/core';
import { constellation } from '../../motion/constellation';
import { cameraBounds } from '../../motion/cameraMotion';
import { tooltipAllowed } from '../../tooltip';

const releases = (n: number): Release[] =>
  Array.from({ length: n }, (_, i) => ({
    version: `.${i}`,
    releasedAt: new Date(Date.UTC(2026, 10, i + 1)).toISOString(),
    title: '发布简介',
    tag: 'fix',
    items: Array.from({ length: 10 }, (_, j) => ({ id: `t${i}-${j}`, code: `FIX-${j}`, title: '修复', kind: 'fix' })),
  }));

const waterReleases = () =>
  releases(11).map((release, i) => ({
    ...release,
    items: release.items!.slice(0, [1, 1, 5, 4, 5, 3, 7, 4, 7, 3, 6][i]),
  }));

it('opens in the finished jar and water layout and keeps every particle still', () => {
  const { s, registry } = fixture();
  Object.assign(s, { w: 2000, h: 1250, releases: releases(12) });
  const rest = aquarius(s.releases, s.w, s.h);
  for (let i = 0; i < 120; i++) constellation(s, [], 1000 / 60);
  expect(releaseStars(s).map(({ particle: _p, ...star }) => star)).toEqual(rest);
  registry.dispose();
});

it.each([false, true])('selects and animates both Aquarius anchors according to reduced motion=%s', (reduced) => {
  const onPickRelease = vi.fn(),
    onPickStar = vi.fn(),
    { s, registry } = fixture(reduced, { onPickRelease, onPickStar }),
    detach = attachInput(s);
  Object.assign(s, { w: 2000, h: 1250, releases: waterReleases() });
  const version = releaseStars(s).at(-1)!,
    item = s.aquarius!.jar.nodes[0]!;
  let time = performance.now();
  for (const node of [version, item]) {
    const point = s.toScreen(...s.at(...node.point, 14));
    pointer('pointerdown', ...point, 0);
    pointer('pointerup', ...point, 10);
    expect(s.ripples.at(-1)?.small).toBe(reduced ? undefined : true);
    for (let i = 0; i < 4; i++) physics(s, (time += 17), 17, []);
    if (reduced) expect(node.particle.oy).toBe(0);
    else expect(node.particle.oy).toBeLessThan(-1);
  }
  expect(onPickRelease).toHaveBeenCalledWith(version.release.version);
  expect(onPickStar).toHaveBeenCalledWith(item.id, item.release.version);
  detach();
  registry.dispose();
});

it('pushes the jar and water when a click wave reaches them after closing a detail card', () => {
  const { s, registry } = fixture(),
    detach = attachInput(s);
  Object.assign(s, { w: 2000, h: 1250, releases: waterReleases() });
  s.selectedRelease = releaseStars(s)[0]!.release.version;
  pointer('pointerdown', 1320, 930, 0);
  pointer('pointerup', 1320, 930, 10);
  expect(s.selectedRelease).toBeNull();
  const wave = s.ripples[0]!;
  for (let i = 1; i <= 60; i++) physics(s, wave.t0 + i * 17, 17, []);
  expect(s.aquarius!.jar.nodes.some((node) => wave.hit.has(node.particle))).toBe(true);
  expect(s.aquarius!.stars.some((node) => wave.hit.has(node.particle))).toBe(true);
  expect(aquariusParticles(s.aquarius!).some((p) => Math.hypot(p.ox, p.oy) > 1)).toBe(true);
  detach();
  registry.dispose();
});

it.each([0, 1, 2, 6, 11, 12, 20])(
  'keeps %s releases deterministic, chronologically connected and evenly placed with a larger latest star',
  (n) => {
    const input = releases(n).reverse();
    const stars = aquarius(input, 2000, 1250);
    expect(stars).toEqual(aquarius(input, 2000, 1250));
    expect(stars).toHaveLength(n);
    expect(stars.map((s) => s.release.version)).toEqual(releases(n).map((r) => r.version));
    if (!n) return;

    expect(stars.slice(0, -1).every((s) => s.radius < stars.at(-1)!.radius && s.alpha < stars.at(-1)!.alpha)).toBe(
      true,
    );
    const gaps = stars
      .slice(1)
      .map((s, i) => Math.hypot(s.point[0] - stars[i]!.point[0], s.point[1] - stars[i]!.point[1]));
    if (gaps.length) expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(2.1);
    // Every chronological neighbour is an edge in the water chain.
    expect(stars.every((s, i) => i === 0 || s.point[1] > stars[i - 1]!.point[1])).toBe(true);
  },
);

it('keeps sub-threshold release clicks, consumes drags and never selects a task or pans the canvas', () => {
  const picked = vi.fn(),
    onPickRelease = vi.fn(selectRelease);
  const { s, registry } = fixture(true, { onPickStar: picked, onPickRelease });
  s.releases = releases(11);
  const nodes = aquarius(s.releases, s.w, s.h),
    node = nodes[5]!;
  const detach = attachInput(s);
  const [x, y] = node.point;
  expect(pickRelease(s, x, y)?.release.version).toBe('.5');
  pointer('pointerdown', x, y, 0);
  expect(s.drag?.star).toBeNull();
  expect(s.drag?.release?.particle).toBe(releaseStars(s)[5]!.particle);
  pointer('pointermove', x + 4, y, 5);
  pointer('pointerup', x + 4, y, 10);
  expect(onPickRelease).toHaveBeenCalledWith('.5');
  expect(uiStore.getState()).toMatchObject({ selectedRelease: '.5', releaseFocus: null });
  expect(picked).not.toHaveBeenCalled();
  expect(s.stars.size).toBe(0);
  s.w = 2000;
  s.h = 1250;
  s.releases = releases(1);
  const item = aquariusJar(s.releases, s.w, s.h).nodes[0]!;
  expect(pickRelease(s, ...item.point)).toBeNull();
  const [dx, dy] = aquarius(s.releases, s.w, s.h)[0]!.point;
  pointer('pointerdown', dx, dy, 100);
  pointer('pointermove', dx + 80, dy, 140);
  constellation(s, [], 40, 140);
  expect(releaseStars(s)[0]!.particle.ox).toBeCloseTo(80);
  pointer('pointerup', dx + 80, dy, 160);
  expect(onPickRelease).toHaveBeenCalledTimes(1);
  expect(s.cam).toEqual({ x: 0, y: 0, s: 1 });
  expect(s.camT).toEqual(s.cam);
  expect(releaseStars(s)[0]!.particle.ox).toBe(0);
  detach();
  registry.dispose();
});

it.each([30, 60, 144].flatMap((fps) => [11, 12].map((count) => ({ fps, count }))))(
  'propagates a 150px middle-version pull through $count releases at $fps Hz and returns within 1.5 seconds',
  ({ fps, count }) => {
    const { s, registry } = fixture(),
      detach = attachInput(s);
    const input = count === 11 ? waterReleases() : releases(count);
    Object.assign(s, { w: 2000, h: 1250, releases: input });
    const stars = releaseStars(s),
      index = count === 11 ? 6 : 4,
      root = stars[index]!,
      [x, y] = root.point,
      a = stars[index - 1]!.point,
      b = stars[index + 1]!.point,
      normal = [a[1] - b[1], b[0] - a[0]],
      sign = normal[0]! > 0 ? -1 : 1,
      dx = (normal[0]! / Math.hypot(...normal)) * 150 * sign,
      dy = (normal[1]! / Math.hypot(...normal)) * 150 * sign,
      bounds = cameraBounds(s);
    pointer('pointerdown', x, y, 0);
    for (let i = 1; i <= fps; i++) {
      const k = Math.min(1, i / (fps * 0.3));
      pointer('pointermove', x + dx * k, y + dy * k, (i * 1000) / fps);
      constellation(s, [], 1000 / fps, (i * 1000) / fps);
    }
    const displacement = (p: { ox: number; oy: number }) => Math.hypot(p.ox, p.oy),
      adjacent = [stars[index - 1]!, stars[index + 1]!].map((star) => displacement(star.particle)),
      distant = stars.filter((_, i) => Math.abs(i - index) > 2).map((star) => displacement(star.particle));
    expect(displacement(root.particle)).toBeCloseTo(150, 6);
    expect(Math.min(...adjacent)).toBeGreaterThanOrEqual(150 * 0.35);
    expect(Math.max(...distant)).toBeGreaterThanOrEqual(150 * 0.1);
    expect(Math.max(...distant)).toBeLessThanOrEqual(150 * 0.6);

    expect(cameraBounds(s)).toEqual(bounds);
    pointer('pointerup', x + dx, y + dy, 1001);
    for (let i = 1; i <= fps * 1.5; i++) constellation(s, [], 1000 / fps, 1001 + (i * 1000) / fps);
    expect(Math.max(...aquariusParticles(s.aquarius!).map(displacement))).toBeLessThanOrEqual(150 * 0.04);
    detach();
    registry.dispose();
  },
);

it('lets a jar point tension its neighbours, keeps tasks and hubs still, and suppresses hover until settled', () => {
  const onPickRelease = vi.fn(),
    { s, star, registry } = fixture(false, { onPickRelease }),
    task = star('task', 500, 500),
    detach = attachInput(s);
  Object.assign(task, { baseX: 500, baseY: 500 });
  Object.assign(s, { w: 2000, h: 1250, releases: waterReleases() });
  releaseStars(s);
  const jar = s.aquarius!.jar,
    root = jar.nodes[8]!,
    [x, y] = root.point;
  expect(pickAquarius(s, x, y)?.particle).toBe(root.particle);
  pointer('pointerdown', x, y, 0);
  for (let i = 1; i <= 60; i++) {
    pointer('pointermove', x, y - 150 * Math.min(1, i / 18), (i * 1000) / 60);
    constellation(s, [task], 1000 / 60, (i * 1000) / 60);
  }
  expect(Math.hypot(root.particle.ox, root.particle.oy)).toBeCloseTo(150);
  const neighbours = jar.edges
    .filter((e) => e.a === 8 || e.b === 8)
    .map((e) => jar.nodes[e.a === 8 ? e.b : e.a]!.particle);
  expect(Math.max(...neighbours.map((p) => Math.hypot(p.ox, p.oy)))).toBeGreaterThan(40);
  expect(Math.hypot(task.ox, task.oy)).toBe(0);
  expect(s.hubParticles.every((p) => Math.hypot(p.ox, p.oy) === 0)).toBe(true);
  pointer('pointerup', x, y - 150, 1001);
  expect(onPickRelease).not.toHaveBeenCalled();
  expect(tooltipAllowed(s)).toBe(false);
  for (let i = 1; i <= 90; i++) constellation(s, [task], 1000 / 60, 1001 + (i * 1000) / 60);
  expect(Math.max(...aquariusParticles(s.aquarius!).map((p) => Math.hypot(p.ox, p.oy)))).toBeLessThan(6);
  detach();
  registry.dispose();
});

it('does not disturb Aquarius when a task is dragged, and preserves release particles across data refreshes', () => {
  const { s, star, registry } = fixture(),
    task = star('task', 500, 500),
    detach = attachInput(s);
  Object.assign(s, { w: 2000, h: 1250, releases: releases(12) });
  Object.assign(task, { baseX: 500, baseY: 500 });
  const before = releaseStars(s);
  pointer('pointerdown', 500, 500, 0);
  pointer('pointermove', 650, 500, 300);
  for (let i = 1; i <= 60; i++) constellation(s, [task], 1000 / 60, (i * 1000) / 60);
  expect(aquariusParticles(s.aquarius!).every((p) => Math.hypot(p.ox, p.oy) < 1e-6)).toBe(true);
  s.releases = releases(12);
  expect(releaseStars(s)[4]!.particle).toBe(before[4]!.particle);
  s.sysSel = 'other';
  expect(releaseStars(s)[4]!.particle).not.toBe(before[4]!.particle);
  detach();
  registry.dispose();
});

it.each([1, 2])('picks and holds the same release in scaled coordinates at zoom %s', (zoom) => {
  const onPickRelease = vi.fn(),
    { s, registry } = fixture(false, { onPickRelease }),
    detach = attachInput(s);
  Object.assign(s, { w: 2000, h: 1250, releases: releases(12), mx: 0.3, my: -0.2 });
  Object.assign(s.cam, { s: zoom, x: -600, y: -200 });
  Object.assign(s.camT, s.cam);
  const star = releaseStars(s)[4]!,
    [x, y] = s.toScreen(...s.at(...star.point, 14));
  pointer('pointerdown', x, y, 0);
  // A pointerup beyond the threshold consumes the gesture even without a final move event.
  pointer('pointerup', x + 150, y, 300);
  expect(star.particle.ox).toBeCloseTo(150 / zoom);
  expect(star.particle.oy).toBeCloseTo(0);
  const double = new MouseEvent('dblclick', { clientX: x, clientY: y });
  Object.defineProperty(double, 'timeStamp', { value: 301 });
  window.dispatchEvent(double);
  expect(onPickRelease).not.toHaveBeenCalled();
  expect(s.cam).toEqual(s.camT);
  detach();
  registry.dispose();
});

it('uses live endpoints for the jar, both banks, tether, ripple and captions while held', () => {
  const { s, registry } = fixture();
  Object.assign(s, { w: 2000, h: 1250, releases: waterReleases() });
  const stars = releaseStars(s),
    first = stars[0]!,
    jar = s.aquarius!.jar;
  first.particle.ox = -150;
  jar.nodes[jar.mouth]!.particle.ox = -120;
  drawReleases(s);
  expect(vi.mocked(s.ctx.lineTo).mock.calls[0]).toEqual(jar.nodes[jar.mouth]!.point);
  expect(vi.mocked(s.ctx.lineTo).mock.calls).toContainEqual(first.point);
  expect(vi.mocked(s.ctx.fillText).mock.calls).toContainEqual([
    first.release.version,
    ...releaseCaption(
      stars.map((star) => star.point),
      0,
      s.sz,
    ).point,
  ]);
  expect(vi.mocked(s.ctx.ellipse).mock.calls).toHaveLength(3);
  expect(pickRelease(s, ...first.point)).toBe(first);
  expect(jarOutline(s.aquarius!)).toContainEqual(jar.nodes[jar.mouth]!.point);
  registry.dispose();
});

it('shows version, tag, release date, summary and delivered count on a version hover', () => {
  const onTooltip = vi.fn();
  const { s, registry } = fixture(true, { onTooltip });
  s.releases = releases(1);
  s.onSky = true;
  [s.px, s.py] = aquarius(s.releases, s.w, s.h)[0]!.point;
  drawPicking(s, 0, []);
  emitTooltip(s);
  expect(onTooltip.mock.calls.at(-1)?.[0]).toContain('.0 · 修复 · 2026-');
  expect(onTooltip.mock.calls.at(-1)?.[1]).toContain('发布简介\n交付 10 项');
  registry.dispose();
});
