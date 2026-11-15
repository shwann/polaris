import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { DEPTH, MAX_ZOOM, MIN_ZOOM } from '../constants';
import { fixture } from '../testFixture';
import { dustCopies } from './dust';
import {
  CHART_FADE,
  CHART_PIXELS,
  BOARD_PIXELS,
  CHART_SIDE,
  chartGeometry,
  layerScale,
  rasterSize,
} from './chartGeometry';
import { panBounds, rubber } from '../motion/bounds';
import { drawBackgroundChart, layerView, tileOrigins } from './background';

it('keeps cloud tile coverage consistent with damped layer zoom at distant translations', () => {
  for (const scale of [0.5, 0.7, 1, 2.4, 5])
    for (const depth of Object.values(DEPTH))
      for (const [tx, ty] of [
        [0, 0],
        [-20000, 17000],
        [12345, -6789],
      ]) {
        const zoom = layerScale(scale, depth),
          view = layerView(1440, 900, zoom, tx! * depth, ty! * depth);
        const tiles = tileOrigins(view, 1440, 900);
        for (let x = 0; x <= 1440; x += 40)
          for (let y = 0; y <= 900; y += 30) {
            const wx = (x - tx! * depth) / zoom,
              wy = (y - ty! * depth) / zoom;
            expect(tiles.some(([a, b]) => wx >= a && wx <= a + 1440 && wy >= b && wy <= b + 900)).toBe(true);
          }
        expect(tiles.length).toBeLessThanOrEqual(16);
      }
});

it('reuses all chart rasters and three cloud sprites through zooming and panning', () => {
  const { s, registry } = fixture();
  s.drawChart();
  s.drawNebula(100);
  const chart = s.chart,
    board = s.boardChart,
    core = s.chartCore,
    sprites = [...s.tints.entries()].filter(([key]) => key.startsWith('nebula:'));
  expect(sprites).toHaveLength(3);
  const build = vi.spyOn(s, 'drawChart');
  for (const scale of [0.5, 1, 5]) {
    Object.assign(s.camT, { s: scale, x: -900, y: 600 });
    s.frame(200);
  }
  expect(build).not.toHaveBeenCalled();
  expect(s.chart).toBe(chart);
  expect(s.boardChart).toBe(board);
  expect(s.chartCore).toBe(core);
  for (const [key, canvas] of sprites) expect(s.tints.get(key)).toBe(canvas);
  registry.dispose();
});

it('draws only visible dust copies and repeats identically at tile boundaries', () => {
  expect(dustCopies(400, 300, 1000, 800, [0, 0, 1000, 800])).toEqual([[400, 300]]);
  expect(dustCopies(400, 300, 1000, 800, [0, 0, 2000, 1600])).toHaveLength(4);
  expect(dustCopies(400, 300, 1000, 800, [10000, -8000, 11000, -7200])).toEqual([[10400, -7700]]);
  expect(dustCopies(999.5, 300, 1000, 800, [0, 0, 1000, 800])).toEqual([
    [-0.5, 300],
    [999.5, 300],
  ]);
});

it('scales distant layers less in both zoom directions and preserves unit/board scale', () => {
  for (const scale of [0.5, 0.7, 1, 2.4, 5]) {
    const distances = [DEPTH.dust, DEPTH.nebula, DEPTH.chart, DEPTH.stars].map((depth) =>
      Math.abs(layerScale(scale, depth) - 1),
    );
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    for (const depth of Object.values(DEPTH)) {
      expect(layerScale(1, depth)).toBe(1);
      expect(layerScale(scale, depth, 0)).toBe(1);
    }
  }
});

it('covers all viewport corners inside the unfaded chart at every soft boundary and transition', () => {
  for (const [w, h] of [
    [1440, 900],
    [1000, 900],
    [960, 700],
    [375, 812],
    [2560, 1440],
  ] as const) {
    const { box } = chartGeometry(w, h, 2);
    // This envelope includes homes one entire viewport outside the visible screen.
    const homes: [number, number][] = [
      [-w - 7, -h - 7],
      [2 * w + 7, 2 * h + 7],
    ];
    for (let step = 0; step <= 90; step++) {
      const scale = MIN_ZOOM + (step / 90) * (MAX_ZOOM - MIN_ZOOM),
        bounds = panBounds(homes, w, h, scale);
      for (const x of [rubber(-1e9, bounds[0], bounds[2]), rubber(1e9, bounds[0], bounds[2])])
        for (const y of [rubber(-1e9, bounds[1], bounds[3]), rubber(1e9, bounds[1], bounds[3])])
          for (const sky of [0, 0.2, 0.6, 1]) {
            const view = layerView(
              w,
              h,
              layerScale(scale, DEPTH.chart, sky),
              x * DEPTH.chart * sky,
              y * DEPTH.chart * sky,
            );
            expect(view[0] - 1.5).toBeGreaterThanOrEqual(box[0] + CHART_FADE);
            expect(view[1] - 1.5).toBeGreaterThanOrEqual(box[1] + CHART_FADE);
            expect(view[2] + 1.5).toBeLessThanOrEqual(box[2] - CHART_FADE);
            expect(view[3] + 1.5).toBeLessThanOrEqual(box[3] - CHART_FADE);
          }
    }
  }
});

it('caps raster area, resolution and sides, including ultrawide and high-DPI screens', () => {
  for (const [w, h] of [
    [375, 812],
    [1440, 900],
    [3840, 2160],
    [7680, 4320],
    [32000, 300],
    [300, 32000],
  ] as const)
    for (const dpr of [1, 1.5, 2, 4]) {
      const g = chartGeometry(w, h, dpr),
        board = rasterSize(w * dpr, h * dpr, 1, BOARD_PIXELS);
      expect(g.width * g.height).toBeLessThanOrEqual(CHART_PIXELS);
      expect(board.width * board.height).toBeLessThanOrEqual(BOARD_PIXELS);
      for (const n of [g.width, g.height, board.width, board.height]) {
        expect(n).toBeGreaterThan(0);
        expect(n).toBeLessThanOrEqual(CHART_SIDE);
      }
      expect(g.width / (g.box[2] - g.box[0])).toBeLessThanOrEqual(Math.min(dpr, 1.5));
    }
});

it('uses the original board raster and crops the sky atlas to the visible region', () => {
  const { s, registry } = fixture();
  s.drawChart();
  s.skyK = 0;
  drawBackgroundChart(s);
  expect(s.ctx.drawImage).toHaveBeenLastCalledWith(s.boardChart, 0, 0, s.w, s.h);
  s.skyK = 1;
  drawBackgroundChart(s);
  const calls = vi.mocked(s.ctx.drawImage).mock.calls;
  const args = calls[calls.length - 2]!;
  expect(args[0]).toBe(s.chart);
  expect(calls.at(-1)![0]).toBe(s.chartCore);
  expect(args.slice(5)).toEqual([0, 0, s.w, s.h]);
  registry.dispose();
});
