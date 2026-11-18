import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../testFixture';
import { releaseStars } from '../geometry/figures/aquarius';
import { drawReleases } from './releases';
import { waterImpact } from './waterImpact';

it('drops toward the water before impact, then sends ripples out from the landing point', () => {
  const { s, registry } = fixture();
  s.tint = () => s.cvs;
  const ellipse = vi.mocked(s.ctx.ellipse),
    move = vi.mocked(s.ctx.moveTo),
    closed = vi.mocked(s.ctx.closePath);
  waterImpact(s, [400, 360], 0, 60, 900);
  const start = ellipse.mock.calls.at(-1)!;
  ellipse.mockClear();
  waterImpact(s, [400, 360], 700, 60, 900);
  expect(ellipse.mock.calls.at(-1)![1]).toBeGreaterThan(start[1]);
  expect(closed).not.toHaveBeenCalled();
  move.mockClear();
  waterImpact(s, [400, 360], 900, 60, 900);
  expect(closed).toHaveBeenCalledTimes(1);
  expect(move.mock.calls.at(-1)![1]).toBe(360);
  move.mockClear();
  closed.mockClear();
  waterImpact(s, [400, 360], 1800, 60, 900);
  expect(closed).toHaveBeenCalledTimes(3);
  expect(move.mock.calls[0]![0]).toBeGreaterThan(406);
  registry.dispose();
});

it('splashes only when the pour arrives and sends successive waves outward', () => {
  const { s, registry } = fixture();
  Object.assign(s, { w: 2000, h: 1250, releases: [{ version: '1.0', releasedAt: '2026-11-14' }] });
  const last = releaseStars(s).at(-1)!;
  const waves = () => {
    vi.mocked(s.ctx.moveTo).mockClear();
    vi.mocked(s.ctx.closePath).mockClear();
    drawReleases(s);
    return vi.mocked(s.ctx.closePath).mock.calls.length; // No delivered items, so no bottle outline.
  };
  s.aquariusFlowT = 4600;
  expect(waves()).toBe(0);
  const front = (time: number) => {
    s.aquariusFlowT = time;
    expect(waves()).toBe(3);
    const starts = vi.mocked(s.ctx.moveTo).mock.calls.slice(-3);
    return starts[0]![0] - last.point[0];
  };
  expect(front(5700)).toBeGreaterThan(front(5350));
  s.hoverRelease = last;
  expect(waves()).toBe(0);
  registry.dispose();
});
