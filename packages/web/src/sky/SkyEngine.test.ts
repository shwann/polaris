import '../../tests/support';
import { it, expect, vi } from 'vitest';
import { SkyEngine } from './SkyEngine';
import { LayoutRegistry } from '../layout/LayoutRegistry';
import { uiStore } from '../store/uiStore';
import { dataStore } from '../store/dataStore';
import { sample } from '../../tests/fixtures/sample';
it.each([
  [1440, 900],
  [1000, 800],
  [960, 800],
  [375, 812],
  [1, 0],
])('draws the complete sample without errors at %sx%s and disposes cleanly', (width, height) => {
  vi.stubGlobal('innerWidth', width);
  vi.stubGlobal('innerHeight', height);
  const warn = vi.spyOn(console, 'warn'),
    registry = new LayoutRegistry(),
    engine = new SkyEngine(document.createElement('canvas'), registry, {});
  uiStore.setState({ sky: true, dip: 7, selected: 'EXPORT' });
  engine.zoom(2);
  engine.reveal('EXPORT');
  dataStore.setState({ logRevision: 1 });
  uiStore.setState({ dip: 3, pinned: 4 });
  engine.resetView();
  engine.destroy();
  registry.dispose();
  expect(warn).not.toHaveBeenCalled();
});
it('keeps frame animation separate from React, handles wheel input and stops on destroy', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const warn = vi.spyOn(console, 'warn'),
    move = vi.fn(),
    registry = new LayoutRegistry(),
    engine = new SkyEngine(document.createElement('canvas'), registry, { onSelectedMove: move });
  uiStore.setState({ sky: true, selected: 'EXPORT' });
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: 10, clientX: 100, clientY: 100, cancelable: true }));
  await vi.advanceTimersByTimeAsync(48);
  expect(move).toHaveBeenCalled();
  const count = move.mock.calls.length;
  engine.destroy();
  await vi.advanceTimersByTimeAsync(48);
  expect(move).toHaveBeenCalledTimes(count);
  expect(warn).not.toHaveBeenCalled();
  registry.dispose();
});
it('keeps dead task stars fading without breaking cluster drawing', () => {
  const warn = vi.spyOn(console, 'warn'),
    registry = new LayoutRegistry(),
    engine = new SkyEngine(document.createElement('canvas'), registry, {});
  dataStore.setState({ snapshot: { ...sample, tasks: [] } });
  uiStore.setState({ sky: true });
  expect(warn).not.toHaveBeenCalled();
  engine.destroy();
  registry.dispose();
});
it('keeps wheel input and click picking active with reduced motion enabled', async () => {
  const registry = new LayoutRegistry(),
    onPickDipper = vi.fn();
  const engine = new SkyEngine(document.createElement('canvas'), registry, { onPickDipper });
  uiStore.setState({ sky: true });
  const before = engine.dipScreen(0)!;
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 0, clientY: 0, cancelable: true }));
  await vi.advanceTimersByTimeAsync(32);
  const after = engine.dipScreen(0)!;
  expect(after[0]).toBeGreaterThan(before[0]);
  const down = new MouseEvent('pointerdown', { clientX: after[0], clientY: after[1] });
  Object.defineProperty(down, 'pointerId', { value: 1 });
  window.dispatchEvent(down);
  const up = new MouseEvent('pointerup', { clientX: after[0], clientY: after[1] });
  Object.defineProperty(up, 'pointerId', { value: 1 });
  window.dispatchEvent(up);
  expect(onPickDipper).toHaveBeenCalledWith(0);
  engine.destroy();
  registry.dispose();
});
