import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../testFixture';
import { releaseStars } from '../geometry/figures/aquarius';
import { aquariusLabels, itemLabelId } from './aquariusLabels';
import { drawStarLabels, overlaps, type Label } from './starLabels';
import { labelFits, labelObstacles } from './labelObstacles';
import { hitsSegment } from './aquariusObstacles';

function chart(zoom: number) {
  const { s, registry } = fixture();
  Object.assign(s, { w: 2000, h: 1250, unit: 1250, sz: zoom ** -0.6 });
  Object.assign(s.cam, { s: zoom, x: 800 - 1630 * zoom, y: 620 - 1020 * zoom });
  s.releases = Array.from({ length: 11 }, (_, i) => ({
    version: `.${25 + i}`,
    releasedAt: `2026-11-${String(i + 1).padStart(2, '0')}T21:20:00+08:00`,
    tag: 'feature' as const,
    items: Array.from({ length: [1, 1, 5, 4, 5, 3, 7, 4, 7, 3, 6][i]! }, (_, j) => ({
      id: `id-${i}-${j}`,
      code: `CASH${i}${j}`,
      title: 'Delivered',
      kind: 'feature' as const,
    })),
  }));
  releaseStars(s);
  const drawn: string[] = [];
  s.ctx.fillText = vi.fn((text) => {
    drawn.push(text);
  });
  s.ctx.measureText = (text) => {
    const size = Number(s.ctx.font.match(/[\d.]+(?=px)/)?.[0] || 12);
    return {
      width: text.length * size * 0.65,
      actualBoundingBoxAscent: size,
      actualBoundingBoxDescent: size * 0.25,
    } as TextMetrics;
  };
  return { s, registry, drawn };
}

it('hides delivered codes in overview, then admits more at closer zooms', () => {
  const counts = [1, 2.4, 3.6, 5].map((zoom) => {
    const { s, registry, drawn } = chart(zoom);
    drawStarLabels(s, aquariusLabels(s));
    registry.dispose();
    return drawn.filter((text) => text.startsWith('CASH')).length;
  });
  expect(counts[0]).toBe(0);
  expect(counts[1]).toBeGreaterThan(0);
  expect(counts[2]).toBeGreaterThanOrEqual(counts[1]!);
  expect(counts[3]).toBeGreaterThan(counts[1]!);
});

it.each([2.4, 3.6, 5])('avoids other labels, every halo, both banks and the live outline at zoom %s', (zoom) => {
  const { s, registry, drawn } = chart(zoom);
  const other: Label = { id: 'other', lines: ['OTHER'], x: 1580, y: 1050, gap: 10, c: [255, 255, 255], pri: 99, a: 1 };
  const boxes = drawStarLabels(s, [other, ...aquariusLabels(s)]),
    obstacles = labelObstacles(s);
  expect(drawn.some((text) => text.includes('功能 · 交付'))).toBe(true);
  expect(drawn.some((text) => text.startsWith('CASH'))).toBe(true);
  boxes.forEach((box, i) => {
    expect(labelFits(box, obstacles.boxes, obstacles.halos, obstacles.segments)).toBe(true);
    boxes.slice(i + 1).forEach((other) => expect(overlaps(box, other)).toBe(false));
  });
  registry.dispose();
});

it('prioritizes hovered-version items, then rim points, then newest releases within each tier', () => {
  const { s, registry } = chart(3.6);
  s.hoverRelease = s.aquarius!.stars[3]!;
  const labels = new Map(aquariusLabels(s).map((label) => [label.id, label]));
  const nodes = s.aquarius!.jar.nodes;
  for (const a of nodes)
    for (const b of nodes) {
      const x = labels.get(itemLabelId(a.id)),
        y = labels.get(itemLabelId(b.id));
      if (!x || !y) continue;
      const ah = a.release.version === s.hoverRelease.release.version,
        bh = b.release.version === s.hoverRelease.release.version;
      if (ah && !bh) expect(x.pri).toBeGreaterThan(y.pri);
      if (ah === bh && a.bright && !b.bright) expect(x.pri).toBeGreaterThan(y.pri);
      if (ah === bh && a.bright === b.bright && a.release.releasedAt > b.release.releasedAt)
        expect(x.pri).toBeGreaterThan(y.pri);
    }
  registry.dispose();
});

it('clips diagonal obstacles precisely and keeps label choices stable on repeated frames', () => {
  expect(hitsSegment([0, 8, 2, 10], { a: [0, 0], b: [10, 10], padding: 0 })).toBe(false);
  expect(hitsSegment([4, 4, 6, 6], { a: [0, 0], b: [10, 10], padding: 0 })).toBe(true);
  const { s, registry } = chart(3.6);
  // Title upgrades may take a few frames; the settled layout then retains every side and baseline.
  for (let i = 0; i < 5; i++) drawStarLabels(s, aquariusLabels(s));
  const settled = drawStarLabels(s, aquariusLabels(s));
  expect(drawStarLabels(s, aquariusLabels(s))).toEqual(settled);
  registry.dispose();
});
