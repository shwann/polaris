import '../../tests/support';
import { describe, expect, it, vi } from 'vitest';
import { attachInput } from './input';
import { cameraBounds, cameraMoving } from './motion/cameraMotion';
import { pickAt, pickRadius } from './draw/picking';
import { callbacks, fixture, pointer } from './testFixture';

function input(reduced = false) {
  const events = callbacks(),
    f = fixture(reduced, events),
    detach = attachInput(f.s);
  return {
    ...f,
    events,
    dispose: () => {
      detach();
      f.registry.dispose();
    },
  };
}

describe('pointer input', () => {
  it('pans 1:1, freezes both parallax targets and offsets, flings and stops immediately on press', () => {
    const { s, dispose } = input();
    s.mx = 0.2;
    s.my = -0.1;
    s.tx = 0.4;
    s.ty = 0.3;
    pointer('pointerdown', 500, 400, 0);
    pointer('pointermove', 460, 380, 40);
    s.frame(40);
    expect([s.cam.x, s.cam.y]).toEqual([-40, -20]);
    expect([s.mx, s.my, s.tx, s.ty]).toEqual([0.2, -0.1, 0.4, 0.3]);
    pointer('pointerup', 460, 380, 41);
    expect(cameraMoving(s)).toBe(true);
    s.frame(57);
    expect(s.cam.x).toBeLessThan(-40);
    expect([s.mx, s.my, s.tx, s.ty]).toEqual([0.2, -0.1, 0.4, 0.3]);
    pointer('pointerdown', 460, 380, 60);
    expect(s.inertia).toEqual([0, 0]);
    expect(cameraMoving(s)).toBe(false);
    dispose();
  });
  it('rubber-bands a large drag and returns within bounds after release', () => {
    const { s, dispose } = input();
    const edge = cameraBounds(s)[2];
    pointer('pointerdown', 500, 400, 0);
    pointer('pointermove', 500 + edge + 1000, 400, 50);
    // Past the edge the camera follows with diminishing travel, never more than the rubber length.
    expect(s.camT.x).toBeGreaterThan(edge);
    expect(s.camT.x).toBeLessThan(edge + 140);
    pointer('pointerup', 500 + edge + 1000, 400, 200);
    for (let t = 200; t <= 2200; t += 16) s.frame(t);
    expect(s.camT.x).toBeCloseTo(edge, 1);
    expect(cameraMoving(s)).toBe(false);
    dispose();
  });
  it('keeps a movement below 5px a click, and does not open a dragged star', () => {
    const { s, star, events, dispose } = input();
    star('a', 400, 400);
    pointer('pointerdown', 400, 400, 0);
    pointer('pointermove', 404, 400, 30);
    pointer('pointerup', 404, 400, 40);
    expect(events.onPickStar).toHaveBeenCalledWith('a');
    events.onPickStar.mockClear();
    pointer('pointerdown', 400, 400, 100);
    pointer('pointermove', 500, 400, 140);
    s.frame(140);
    expect(s.stars.get('a')!.x).toBe(500);
    pointer('pointerup', 500, 400, 141);
    expect(events.onPickStar).not.toHaveBeenCalled();
    expect(s.ripples.at(-1)?.small).toBe(true);
    dispose();
  });
  it('hides tooltips and uses grabbing as soon as a star is held', () => {
    const { star, s, events, dispose } = input();
    star('a', 400, 400);
    pointer('pointerdown', 400, 400, 0);
    expect(events.onTooltip).toHaveBeenLastCalledWith('', '', 400, 400);
    expect(events.onCursor).toHaveBeenLastCalledWith('grabbing');
    pointer('pointerup', 400, 400, 10);
    s.hover = s.stars.get('a')!;
    s.emitTooltip();
    expect(events.onTooltip.mock.calls.at(-1)?.[0]).toBe('');
    star('b', 500, 400);
    pointer('pointermove', 500, 400, 20);
    s.frame(20);
    expect(events.onTooltip.mock.calls.at(-1)?.[0]).toContain('b');
    dispose();
  });
  it('zooms blank double clicks around the clicked point, but opens stars and anchors', () => {
    const { s, star, events, dispose } = input();
    const zoom = vi.spyOn(s, 'zoomTo');
    window.dispatchEvent(new MouseEvent('dblclick', { clientX: 500, clientY: 400 }));
    expect(zoom).toHaveBeenCalledWith(500, 400, 1.6);
    expect((500 - s.camT.x) / s.camT.s).toBeCloseTo(500);
    expect((400 - s.camT.y) / s.camT.s).toBeCloseTo(400);
    Object.assign(s.camT, s.cam);
    star('a', 400, 400);
    zoom.mockClear();
    window.dispatchEvent(new MouseEvent('dblclick', { clientX: 400, clientY: 400 }));
    expect(events.onPickStar).toHaveBeenCalledWith('a');
    expect(zoom).not.toHaveBeenCalled();
    window.dispatchEvent(new MouseEvent('dblclick', { clientX: 100, clientY: 100 }));
    expect(events.onPickDipper).toHaveBeenCalledWith(0);
    dispose();
  });
  it('keeps reduced-motion dragging, zoom and picking available without inertia or rebound', () => {
    const { s, star, dispose } = input(true);
    pointer('pointerdown', 500, 400, 0);
    pointer('pointermove', 450, 400, 20);
    pointer('pointerup', 450, 400, 21);
    expect(s.camT.x).toBe(-50);
    expect(s.inertia).toEqual([0, 0]);
    s.frame(40);
    expect(s.cam.x).toBe(-50);
    Object.assign(s.cam, { x: 0, y: 0 });
    Object.assign(s.camT, s.cam);
    const a = star('a', 400, 400);
    pointer('pointerdown', 400, 400, 100);
    pointer('pointermove', 550, 400, 120);
    s.frame(120);
    expect(a.x).toBe(550);
    expect(s.stars.get('a')!.vx).toBe(0);
    pointer('pointerup', 550, 400, 121);
    expect(a.x).toBe(400);
    expect(a.ox).toBe(0);
    expect(s.ripples).toEqual([]);
    s.zoomTo(500, 400, 2);
    s.frame(140);
    expect(s.cam.s).toBe(2);
    dispose();
  });
  it('supports single-touch inertia, consumes pinch tails and cancels without a fling', () => {
    const { s, dispose } = input();
    pointer('pointerdown', 500, 400, 0, 1, true);
    pointer('pointermove', 450, 400, 40, 1, true);
    pointer('pointerup', 450, 400, 41, 1, true);
    expect(cameraMoving(s)).toBe(true);
    pointer('pointerdown', 400, 400, 60, 1, true);
    pointer('pointerdown', 600, 400, 61, 2, true);
    pointer('pointermove', 650, 400, 80, 2, true);
    expect(s.camT.s).toBeCloseTo(1.25);
    pointer('pointerup', 650, 400, 81, 2, true);
    pointer('pointermove', 350, 400, 100, 1, true);
    pointer('pointerup', 350, 400, 101, 1, true);
    expect(s.inertia).toEqual([0, 0]);
    expect(s.drag).toBeNull();
    pointer('pointerdown', 500, 400, 120);
    pointer('pointermove', 450, 400, 140);
    pointer('pointercancel', 450, 400, 141);
    expect(cameraMoving(s)).toBe(false);
    dispose();
  });
  it('does not add inertia to trackpad panning and honors blocked UI targets', () => {
    const { s, dispose } = input();
    s.padMode = true;
    window.dispatchEvent(new WheelEvent('wheel', { deltaX: 30, deltaY: 20, cancelable: true }));
    expect(s.inertia).toEqual([0, 0]);
    expect(s.camT.x).toBe(-30);
    s.events.isBlocked = () => true;
    pointer('pointerdown', 500, 400, 0);
    expect(s.drag).toBeNull();
    dispose();
  });
  it('uses the same scaled coordinates for hit testing and clamps screen radii', () => {
    const { s, star, dispose } = input();
    const a = star('a', 400, 400);
    Object.assign(s.cam, { s: 2, x: -200, y: -100 });
    s.mx = 0.3;
    const [x, y] = s.toScreen(...s.at(a.x, a.y, 14));
    expect(pickAt(s, x + 28, y).star).toBe(a);
    expect(pickAt(s, x + 40, y).star).toBeNull();
    expect(pickRadius(0.01)).toBe(18);
    expect(pickRadius(100)).toBe(36);
    dispose();
  });
});
it('zooms a touch double tap once even if the browser emits a synthetic double click', () => {
  const { s, registry } = fixture(),
    detach = attachInput(s),
    zoom = vi.spyOn(s, 'zoomTo');
  pointer('pointerdown', 500, 400, 0, 1, true);
  pointer('pointerup', 500, 400, 10, 1, true);
  pointer('pointerdown', 500, 400, 100, 1, true);
  pointer('pointerup', 500, 400, 110, 1, true);
  const double = new MouseEvent('dblclick', { clientX: 500, clientY: 400 });
  Object.defineProperty(double, 'timeStamp', { value: 111 });
  window.dispatchEvent(double);
  expect(zoom).toHaveBeenCalledTimes(1);
  expect(s.camT.s).toBe(1.6);
  detach();
  registry.dispose();
});
it('preserves the last release position even between animation frames', () => {
  const { s, star, registry } = fixture(),
    a = star('a', 400, 400),
    detach = attachInput(s);
  pointer('pointerdown', 400, 400, 0);
  pointer('pointermove', 450, 400, 20);
  pointer('pointerup', 500, 400, 30);
  expect(a.x).toBe(500);
  expect(a.ox).toBe(100);
  detach();
  registry.dispose();
});

it('returns the whole compact chart above the measured toolbar after a zoomed-out corner drag', () => {
  const { s, star, dispose } = input(),
    node = document.createElement('div');
  vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(new DOMRect(357, 832, 726, 45));
  s.w = 1440;
  s.h = 900;
  s.registry.register('skybar', node);
  star('edge', 1100, 750);
  Object.assign(s.cam, { s: 0.5 });
  Object.assign(s.camT, s.cam);
  pointer('pointerdown', 600, 400, 0);
  pointer('pointermove', 2400, 1800, 70);
  const bounds = cameraBounds(s);
  expect(s.cam.x).toBeGreaterThan(bounds[2]);
  expect(s.cam.y).toBeGreaterThan(bounds[3]);
  pointer('pointerup', 2400, 1800, 71);
  for (let t = 80; t <= 2080; t += 1000 / 60) s.frame(t);
  expect(s.toScreen(100, 100)[0]).toBeGreaterThanOrEqual(24);
  expect(s.toScreen(100, 100)[1]).toBeGreaterThanOrEqual(24);
  expect(s.toScreen(1100, 750)[0]).toBeLessThanOrEqual(1440 - 24 + 0.01);
  expect(s.toScreen(1100, 750)[1]).toBeLessThanOrEqual(832 - 24 + 0.01);
  dispose();
});

it('keeps the simulation clock monotonic if a queued rAF timestamp predates pointerup', () => {
  const { s, star, dispose } = input(),
    a = star('a', 400, 400);
  pointer('pointerdown', 400, 400, 0);
  pointer('pointermove', 500, 400, 40);
  s.frame(50);
  pointer('pointerup', 560, 400, 70);
  expect(s.soft.time).toBe(70);
  const ox = a.ox;
  s.frame(66);
  expect(s.soft.time).toBe(70);
  expect(a.ox).toBe(ox);
  s.frame(83);
  expect(s.soft.time).toBe(83);
  expect(a.ox).toBeGreaterThan(ox);
  dispose();
});
