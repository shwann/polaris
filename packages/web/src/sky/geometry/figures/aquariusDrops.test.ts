import '../../../../tests/support';
import { expect, it, vi } from 'vitest';
import type { Release } from '@polaris/core';
import { aquariusDrops, MAX_DROPS } from './aquariusDrops';
import { highlightedItems, pickAquarius, releaseStars } from './aquarius';
import { aquariusFrame } from './aquariusJar';
import { drawReleases } from '../../draw/releases';
import { dropPaths } from '../../draw/aquariusDrops';
import { aquariusObstacles } from '../../draw/aquariusObstacles';
import { fixture } from '../../testFixture';
import { constellation } from '../../motion/constellation';

const COUNTS = [1, 1, 5, 4, 5, 3, 7, 4, 7, 3, 6];
const releases = (counts: number[]): Release[] =>
  counts.map((m, i) => ({
    version: `.${20 + i}`,
    releasedAt: new Date(Date.UTC(2026, 10, 1, i)).toISOString(),
    title: '发布',
    tag: 'feature',
    items: Array.from({ length: m }, (_, j) => ({
      id: `t${i}-${j}`,
      code: `C${i}-${j}`,
      title: '交付',
      kind: 'feature',
    })),
  }));
const W = 1600,
  H = 1000;

it('turns every release into a drop whose corners are exactly its delivered items', () => {
  const layout = aquariusDrops(releases(COUNTS), W, H);
  expect(layout.stars.map((s) => s.release.version)).toEqual(releases(COUNTS).map((r) => r.version));
  expect(layout.nodes).toHaveLength(46);
  expect(layout.folded).toBe(0);
  layout.members.forEach((ids, i) => {
    expect(ids.map((id) => layout.nodes[id]!.release.version)).toEqual(
      Array(COUNTS[i]).fill(layout.stars[i]!.release.version),
    );
  });
  // Outline edges never join two different releases.
  for (const e of layout.edges) expect(layout.nodes[e.a]!.release).toBe(layout.nodes[e.b]!.release);
  // The newest release is the brightest star and sits lowest on the arc.
  const newest = layout.stars.at(-1)!,
    oldest = layout.stars[0]!;
  expect(newest.radius).toBeGreaterThan(oldest.radius);
  expect(newest.point[1]).toBeGreaterThan(oldest.point[1]);
});

it('simplifies naturally: lone star, star with a tail, then a drop', () => {
  const one = aquariusDrops(releases([0]), W, H);
  expect(one.nodes).toHaveLength(0);
  expect(one.far).toEqual([null]);
  const tail = aquariusDrops(releases([1]), W, H);
  expect(tail.members).toEqual([[0]]);
  expect(tail.edges).toHaveLength(0);
  const drop = aquariusDrops(releases([3]), W, H);
  expect(drop.edges).toHaveLength(2);
  // A short history stays a short arc beside Dubhe instead of stretching over the whole frame.
  const few = aquariusDrops(releases([1, 1, 5]), W, H),
    full = aquariusDrops(releases(COUNTS), W, H);
  expect(few.stars.at(-1)!.point[1]).toBeLessThan(full.stars.at(-1)!.point[1]);
});

it('folds the oldest releases into bare starting stars once the arc is full, keeping everything on screen', () => {
  const counts = Array.from({ length: 30 }, (_, i) => (i % 7) + 1),
    layout = aquariusDrops(releases(counts), W, H);
  expect(layout.folded).toBeGreaterThanOrEqual(30 - MAX_DROPS);
  expect(layout.foldedItems).toBe(counts.slice(0, layout.folded).reduce((a, b) => a + b, 0));
  expect(layout.nodes.every((n) => layout.stars.findIndex((s) => s.release === n.release) >= layout.folded)).toBe(true);
  expect(layout.note).toBeDefined();
  expect(layout.stars[layout.folded - 1]!.point[1]).toBeLessThan(layout.stars.at(-1)!.point[1]);
  for (const { point } of [...layout.stars, ...layout.nodes]) {
    expect(point[0]).toBeGreaterThan(0);
    expect(point[0]).toBeLessThan(W);
    expect(point[1]).toBeLessThan(H);
  }
});

it('scales with the Aquarius frame on a tall screen', () => {
  const layout = aquariusDrops(releases(COUNTS), 400, 820),
    frame = aquariusFrame(400, 820);
  for (const { point } of layout.stars) {
    expect(point[0]).toBeGreaterThan(frame.x - frame.w * 0.2);
    expect(point[0]).toBeLessThan(400);
  }
});

it('switches the live body between jar and drops, sharing picking and selection', () => {
  const { s, registry } = fixture();
  Object.assign(s, { w: W, h: H, releases: releases(COUNTS), aquariusStyle: 'jar' });
  releaseStars(s);
  expect(s.aquarius!.style).toBe('jar');
  expect(s.aquarius!.drops).toBeUndefined();
  s.aquariusStyle = 'drops';
  releaseStars(s);
  const body = s.aquarius!;
  expect(body.style).toBe('drops');
  expect(body.jar.rim).toBe(0);
  expect(body.jar.nodes).toHaveLength(46);
  const paths = dropPaths(s, body);
  expect(paths.link.at(-1)).toEqual(s.at(...body.stars[0]!.point, 14));
  expect(paths.chain.map((segment) => segment.points.at(-1))).toEqual(
    body.stars.slice(1).map((node) => s.at(...node.point, 14)),
  );
  expect(paths.flow.at(-1)).toEqual(s.at(...body.jar.nodes[body.drops!.far.at(-1)!]!.point, 14));
  const star = body.stars[8]!,
    point = s.toScreen(...s.at(...star.point, 14));
  expect(pickAquarius(s, ...point)?.star).toBe(star);
  s.selectedRelease = star.release.version;
  expect(highlightedItems(s).size).toBe(7);
  for (let i = 0; i < 30; i++) constellation(s, [], 1000 / 60);
  const texts: string[] = [];
  s.ctx.fillText = vi.fn((text: string) => void texts.push(text));
  drawReleases(s);
  expect(texts).toContain('水瓶 ♒︎ · 发布记录');
  const { segments, halos } = aquariusObstacles(s);
  expect(segments.length).toBeGreaterThan(40);
  expect(halos).toHaveLength(46 + 11);
  registry.dispose();
});
