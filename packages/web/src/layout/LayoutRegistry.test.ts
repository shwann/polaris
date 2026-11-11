import { it, expect, vi } from 'vitest';
import { LayoutRegistry } from './LayoutRegistry';
it('updates registered measurements and removes them on unmount', () => {
  const registry = new LayoutRegistry(),
    node = document.createElement('div'),
    listener = vi.fn();
  let width = 50;
  node.getBoundingClientRect = () => new DOMRect(0, 0, width, 30);
  const off = registry.subscribe(listener),
    unregister = registry.register('clock', node);
  expect(registry.get('clock')?.width).toBe(50);
  width = 80;
  registry.update();
  expect(registry.get('clock')?.width).toBe(80);
  expect(listener).toHaveBeenCalledTimes(2);
  unregister();
  expect(registry.get('clock')).toBeUndefined();
  off();
  registry.dispose();
});
