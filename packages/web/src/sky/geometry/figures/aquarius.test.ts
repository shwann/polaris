import '../../../../tests/support';
import { expect, it, vi } from 'vitest';
import { aquariusAt, pickRelease, pickUrn, releaseFigure } from './aquarius';
import { drawReleases } from '../../draw/releases';
import { attachInput } from '../../input';
import { fixture, pointer } from '../../testFixture';
import { drawPicking } from '../../draw/picking';
import { goRelease } from '../../../hooks/skyBridge';
import { uiStore } from '../../../store/uiStore';
import { emitTooltip } from '../../tooltip';
import type { Release } from '@polaris/core';

const releases = (n: number): Release[] =>
  Array.from({ length: n }, (_, i) => ({
    version: `.${i}`,
    releasedAt: new Date(Date.UTC(2026, 10, i + 1)).toISOString(),
    title: '发布简介',
    tag: 'fix',
    items: Array.from({ length: 3 }, (_, j) => ({
      id: `t${i}-${j}`,
      code: `FIX-${i}-${j}`,
      title: '修复',
      kind: 'fix',
    })),
  }));

it('clicks a version into board history without selecting a task', () => {
  const picked = vi.fn(),
    onPickRelease = vi.fn(goRelease);
  const { s, registry } = fixture(true, { onPickStar: picked, onPickRelease });
  s.releases = releases(11);
  const node = releaseFigure(s).stars[5]!;
  const detach = attachInput(s),
    [x, y] = node.point;
  expect(pickRelease(s, x, y)?.release.version).toBe('.5');
  pointer('pointerdown', x, y, 0);
  expect(s.drag?.star).toBeNull();
  pointer('pointerup', x, y, 10);
  expect(onPickRelease).toHaveBeenCalledWith('.5');
  expect(uiStore.getState()).toMatchObject({ sky: false, releaseFocus: '.5' });
  expect(picked).not.toHaveBeenCalled();
  expect(s.stars.size).toBe(0);
  detach();
  registry.dispose();
});

it.each(['version', 'rim'] as const)(
  'drags the %s with one translation, preserving all geometry and the camera',
  (handle) => {
    const onPickRelease = vi.fn(),
      picked = vi.fn();
    const { s, registry, star } = fixture(false, { onPickRelease, onPickStar: picked });
    s.releases = releases(12);
    const other = star('other', 10, 10),
      f = releaseFigure(s);
    Object.assign(s.cam, { s: 2, x: -50, y: -60 });
    Object.assign(s.camT, s.cam);
    s.mx = 0.2;
    s.my = -0.3;
    s.aquariusOffset = [13, -7];
    const before = [...f.points, ...f.waves.flat(), f.surface].map((p) => aquariusAt(s, p));
    const node = handle === 'version' ? f.stars[5]!.point : f.rim[4]!;
    const [x, y] = s.toScreen(...aquariusAt(s, node));
    const camera = { ...s.cam },
      detach = attachInput(s);
    pointer('pointerdown', x, y, 10);
    expect(s.drag?.aquarius).toEqual([13, -7]);
    pointer('pointermove', x + 80, y + 40, 80);
    pointer('pointerup', x + 80, y + 40, 160);
    const after = [...f.points, ...f.waves.flat(), f.surface].map((p) => aquariusAt(s, p));
    after.forEach((p, i) => {
      expect(p[0] - before[i]![0]).toBeCloseTo(40);
      expect(p[1] - before[i]![1]).toBeCloseTo(20);
    });
    expect(s.cam).toEqual(camera);
    expect(s.camT).toEqual(camera);
    expect([other.x, other.y]).toEqual([10, 10]);
    expect(onPickRelease).not.toHaveBeenCalled();
    expect(picked).not.toHaveBeenCalled();
    expect(s.inertia).toEqual([0, 0]);
    detach();
    registry.dispose();
  },
);

it('cancels an urn drag without activating a version or retaining displacement', () => {
  const onPickRelease = vi.fn(),
    { s, registry } = fixture(true, { onPickRelease });
  s.releases = releases(1);
  const [x, y] = releaseFigure(s).stars[0]!.point,
    detach = attachInput(s);
  pointer('pointerdown', x, y, 0);
  pointer('pointermove', x + 50, y, 40);
  pointer('pointercancel', x + 50, y, 80);
  expect(s.aquariusOffset).toEqual([0, 0]);
  expect(onPickRelease).not.toHaveBeenCalled();
  detach();
  registry.dispose();
});

it('keeps delivery dots decorative and shows release metadata while lighting exactly its deliveries', () => {
  const onTooltip = vi.fn(),
    { s, registry } = fixture(true, { onTooltip });
  s.releases = releases(2);
  const f = releaseFigure(s);
  for (const p of f.inner) {
    expect(pickRelease(s, ...p.point)).toBeNull();
    expect(pickUrn(s, ...p.point)).toBe(false);
  }
  s.onSky = true;
  [s.px, s.py] = f.stars[0]!.point;
  drawPicking(s, 0, []);
  emitTooltip(s);
  drawReleases(s);
  expect(onTooltip.mock.calls.at(-1)?.[0]).toContain('.0 · 修复 · 2026-');
  expect(onTooltip.mock.calls.at(-1)?.[1]).toContain('发布简介\n交付 3 项');
  const lit = vi
    .mocked(s.ctx.arc)
    .mock.calls.filter((call) => call[2] === 2.7)
    .map((call) => call.slice(0, 2));
  expect(lit).toEqual(f.inner.filter((p) => p.version === '.0').map((p) => p.point));
  expect(s.stars.size).toBe(0);
  registry.dispose();
});

it('draws the approved outline, both waves, three rings and the Dubhe tether on the first frame', () => {
  const { s, registry } = fixture(true);
  s.releases = releases(15);
  const f = releaseFigure(s);
  drawReleases(s);
  const ends = vi.mocked(s.ctx.lineTo).mock.calls;
  expect(vi.mocked(s.ctx.moveTo).mock.calls[0]).toEqual(s.hubs()[0]);
  expect(ends[0]).toEqual(f.lip);
  for (const p of [...f.rim.slice(1), ...f.waves.flat()]) expect(ends).toContainEqual(p);
  expect(s.ctx.quadraticCurveTo).toHaveBeenCalledTimes(3);
  expect(s.ctx.bezierCurveTo).toHaveBeenCalledTimes(2);
  expect(s.ctx.ellipse).toHaveBeenCalledTimes(3);
  expect(vi.mocked(s.ctx.fillText).mock.calls.some((call) => call[0] === '.14')).toBe(true);
  registry.dispose();
});

it('keeps the home camera inside its bounds with the entire urn and ripples included', async () => {
  const { cameraBounds } = await import('../../motion/cameraMotion');
  const { constrain } = await import('../../motion/bounds');
  const { s, registry } = fixture(true);
  s.w = 2000;
  s.h = 1250;
  s.releases = releases(12);
  expect(constrain([0, 0], cameraBounds(s))).toEqual([0, 0]);
  registry.dispose();
});

it('keeps the narrow overview readable and reveals every version label when zoomed', () => {
  const { s, registry } = fixture(true);
  s.w = 390;
  s.h = 844;
  s.releases = releases(12);
  drawReleases(s);
  const labels = vi.mocked(s.ctx.fillText);
  expect(labels.mock.calls.filter(([text]) => /^\.\d+$/.test(text)).map(([text]) => text)).toEqual(['.11']);
  labels.mockClear();
  s.cam.s = 2;
  drawReleases(s);
  expect(labels.mock.calls.filter(([text]) => /^\.\d+$/.test(text))).toHaveLength(12);
  registry.dispose();
});
