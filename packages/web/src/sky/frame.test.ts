import '../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from './testFixture';
import { DEPTH } from './constants';

it('shares zoom but separates sky translation; board background keeps its original transform', () => {
  const { s, registry } = fixture(true);
  Object.assign(s.camT, { s: 2, x: -100, y: -80 });
  const transforms = vi.mocked(s.ctx.setTransform);
  transforms.mockClear();
  s.frame(0);
  const calls = transforms.mock.calls;
  expect(calls[1]).toEqual([2, 0, 0, 2, -100 * DEPTH.chart, -80 * DEPTH.chart]);
  expect(calls[2]).toEqual([2, 0, 0, 2, -100 * DEPTH.nebula, -80 * DEPTH.nebula]);
  expect(calls[3]).toEqual([2, 0, 0, 2, -100 * DEPTH.dust, -80 * DEPTH.dust]);
  expect(calls[4]).toEqual([2, 0, 0, 2, -100, -80]);
  s.sky = false;
  s.skyK = 0;
  transforms.mockClear();
  s.frame(16);
  for (const call of (transforms.mock.calls as unknown as number[][]).slice(1, 4)) {
    expect(call!.slice(0, 4)).toEqual([1, 0, 0, 1]);
    expect(Math.abs(Number(call![4])) + Math.abs(Number(call![5]))).toBe(0);
  }
  registry.dispose();
});
