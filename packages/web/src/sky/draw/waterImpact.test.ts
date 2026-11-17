import '../../../tests/support';
import { expect, it, vi } from 'vitest';
import { fixture } from '../testFixture';
import { releaseStars } from '../geometry/figures/aquarius';
import { drawReleases } from './releases';

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
