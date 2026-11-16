import '../../../tests/support';
import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { p2 } from '../../domain/time';
import { hash } from '../palette';
import { fixture } from '../testFixture';

/** Record geometry, styles and gradient stops without depending on a native canvas. */
function recorder() {
  const calls: unknown[][] = [];
  const transforms: unknown[][] = [];
  const gradient = { addColorStop: (...args: unknown[]) => calls.push(['stop', ...args]) };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get:
      (_, key) =>
      (...args: unknown[]) => {
        // Transforms are checked separately; compare the original viewport drawing commands.
        if (['scale', 'translate', 'setTransform'].includes(String(key))) transforms.push([key, ...args]);
        else calls.push([key, ...args]);
        return String(key).includes('Gradient') ? gradient : undefined;
      },
    set: (_, key, value) => {
      calls.push(['set', key, value === gradient ? 'gradient' : value]);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { calls, transforms, ctx };
}

it('preserves v42 board chart geometry, styles, dark lane and centre mask at all baseline widths', () => {
  const html = readFileSync('history/index.v42.html', 'utf8');
  const legacy = html.slice(html.indexOf('  function drawChart() {'), html.indexOf('  function size() {'));
  const run = new Function('document', 'w', 'h', 'dpr', 'unit', 'hash', 'p2', `let chart; ${legacy}\n drawChart();`);
  for (const [w, dpr] of [
    [1440, 2],
    [1000, 2],
    [960, 2],
    [375, 2],
    [375, 1.25],
  ] as const) {
    const { s, registry } = fixture();
    Object.assign(s, { w, h: 900, unit: Math.min(w, 1260), dpr });
    const old = recorder();
    run({ createElement: () => ({ getContext: () => old.ctx }) }, s.w, s.h, s.dpr, s.unit, hash, p2);
    const contexts: ReturnType<typeof recorder>[] = [];
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => {
      const record = recorder();
      contexts.push(record);
      return record.ctx;
    });
    s.drawChart();
    const rounded = (calls: unknown[][]) =>
      calls.map((call) => call.map((v) => (typeof v === 'number' ? Math.round(v * 1e8) / 1e8 : v)));
    expect(rounded(contexts[1]!.calls)).toEqual(rounded(old.calls));
    expect(s.chartCore!.width).toBe(Math.round(w * dpr));
    expect(s.chartCore!.height).toBe(900 * dpr);
    expect(contexts[1]!.transforms[0]).toEqual(['setTransform', dpr, 0, 0, dpr, 0, 0]);
    const sky = contexts[0]!.calls;
    expect(sky).toContainEqual(['set', 'globalCompositeOperation', 'destination-out']);
    expect(sky.some(([method]) => method === 'arc')).toBe(true);
    expect(sky.some(([method]) => method === 'bezierCurveTo')).toBe(true);
    expect(sky.some(([method]) => method === 'createPattern')).toBe(false);
    registry.dispose();
  }
});
