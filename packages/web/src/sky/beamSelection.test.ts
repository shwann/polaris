import '../../tests/support';
import { afterEach, expect, it, vi } from 'vitest';
import { SkyEngine } from './SkyEngine';
import * as stateModule from './createState';
import { LayoutRegistry } from '../layout/LayoutRegistry';
import { dataStore } from '../store/dataStore';
import { escapeLayer, openDip, setSky, uiStore } from '../store/uiStore';
import { selectFromSky, selectRelease } from '../hooks/skyBridge';
import { COL_APP } from '../domain/lanes';
import { pointer } from './testFixture';
import { beamTargets } from './draw/beamTargets';
import { drawBeams } from './draw/beams';
import { releaseStars } from './geometry/figures/aquarius';
import type { Point } from './types';

const cleanups: (() => void)[] = [];
afterEach(() => cleanups.splice(0).forEach((dispose) => dispose()));

function setup() {
  vi.stubGlobal('innerWidth', 2000);
  vi.stubGlobal('innerHeight', 1250);
  const snapshot = structuredClone(dataStore.getState().snapshot!),
    base = snapshot.tasks[0]!;
  snapshot.systems[0]!.releases = Array.from({ length: 12 }, (_, i) => ({
    version: `.${22 + i}`,
    releasedAt: `2026-11-${String(i + 1).padStart(2, '0')}T21:20:00+08:00`,
  }));
  snapshot.tasks.push(
    ...Array.from({ length: 7 }, (_, i) => ({
      ...base,
      id: `DELIVERY-${i}`,
      code: `CASH${i}`,
      lane: 'done' as const,
      shippedIn: '.33',
    })),
    { ...base, id: 'OTHER-RELEASE', lane: 'done', shippedIn: '.32' },
  );
  dataStore.setState({ snapshot });
  const create = vi.spyOn(stateModule, 'createState'),
    registry = new LayoutRegistry(),
    engine = new SkyEngine(document.createElement('canvas'), registry, {
      onPickDipper: (index) => openDip(index, true),
      onPickRelease: selectRelease,
      onPickStar: selectFromSky,
    }),
    s = create.mock.results[0]!.value as ReturnType<typeof stateModule.createState>;
  cleanups.push(() => {
    engine.destroy();
    registry.dispose();
  });
  setSky(true);
  const click = (point: Point) => {
    pointer('pointerdown', ...point, 0);
    pointer('pointerup', ...point, 10);
  };
  const dip = (index: number) => click(engine.dipScreen(index)!);
  const release = (version = '.33') => {
    const node = s.aquarius!.stars.find((star) => star.release.version === version)!;
    click(s.toScreen(...s.at(...node.point, 14)));
  };
  const ids = () => new Set(beamTargets(s)?.ends.map((end) => end.id));
  return { s, click, dip, release, ids };
}

it('clicks Dubhe and beams to every release star, including versions beyond eight', () => {
  const { s, dip, ids } = setup();
  dip(0);
  expect(uiStore.getState().dip).toBe(0);
  expect(ids()).toEqual(new Set(s.releases.map((release) => release.version)));
  expect(ids().size).toBe(12);
  expect(beamTargets(s)).toMatchObject({ origin: s.dipPos[0], open: true });
  expect(beamTargets(s)!.ends.every((end) => end.color === COL_APP && end.dash)).toBe(true);
});

it('clicks .33 and beams to exactly its seven delivered items', () => {
  const { s, release, ids } = setup();
  release();
  expect(uiStore.getState().selectedRelease).toBe('.33');
  expect(ids()).toEqual(new Set(Array.from({ length: 7 }, (_, i) => `DELIVERY-${i}`)));
  expect(beamTargets(s)!.open).toBe(true);
  expect(beamTargets(s)!.ends.every((end) => end.color === COL_APP && end.dash)).toBe(true);
});

it.each(['alpha', 'release'] as const)('retains %s beams after closing, at 70 percent opacity', (kind) => {
  const { s, dip, release, ids } = setup();
  if (kind === 'alpha') dip(0);
  else release();
  const before = ids(),
    alpha: string[] = [];
  const stroke = vi.spyOn(s.ctx, 'stroke').mockImplementation(() => {
    if (s.ctx.lineWidth === 0.9) alpha.push(String(s.ctx.strokeStyle));
  });
  drawBeams(s, 100);
  const open = alpha.splice(0);
  escapeLayer();
  expect(ids()).toEqual(before);
  expect(beamTargets(s)!.open).toBe(false);
  alpha.splice(0);
  drawBeams(s, 100);
  expect(alpha).toHaveLength(open.length);
  alpha.forEach((style, i) => {
    const opacity = (value: string) => Number(value.slice(value.lastIndexOf(',') + 1, -1));
    expect(opacity(style)).toBeCloseTo(opacity(open[i]!) * 0.7, 2);
  });
  expect(s.ctx.setLineDash).toHaveBeenCalledWith([3, 5]);
  stroke.mockRestore();
});

it('replaces retained beams when switching between releases, Dubhe and another Dipper star', () => {
  const { s, dip, release, ids } = setup();
  dip(3);
  const group = new Set(s.dipIds as string[]);
  expect(ids()).toEqual(group);
  dip(0);
  expect(s.beamSel).toBe(0);
  expect(ids()).toEqual(new Set(s.releases.map((r) => r.version)));
  release();
  expect(s).toMatchObject({ beamSel: -1, beamRelease: '.33', dipIds: [] });
  escapeLayer();
  release('.32');
  expect(ids()).toEqual(new Set(['OTHER-RELEASE']));
  dip(3);
  expect(s).toMatchObject({ beamSel: 3, beamRelease: null });
  expect(ids()).toEqual(group);
});

it.each(['alpha', 'release'] as const)(
  'clears retained %s beams on leaving the sky and keeps them cleared on return',
  (kind) => {
    const { s, dip, release } = setup();
    if (kind === 'alpha') dip(0);
    else release();
    escapeLayer();
    setSky(false);
    expect(s).toMatchObject({ beamSel: -1, beamRelease: null, dipIds: [] });
    expect(beamTargets(s)).toBeNull();
    setSky(true);
    expect(beamTargets(s)).toBeNull();
  },
);

it('follows live particles and Dipper anchors after a card closes', () => {
  const { s, dip, release } = setup();
  release();
  escapeLayer();
  const source = s.aquarius!.stars.find((n) => n.release.version === '.33')!,
    target = s.aquarius!.jar.nodes.find((n) => n.id === 'DELIVERY-0')!,
    before = beamTargets(s)!;
  source.particle.ox += 24;
  target.particle.oy -= 18;
  releaseStars(s);
  const after = beamTargets(s)!;
  expect(after.origin[0] - before.origin[0]).toBeCloseTo(24);
  expect(
    after.ends.find((n) => n.id === target.id)!.point[1] - before.ends.find((n) => n.id === target.id)!.point[1],
  ).toBeCloseTo(-18);
  vi.mocked(s.ctx.quadraticCurveTo).mockClear();
  drawBeams(s, 100);
  expect(s.ctx.moveTo).toHaveBeenCalledWith(...after.origin);
  expect(vi.mocked(s.ctx.quadraticCurveTo).mock.calls.map((call) => call.slice(2))).toEqual(
    after.ends.map((n) => n.point),
  );
  dip(0);
  escapeLayer();
  s.dipPos[0] = [700, 500];
  expect(beamTargets(s)!.origin).toEqual([700, 500]);
  const liveSource = s.aquarius!.stars.find((n) => n.release.version === '.33')!;
  expect(beamTargets(s)!.ends.find((n) => n.id === '.33')!.point).toEqual(s.at(...liveSource.point, 14));
});
