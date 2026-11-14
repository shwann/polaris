import '../../../../tests/support';
import { expect, it } from 'vitest';
import type { Release } from '@polaris/core';
import { COL, MAG } from '../../../domain/lanes';
import type { Lane } from '../../../domain/types';
import { fixture } from '../../testFixture';
import { WIDE } from '../../constants';
import { drawHubLabels } from '../../draw/labels';
import { intersects, figureSize } from '../../draw/labelObstacles';
import { drawStarLabels } from '../../draw/starLabels';
import { drawReleases } from '../../draw/releases';
import { textBox } from '../hubLabels';
import { segmentHitsBox } from '../hubSide';
import { boundsOf } from '../cardPlacement';
import { centre, home, rebuild } from '../clusters';
import { fit } from '../dipper';
import { aquariusLayout } from './aquariusLayout';
import type { Box } from '../../types';

const viewports = [
  [2000, 1250],
  [1440, 900],
] as const;
const padded = (box: Box, gap = 8): Box => [box[0] - gap, box[1] - gap, box[2] + gap, box[3] + gap];

function overview(w: number, h: number, quiet = 8) {
  const f = fixture(),
    { s } = f;
  Object.assign(s, { w, h, unit: Math.min(w, h * 1.4), ZONE: WIDE });
  s.home = (star, t) => home(s, star, t);
  s.hubs = () => fit([0.06 * w, 0.1 * h, 0.86 * w, 0.86 * h]);
  s.dipPos = s.hubs();
  for (const [lane, n] of Object.entries({ waiting: 19, release: 9, doing: 5, risk: 4, planned: 1, done: 69 }))
    for (let i = 0; i < n; i++) {
      const star = f.star(`${lane}-${i}`, 0, 0, lane as Lane);
      star.code = `${lane[0]!.toUpperCase()}${i}`;
      if (lane === 'waiting') star.wait = i < quiet ? (i % 2 ? 'customer' : 'dependency') : 'user';
    }
  rebuild(s);
  for (const star of s.stars.values()) [star.x, star.y] = s.home(star, 0);
  // Approximate the rendering fonts with full-width Chinese and monospace Latin ink metrics.
  s.ctx.measureText = (text) => {
    const size = Number(/([\d.]+)px/.exec(s.ctx.font)?.[1] ?? 16),
      width = [...text].reduce((sum, c) => sum + size * ((c.codePointAt(0) ?? 0) > 255 ? 1 : 0.6), 0),
      shift = s.ctx.textAlign === 'center' ? width / 2 : s.ctx.textAlign === 'right' ? width : 0;
    return {
      width,
      actualBoundingBoxLeft: shift,
      actualBoundingBoxRight: width - shift,
      actualBoundingBoxAscent: size * 0.8,
      actualBoundingBoxDescent: size * 0.2,
    } as TextMetrics;
  };
  return f;
}

it.each(viewports)('anchors Scorpius between Megrez and Polaris above the bowl at %s×%s', (w, h) => {
  const { s, registry } = overview(w, h),
    [x, y, radius] = centre(s, 'waiting'),
    delta = s.dipPos[3]!,
    pole = s.dipPos[7]!;
  expect(x).toBeGreaterThan(delta[0]);
  expect(x).toBeLessThan(pole[0]);
  expect(y).toBeGreaterThan(pole[1]);
  expect(y).toBeLessThan(delta[1]);
  expect(x / w).toBeGreaterThan(0.3);
  expect(x / w).toBeLessThan(0.65);
  expect(y / h).toBeGreaterThan(0.05);
  expect(y / h).toBeLessThan(0.55);
  // Moving the centre must preserve the previous nineteen-task radius and all template proportions.
  expect(radius).toBeCloseTo(s.unit * (0.05 + 0.016 * Math.sqrt(19)), 8);
  const resting = centre(s, 'waiting');
  s.cam = { s: 3, x: -500, y: 100 };
  s.mx = s.my = 0.4;
  s.hubParticles = s.dipPos.map(() => ({ ox: 100, oy: -80, vx: 0, vy: 0 }));
  expect(centre(s, 'waiting')).toEqual(resting);
  registry.dispose();
});

it.each(viewports.flatMap(([w, h]) => [0, 8].map((quiet) => [w, h, quiet] as const)))(
  'clears captions, constellation bounds and Dipper lines at %s×%s with %s external waits',
  (w, h, quiet) => {
    const { s, registry } = overview(w, h, quiet),
      waiting = [...s.stars.values()].filter((star) => star.group === 'waiting'),
      body = padded(boundsOf(waiting.map((star) => [star.x, star.y])));
    drawHubLabels(s);
    const labels = drawStarLabels(
      s,
      waiting.map((star) => {
        const r = MAG.waiting * figureSize(star);
        return {
          id: star.id,
          x: star.x,
          y: star.y - r - 3,
          gap: r + 6,
          lines: [star.code],
          c: COL.waiting,
          a: 1,
          pri: r,
        };
      }),
    );
    expect(labels.length).toBeGreaterThanOrEqual(12);
    const envelope = boundsOf(
      [body, ...labels].flatMap((b) => [
        [b[0], b[1]],
        [b[2], b[3]],
      ]),
    );
    for (const caption of s.hubLabelBoxes!.flat())
      expect(intersects(envelope, caption), JSON.stringify({ envelope, caption })).toBe(false);
    for (const lane of ['release', 'doing', 'risk', 'planned', 'done'] as const) {
      const others = [...s.stars.values()].filter((star) => star.group === lane);
      expect(intersects(envelope, padded(boundsOf(others.map((star) => [star.x, star.y])))), lane).toBe(false);
    }
    // Include the whole urn, both waves, the ripple pool and the actual Aquarius label drawing positions.
    const releases = Array.from({ length: 12 }, (_, i) => ({
      version: `.${25 + i}`,
      releasedAt: new Date(1700000000000 + i * 86400000).toISOString(),
      items: [],
    })) as unknown as Release[];
    s.releases = releases;
    const urn = aquariusLayout(releases, w, h);
    expect(intersects(envelope, padded(boundsOf([...urn.rim, ...urn.waves.flat(), urn.surface])))).toBe(false);
    const releaseLabels: Box[] = [];
    s.ctx.fillText = (text, x, y) => releaseLabels.push(textBox(s.ctx, text, x, y));
    drawReleases(s);
    expect(releaseLabels.length).toBe(13);
    for (const box of releaseLabels) expect(intersects(envelope, box)).toBe(false);
    for (const [a, b] of [
      [0, 3],
      [3, 4],
      [0, 7],
    ] as const)
      expect(segmentHitsBox(s.dipPos[a]!, s.dipPos[b]!, padded(envelope, 12))).toBe(false);
    expect(envelope[1]).toBeGreaterThan(8);
    registry.dispose();
  },
);

it.each(viewports)('keeps the board waiting cloud in the original bowl at %s×%s', (w, h) => {
  const { s, registry } = overview(w, h);
  s.sky = false;
  s.bowl = [w * 0.61, h * 0.6, 100];
  expect(centre(s, 'waiting').slice(0, 2)).toEqual(s.bowl.slice(0, 2));
  registry.dispose();
});
