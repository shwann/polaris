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
