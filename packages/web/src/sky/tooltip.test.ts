import '../../tests/support';
import { expect, it } from 'vitest';
import { callbacks, fixture, pointer } from './testFixture';
import { attachInput } from './input';
import { clearTooltip, tooltipAllowed } from './tooltip';

it('suppresses the selected star and blocked card, then allows a fresh hover on another star', () => {
  const events = callbacks(),
    { s, star, registry } = fixture(false, events);
  s.px = 400;
  s.py = 400;
  s.onSky = true;
  s.hover = star('a', 400, 400);
  s.emitTooltip();
  expect(events.onTooltip.mock.calls.at(-1)?.[0]).toContain('a');
  clearTooltip(s);
  s.selected = 'a';
  s.emitTooltip();
  expect(events.onTooltip.mock.calls.at(-1)?.[0]).toBe('');
  s.onSky = false;
  expect(tooltipAllowed(s)).toBe(false);
  s.onSky = true;
  s.px = 500;
  s.hover = star('b', 500, 400);
  s.emitTooltip();
  expect(events.onTooltip.mock.calls.at(-1)?.[0]).toContain('b');
  registry.dispose();
});
it('clears immediately on wheel, blank close and drag, and never revives stale hover after navigation', () => {
  const events = callbacks(),
    { s, star, registry } = fixture(false, events),
    detach = attachInput(s);
  s.hover = star('a', 400, 400);
  s.onSky = true;
  s.px = 400;
  s.py = 400;
  s.emitTooltip();
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: -50, cancelable: true }));
  expect(events.onTooltip.mock.calls.at(-1)?.[0]).toBe('');
  Object.assign(s.cam, s.camT);
  expect(tooltipAllowed(s)).toBe(false);
  s.selected = 'a';
  pointer('pointerdown', 800, 400, 100);
  pointer('pointerup', 800, 400, 110);
  expect(s.selected).toBeNull();
  expect(events.onTooltip.mock.calls.at(-1)?.[0]).toBe('');
  pointer('pointerdown', 800, 400, 200);
  pointer('pointermove', 700, 400, 220);
  expect(tooltipAllowed(s)).toBe(false);
  detach();
  registry.dispose();
});

it.each(['task', 'dipper', 'pole'])(
  'keeps %s tooltips hidden at threshold, throughout dragging and until the rebound settles',
  async (kind) => {
    const { hubs } = await import('./layout');
    const { syncHubs } = await import('./motion/constellation');
    const events = callbacks(),
      { s, star, registry } = fixture(false, events);
    s.hubs = () => hubs(s);
    syncHubs(s);
    const node = kind === 'task' ? star('task', 400, 400) : null;
    const index = kind === 'pole' ? 7 : 3;
    const [x, y] = node ? [node.x, node.y] : s.hubs()[index]!;
    s.hover = node;
    s.dipHover = node ? -1 : index;
    s.px = x;
    s.py = y;
    s.onSky = true;
    s.emitTooltip();
    expect(events.onTooltip.mock.calls.at(-1)?.[0]).not.toBe('');
    const detach = attachInput(s);
    pointer('pointerdown', x, y, 0);
    pointer('pointermove', x + 6, y, 10);
    expect(events.onTooltip.mock.calls.at(-1)?.[0]).toBe('');
    expect(tooltipAllowed(s)).toBe(false);
    expect(s.tooltipSettling).toBe(true);
    pointer('pointermove', x + 160, y, 70);
    s.physics(70, 32, node ? [node] : []);
    s.emitTooltip();
    expect(events.onTooltip.mock.calls.at(-1)?.[0]).toBe('');
    pointer('pointerup', x + 160, y, 71);
    // Simulate the pointer over the rebounding star, including its zero-displacement crossing.
    for (let i = 0; i < 15; i++) {
      s.physics(71 + i * 16, 16, node ? [node] : []);
      s.hover = node;
      s.dipHover = node ? -1 : index;
      s.emitTooltip();
      expect(events.onTooltip.mock.calls.at(-1)?.[0]).toBe('');
    }
    for (const p of [...s.stars.values(), ...s.hubParticles]) p.ox = p.oy = p.vx = p.vy = 0;
    s.emitTooltip();
    expect(events.onTooltip.mock.calls.at(-1)?.[0]).not.toBe('');
    detach();
    registry.dispose();
  },
);
