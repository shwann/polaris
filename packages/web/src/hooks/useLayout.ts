import { useCallback } from 'react';
import { layoutRegistry } from '../layout/LayoutRegistry';
import type { LayoutKey } from '../layout/LayoutRegistry';
export function useLayout<T extends HTMLElement>(key: LayoutKey, text = false) {
  return useCallback(
    (node: T | null) => {
      if (node) return layoutRegistry.register(key, node, text);
    },
    [key, text],
  );
}
