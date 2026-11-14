import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../testFixture';
import { labelLines, shortLength } from '../draw/starLabels';
import { CAMERA_SNAP } from './labelZoom';

it('changes abbreviated titles only at four-character semantic zoom bands', () => {
  expect([2.4, 2.7, 2.8, 3.1, 3.2, 3.59].map((zoom) => shortLength(zoom))).toEqual([8, 8, 12, 12, 16, 16]);
  expect(shortLength(2.7, false)).toBe(10);
  expect(labelLines('A', '字'.repeat(30), 3.6, true)).toHaveLength(3);
});

it.each([
  [2.4, false],
  [3.0, false],
  [3.6, false],
  [3.0, true],
] as const)('commits all 74 label choices at camera rest after zoom to %s (pointer %s)', (zoom, pointer) => {
  const { s, star, registry } = fixture();
  s.w = 1440;
  s.h = 900;
  s.unit = 1260;
  for (let i = 0; i < 74; i++) {
    const p = star(`TASK-${i}`, 180 + (i % 10) * 110, 180 + Math.floor(i / 10) * 80);
    p.title = `任务标题${i}：缩放后应一次排定所有文字`;
    p.baseX = p.x - 12;
    p.baseY = p.y - 8;
  }
  if (pointer) {
    s.px = 720;
    s.py = 450;
    s.onSky = true;
  }
  s.layoutScale = 1;
  s.zoomTo(720, 450, zoom);
  let settledAt = 0,
    lastChange = 0,
    previous = '';
  const draw = vi.mocked(s.ctx.fillText);
  for (let t = 16; t <= 4000; t += 16) {
    draw.mockClear();
    s.frame(t);
    const text = draw.mock.calls
      .map((c) => c[0])
      .filter((c) => /^TASK-|^任务标题/.test(String(c)))
      .join('|');
    if (text !== previous) lastChange = t;
    previous = text;
    if (!settledAt && s.labelLayout?.settled) {
      settledAt = t;
      expect(s.cam).toEqual(s.camT);
    }
  }
  expect(CAMERA_SNAP).toBeLessThan(1);
  expect(settledAt).toBeGreaterThan(0);
  expect(settledAt).toBeLessThan(1000);
  expect(lastChange).toBeLessThanOrEqual(settledAt + 300);
  expect(previous).toContain('TASK-');
  registry.dispose();
});
