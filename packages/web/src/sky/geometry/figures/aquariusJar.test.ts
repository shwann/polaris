import '../../../../tests/support';
import { expect, it, vi } from 'vitest';
import { aquarius, releaseStars, highlightedItems, aquariusParticles, pickAquarius } from './aquarius';
import { aquariusJar } from './aquariusJar';
import { waterBanks } from '../../draw/releases';
import { drawPicking } from '../../draw/picking';
import { fixture, pointer } from '../../testFixture';
import { attachInput } from '../../input';
import { constellation } from '../../motion/constellation';
import { emitTooltip } from '../../tooltip';
import { goRelease } from '../../../hooks/skyBridge';
import { uiStore } from '../../../store/uiStore';
import type { Release } from '@polaris/core';

const releases = (n: number): Release[] =>
  Array.from({ length: n }, (_, i) => ({
    version: `.${i}`,
    releasedAt: new Date(Date.UTC(2026, 10, i + 1)).toISOString(),
    items: [],
  }));
const waterReleases = (): Release[] =>
  releases(11).map((r, i) => ({
    ...r,
    items: Array.from({ length: [1, 1, 5, 4, 5, 3, 7, 4, 7, 3, 6][i]! }, (_, j) => ({
      id: `t${i}-${j}`,
      code: `FIX-${j}`,
      title: 'Delivered',
      kind: 'fix' as const,
    })),
  }));

it('draws two smooth banks around every release with the same centreline and no satellites', () => {
  const points = aquarius(waterReleases(), 2000, 1250).map((star) => star.point);
  const banks = waterBanks(points, 7);
  expect(banks[0]).toHaveLength((points.length - 1) * 16 + 1);
  points.forEach((p, i) => {
    const a = banks[0][i * 16]!,
      b = banks[1][i * 16]!;
    expect((a[0] + b[0]) / 2).toBeCloseTo(p[0]);
    expect((a[1] + b[1]) / 2).toBeCloseTo(p[1]);
    expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeCloseTo(14);
  });
});

it.each([0, 1, 5, 16, 46, 100])(
  'fills %s delivered records deterministically with a complete fixed outline and a connected graph',
  (count) => {
    const input = releases(1);
    input[0]!.items = Array.from({ length: count }, (_, i) => ({
      id: `id-${i}`,
      code: `FIX-${i}`,
      title: 'Delivered',
      kind: 'fix',
    }));
    const jar = aquariusJar(input, 2000, 1250);
    const shuffled = aquariusJar(
      input.map((r) => ({ ...r, items: [...r.items!].reverse() })),
      2000,
      1250,
    );
    expect(jar.nodes.map((n) => [n.id, n.point])).toEqual(shuffled.nodes.map((n) => [n.id, n.point]));
    expect(jar.edges).toEqual(shuffled.edges);
    expect(jar.nodes).toHaveLength(count);
    expect(jar.rim).toBe(Math.min(22, count));
    expect(jar.nodes.filter((n) => !n.bright)).toHaveLength(Math.max(0, count - 22));
    expect(jar.poly).toEqual(aquariusJar([], 2000, 1250).poly);
    expect(new Set(jar.nodes.map((n) => n.id)).size).toBe(count);
    const seen = new Set(count ? [0] : []);
    for (let i = 0; i < count; i++)
      for (const e of jar.edges)
        if (seen.has(e.a) || seen.has(e.b)) {
          seen.add(e.a);
          seen.add(e.b);
        }
    expect(seen.size).toBe(count);
    if (count > 1)
      for (let i = 0; i < jar.rim; i++)
        expect(
          jar.edges.some((e) => (e.a === i && e.b === (i + 1) % jar.rim) || (e.b === i && e.a === (i + 1) % jar.rim)),
        ).toBe(true);
  },
);

it('fills both slot sets bottom to top by release date and numeric item code', () => {
  const input = waterReleases(),
    jar = aquariusJar(input, 2000, 1250);
  expect(jar.rim).toBe(22);
  expect(jar.nodes.length - jar.rim).toBe(24);
  for (const bright of [true, false]) {
    const nodes = jar.nodes
      .filter((n) => n.bright === bright)
      .sort((a, b) => b.point[1] - a.point[1] || a.point[0] - b.point[0]);
    expect(nodes.map((n) => n.release.releasedAt)).toEqual(nodes.map((n) => n.release.releasedAt).sort());
    for (let i = 1; i < nodes.length; i++)
      if (nodes[i]!.release.version === nodes[i - 1]!.release.version)
        expect(nodes[i - 1]!.item.code.localeCompare(nodes[i]!.item.code, 'en', { numeric: true })).toBeLessThan(0);
  }
  const means = input.map((r) => {
    const nodes = jar.nodes.filter((n) => n.release.version === r.version);
    return nodes.reduce((sum, n) => sum + n.point[1], 0) / nodes.length;
  });
  for (let i = 1; i < means.length; i++) expect(means[i]).toBeLessThan(means[i - 1]!);
  expect(jar).toEqual(aquariusJar([...input].reverse(), 2000, 1250));
});

it('highlights exactly the seven items of a hovered release and shows delivered item tooltips', () => {
  const onTooltip = vi.fn(),
    { s, registry } = fixture(true, { onTooltip });
  Object.assign(s, { releases: waterReleases(), onSky: true });
  const stars = releaseStars(s),
    version = stars[6]!;
  [s.px, s.py] = version.point;
  drawPicking(s, 0, []);
  expect(highlightedItems(s)).toEqual(new Set(version.release.items!.map((item) => item.id)));
  expect(highlightedItems(s).size).toBe(7);
  const node = s.aquarius!.jar.nodes.find((n) => n.release.version === version.release.version)!;
  [s.px, s.py] = node.point;
  drawPicking(s, 0, []);
  emitTooltip(s);
  expect(onTooltip.mock.calls.at(-1)?.[0]).toBe(
    `${node.item.code} · ${node.item.title} · 上线于 ${version.release.version}`,
  );
  registry.dispose();
});

it.each([0, 4, 5, 150])('navigates a jar point only for gestures below 5px (%s px)', (distance) => {
  const onPickRelease = vi.fn(goRelease),
    onPickStar = vi.fn(),
    { s, registry } = fixture(true, { onPickRelease, onPickStar }),
    detach = attachInput(s);
  s.releases = waterReleases();
  releaseStars(s);
  const node = s.aquarius!.jar.nodes[8]!,
    [x, y] = node.point;
  pointer('pointerdown', x, y, 0);
  pointer('pointerup', x + distance, y, 100);
  if (distance < 5) {
    expect(onPickRelease).toHaveBeenCalledWith(node.release.version);
    expect(uiStore.getState()).toMatchObject({ sky: false, releaseFocus: node.release.version });
  } else expect(onPickRelease).not.toHaveBeenCalled();
  expect(onPickStar).not.toHaveBeenCalled();
  detach();
  registry.dispose();
});

it('transmits a mouth pull to the first version through the physical jar-water connector', () => {
  const { s, registry } = fixture(),
    detach = attachInput(s);
  Object.assign(s, { w: 2000, h: 1250, releases: waterReleases() });
  const first = releaseStars(s)[0]!,
    jar = s.aquarius!.jar,
    node = jar.nodes[jar.mouth]!,
    [x, y] = node.point;
  pointer('pointerdown', x, y, 0);
  expect(s.drag?.release?.particle).toBe(node.particle);
  for (let i = 1; i <= 60; i++) {
    pointer('pointermove', x - 150 * Math.min(1, i / 18), y, (i * 1000) / 60);
    constellation(s, [], 1000 / 60, (i * 1000) / 60);
  }
  expect(Math.hypot(first.particle.ox, first.particle.oy)).toBeGreaterThan(15);
  pointer('pointerup', x - 150, y, 1001);
  detach();
  registry.dispose();
});

it.each([0, 1, 5, 16, 100])('keeps all %s item particles exactly formed on first open', (count) => {
  const { s, registry } = fixture();
  const input = releases(1);
  input[0]!.items = Array.from({ length: count }, (_, i) => ({
    id: `id-${i}`,
    code: `FIX-${i}`,
    title: 'Delivered',
    kind: 'fix',
  }));
  Object.assign(s, { w: 2000, h: 1250, releases: input });
  for (let i = 0; i < 120; i++) constellation(s, [], 1000 / 60);
  expect(aquariusParticles(s.aquarius!).every((p) => p.ox === 0 && p.oy === 0)).toBe(true);
  registry.dispose();
});

it('keeps a zoomed jar point clickable after screen-space parallax drift', () => {
  const onPickRelease = vi.fn(),
    { s, registry } = fixture(true, { onPickRelease }),
    detach = attachInput(s);
  Object.assign(s, { w: 2000, h: 1250, releases: waterReleases() });
  Object.assign(s.cam, { s: 3, x: -4080, y: -2400 });
  Object.assign(s.camT, s.cam);
  releaseStars(s);
  const node = s.aquarius!.jar.nodes[0]!,
    [x, y] = s.toScreen(...s.at(...node.point, 14));
  expect(pickAquarius(s, x + 14, y)?.particle).toBe(node.particle);
  pointer('pointerdown', x + 14, y, 0);
  pointer('pointerup', x + 14, y, 100);
  expect(onPickRelease).toHaveBeenCalledWith(node.release.version);
  detach();
  registry.dispose();
});
