import { beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { dataStore } from '../src/store/dataStore';
import { uiStore } from '../src/store/uiStore';
import { sample } from './fixtures/sample';
import { layoutRegistry } from '../src/layout/LayoutRegistry';
export function canvasContext() {
  const gradient = { addColorStop: vi.fn() },
    methods: Record<string, unknown> = {
      globalAlpha: 1,
      measureText: () => ({ width: 40 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
    };
  return new Proxy(methods, {
    get: (target, key) => target[String(key)] ?? (target[String(key)] = vi.fn()),
    set: (target, key, value) => {
      target[String(key)] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-11T10:00:00+08:00'));
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext());
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  vi.stubGlobal('CSS', { escape: (s: string) => s.replace(/[^\w-]/g, '') });
  dataStore.setState({
    snapshot: sample,
    credentials: null,
    writing: false,
    writeRevision: 0,
    notice: null,
    origin: 'mirror',
    label: 'MIRROR · 11-11 09:00',
    connected: true,
    message: '',
    booted: true,
    changed: new Set(),
    logRevision: 0,
  });
  window.history.replaceState(null, '', '/');
  uiStore.setState({
    view: 'tasks',
    requirementsFilter: { query: '', priority: '', status: '', gapsOnly: false },
    system: 'main',
    query: '',
    mineOnly: false,
    pinned: -1,
    hovered: -1,
    sky: false,
    input: 'mouse',
    inputChosen: false,
    projection: false,
    selected: null,
    selectedRelease: null,
    deliveryVersion: null,
    releaseFocus: null,
    dip: -1,
    dipAll: false,
    dipKeyboard: false,
  });
});
afterEach(() => {
  cleanup();
  layoutRegistry.dispose();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.documentElement.className = '';
  localStorage.clear();
});
