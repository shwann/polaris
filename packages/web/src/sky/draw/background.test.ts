import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { DEPTH } from '../constants';
import { fixture } from '../testFixture';
import { dustCopies } from './dust';
import { layerView, tileOrigins } from './background';

it('covers every screen point at all supported zooms, layer depths and distant translations', () => {
  for (const scale of [0.5, 0.7, 1, 2.4, 5])
    for (const depth of Object.values(DEPTH))
      for (const [tx, ty] of [
        [0, 0],
        [-20000, 17000],
        [12345, -6789],
      ]) {
        const view = layerView(1440, 900, scale, tx! * depth, ty! * depth);
        const tiles = tileOrigins(view, 1440, 900);
        for (let x = 0; x <= 1440; x += 40)
          for (let y = 0; y <= 900; y += 30) {
            const wx = (x - tx! * depth) / scale,
              wy = (y - ty! * depth) / scale;
            expect(tiles.some(([a, b]) => wx >= a && wx <= a + 1440 && wy >= b && wy <= b + 900)).toBe(true);
          }
        expect(tiles.length).toBeLessThanOrEqual(16);
      }
});

it('reuses the chart pattern and three cloud sprites through zooming and panning', () => {
  const { s, registry } = fixture();
  const pattern = {} as CanvasPattern;
  vi.mocked(s.ctx.createPattern).mockReturnValue(pattern);
  s.drawChart();
  s.drawNebula(100);
  const chart = s.chart,
    sprites = [...s.tints.entries()].filter(([key]) => key.startsWith('nebula:'));
  expect(sprites).toHaveLength(3);
  const build = vi.spyOn(s, 'drawChart');
  for (const scale of [0.5, 1, 5]) {
    Object.assign(s.camT, { s: scale, x: -900, y: 600 });
    s.frame(200);
  }
  expect(build).not.toHaveBeenCalled();
  expect(s.chart).toBe(chart);
  expect(s.chartPattern).toBe(pattern);
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
