import { vi } from 'vitest';
import { LayoutRegistry } from '../layout/LayoutRegistry';
import { createState } from './createState';
import type { SkyEvents, Star } from './types';

export function fixture(reduced = false, events: SkyEvents = {}) {
  const canvas = document.createElement('canvas'),
    registry = new LayoutRegistry();
  const s = createState(canvas, canvas.getContext('2d')!, registry, events);
  s.w = 1000;
  s.h = 800;
  s.unit = 800;
  s.sky = true;
  s.skyK = 1;
  s.reduce = { matches: reduced } as MediaQueryList;
  s.hubs = () => [
    [100, 100],
    [200, 100],
    [300, 100],
    [400, 100],
    [500, 100],
    [600, 100],
    [700, 100],
    [900, 700],
  ];
  s.home = (star) => [star.ang, star.rad];
  const star = (id: string, x: number, y: number, group: Star['group'] = 'doing') => {
    const node: Star = {
      id,
      x,
      y,
      ang: x,
      rad: y,
      group,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
      alpha: 1,
      flare: 0,
      ph: 0,
      f: 1,
      code: id,
      title: id,
      late: false,
      dead: false,
    };
    s.stars.set(id, node);
    return node;
  };
  return { s, star, registry };
}

export function pointer(type: string, x: number, y: number, t: number, id = 1, touch = false) {
  const event = new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true });
  Object.defineProperties(event, {
    pointerId: { value: id },
    pointerType: { value: touch ? 'touch' : 'mouse' },
    timeStamp: { value: t },
  });
  window.dispatchEvent(event);
}

export const callbacks = () => ({ onPickStar: vi.fn(), onPickDipper: vi.fn(), onTooltip: vi.fn(), onCursor: vi.fn() });
