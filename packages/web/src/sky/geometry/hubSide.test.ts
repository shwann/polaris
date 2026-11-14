import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../testFixture';
import { WIDE } from '../constants';
import { chooseHubSide, segmentHitsBox, sideAnchor, sideBox } from './hubSide';
import { drawHubLabels, paintHubLabels } from '../draw/labels';
import type { Point } from '../types';

const hubs = (k: number, own: Point, neighbours: Record<number, Point>) =>
  Array.from({ length: 8 }, (_, i): Point => (i === k ? own : (neighbours[i] ?? [-5000 - i * 300, -5000])));

it('detects a Dipper line crossing a caption box', () => {
  expect(segmentHitsBox([0, 0], [100, 100], [40, 40, 60, 60])).toBe(true);
  expect(segmentHitsBox([0, 0], [100, 0], [40, 10, 60, 30])).toBe(false);
  expect(segmentHitsBox([50, -10], [50, 100], [40, 10, 60, 30])).toBe(true);
});

it('moves 天玑 · 开发中 off the line that runs under it and keeps clear sides as they are', () => {
  const size = { width: 120, ascent: 10, height: 14 };
  // γ (k=2) prefers below; a Dipper line from γ straight down would run through that caption.
  const blocked = hubs(2, [300, 100], { 1: [200, 100], 3: [300, 260] });
  const below = sideBox(sideAnchor(blocked[2]!, 0, 2, 1), size.width, size.ascent, size.height);
  expect(segmentHitsBox(blocked[2]!, blocked[3]!, below)).toBe(true);
  const moved = chooseHubSide(blocked, 2, 0, 1, size);
  expect(moved).toEqual({ side: 2, backdrop: false });
  const box = sideBox(sideAnchor(blocked[2]!, moved.side, 2, 1), size.width, size.ascent, size.height);
  expect(segmentHitsBox(blocked[2]!, blocked[3]!, box) || segmentHitsBox(blocked[2]!, blocked[1]!, box)).toBe(false);
  expect(chooseHubSide(hubs(2, [300, 100], { 1: [200, 100], 3: [400, 100] }), 2, 0, 1, size)).toEqual({
    side: 0,
    backdrop: false,
  });
});

it('keeps the preferred side with a backdrop when no side clears the lines', () => {
  const tall = { width: 600, ascent: 10, height: 200 };
  const points = hubs(2, [300, 100], { 1: [600, 400], 3: [0, 400] });
  expect(chooseHubSide(points, 2, 0, 1, tall)).toEqual({ side: 0, backdrop: true });
});

it('paints the sky-coloured plate under a caption that cannot avoid its lines', () => {
  const { s, star, registry } = fixture();
  s.ZONE = WIDE;
  s.sky = false;
  s.w = 1600;
  for (let i = 0; i < 3; i++) star(`doing-${i}`, i, i, 'doing');
  s.counts.set('doing', 3);
  // γ boxed in by two lines and a caption too long to fit anywhere beside it.
  s.dipPos = hubs(2, [300, 300], { 1: [900, 900], 3: [-300, 900] });
  const measure = s.ctx.measureText.bind(s.ctx);
  vi.spyOn(s.ctx, 'measureText').mockImplementation((text) => ({ ...measure(text), width: 2000 }) as TextMetrics);
  const fill = vi.spyOn(s.ctx, 'fillRect');
  drawHubLabels(s);
  paintHubLabels(s);
  expect(fill).toHaveBeenCalled();
  registry.dispose();
});
