import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../testFixture';
import { hubs, hubHomes } from '../layout';
import { measureHubLabels } from '../geometry/hubLabels';
import { advanceCamera, cameraBounds } from './cameraMotion';

it.each([0.5, 0.65, 0.8])(
  'contains freshly measured hub captions with 24px margins and toolbar clearance at %s',
  (scale) => {
    const { s, registry } = fixture();
    s.w = 1440;
    s.h = 900;
    s.unit = 1260;
    s.hubs = () => hubs(s);
    s.board = { app: null, appVersion: '.36', nextRelease: '.39' };
    s.unvN = 4;
    // Ink width changes with the actual rendering font, not a fixed character estimate.
    s.ctx.measureText = vi.fn((text: string) => {
      const fontSize = Number(/([\d.]+)px/.exec(s.ctx.font)?.[1] || 10),
        width = text.length * fontSize * 0.7;
      return {
        width,
        actualBoundingBoxAscent: fontSize * 0.85,
        actualBoundingBoxDescent: fontSize * 0.25,
      } as TextMetrics;
    });
    const bar = document.createElement('div');
    vi.spyOn(bar, 'getBoundingClientRect').mockReturnValue(new DOMRect(500, 830, 440, 50));
    registry.register('skybar', bar);
    s.cam.s = s.camT.s = scale;
    const b = cameraBounds(s),
      labels = measureHubLabels(s, hubHomes(s), scale).flat();
    for (const [x, y] of [
      [b[0], b[1]],
      [b[2], b[3]],
    ])
      for (const box of labels) {
        expect(box[0] * scale + x!).toBeGreaterThanOrEqual(24 - 1e-6);
        expect(box[2] * scale + x!).toBeLessThanOrEqual(1440 - 24 + 1e-6);
        expect(box[1] * scale + y!).toBeGreaterThanOrEqual(24 - 1e-6);
        expect(box[3] * scale + y!).toBeLessThanOrEqual(830 - 24 + 1e-6);
      }
    s.camT.x = b[2] + 120;
    s.camT.y = b[3] + 120;
    for (let i = 0; i < 120; i++) advanceCamera(s, 1000 / 60);
    expect(s.camT.x).toBeCloseTo(b[2], 4);
    expect(s.camT.y).toBeCloseTo(b[3], 4);
    s.hubParticles = [{ baseX: 0, baseY: 0, ox: 200, oy: 100, vx: 0, vy: 0 }];
    expect(cameraBounds(s)).toEqual(b);
    registry.dispose();
  },
);
