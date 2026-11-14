import '../../../../tests/support';
import { expect, it, vi } from 'vitest';
import { aquarius, pickRelease } from './aquarius';
import { drawReleases } from '../../draw/releases';
import { attachInput } from '../../input';
import { fixture, pointer } from '../../testFixture';
import { drawPicking } from '../../draw/picking';
import { goRelease } from '../../../hooks/skyBridge';
import { uiStore } from '../../../store/uiStore';
import { emitTooltip } from '../../tooltip';
import type { Release } from '@polaris/core';

const releases = (n: number): Release[] =>
  Array.from({ length: n }, (_, i) => ({
    version: `.${i}`,
    releasedAt: new Date(Date.UTC(2026, 10, i + 1)).toISOString(),
    title: '发布简介',
    tag: 'fix',
    items: Array.from({ length: 10 }, (_, j) => ({ id: `t${j}`, code: `FIX-${j}`, title: '修复', kind: 'fix' })),
  }));

it.each([0, 1, 2, 6, 11, 12, 20])(
  'keeps %s releases deterministic, chronologically connected and evenly placed with a larger latest star',
  (n) => {
    const input = releases(n).reverse();
    const stars = aquarius(input, 2000, 1250);
    expect(stars).toEqual(aquarius(input, 2000, 1250));
    expect(stars).toHaveLength(Math.min(n, 12));
    expect(stars.map((s) => s.release.version)).toEqual(
      releases(n)
        .slice(-12)
        .map((r) => r.version),
    );
    if (!n) return;
    expect(stars.every((s) => s.satellites.length === 8)).toBe(true);
    expect(stars.slice(0, -1).every((s) => s.radius < stars.at(-1)!.radius && s.alpha < stars.at(-1)!.alpha)).toBe(
      true,
    );
    const gaps = stars
      .slice(1)
      .map((s, i) => Math.hypot(s.point[0] - stars[i]!.point[0], s.point[1] - stars[i]!.point[1]));
    if (gaps.length) expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(2.1);
    // Each chronological neighbour is an edge; every satellite connects only to its own version.
    expect(stars.every((s, i) => i === 0 || s.point[1] > stars[i - 1]!.point[1])).toBe(true);
    const bends = stars.slice(1).map((s, i) => Math.sign(s.point[0] - stars[i]!.point[0]));
    if (n >= 11) expect(bends.filter((s, i) => i && s !== bends[i - 1]).length).toBeGreaterThanOrEqual(3);
  },
);

it('clicks a version into board history without selecting a task; dragging pans, satellites are decorative', () => {
  const picked = vi.fn(),
    onPickRelease = vi.fn(goRelease);
  const { s, registry } = fixture(true, { onPickStar: picked, onPickRelease });
  s.releases = releases(11);
  const nodes = aquarius(s.releases, s.w, s.h),
    node = nodes[5]!;
  const detach = attachInput(s);
  const [x, y] = node.point;
  expect(pickRelease(s, x, y)?.release.version).toBe('.5');
  pointer('pointerdown', x, y, 0);
  expect(s.drag?.star).toBeNull();
  pointer('pointerup', x, y, 10);
  expect(onPickRelease).toHaveBeenCalledWith('.5');
  expect(uiStore.getState()).toMatchObject({ sky: false, releaseFocus: '.5' });
  expect(picked).not.toHaveBeenCalled();
  expect(s.stars.size).toBe(0);
  const satellite = aquarius(releases(1), 2000, 1250)[0]!.satellites[0]!;
  s.w = 2000;
  s.h = 1250;
  s.releases = releases(1);
  expect(pickRelease(s, ...satellite)).toBeNull();
  const [dx, dy] = aquarius(s.releases, s.w, s.h)[0]!.point;
  pointer('pointerdown', dx, dy, 100);
  pointer('pointermove', dx + 80, dy, 140);
  pointer('pointerup', dx + 80, dy, 160);
  expect(onPickRelease).toHaveBeenCalledTimes(1);
  detach();
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

it('draws one connected chronological chain, a tether to Dubhe and a spoke for each capped satellite', () => {
  const { s, registry } = fixture(true);
  s.releases = releases(20);
  const nodes = aquarius(s.releases, s.w, s.h);
  drawReleases(s);
  const ends = vi.mocked(s.ctx.lineTo).mock.calls;
  expect(ends).toHaveLength(1 + nodes.length - 1 + nodes.reduce((n, node) => n + node.satellites.length, 0));
  expect(vi.mocked(s.ctx.moveTo).mock.calls[0]).toEqual(s.hubs()[0]);
  expect(ends[0]).toEqual(nodes[0]!.point);
  for (const node of nodes.slice(1)) expect(ends).toContainEqual(node.point);
  registry.dispose();
});
