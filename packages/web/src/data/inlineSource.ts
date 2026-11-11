import type { DataSource } from './DataSource';
import { normalize } from './normalize';
import { fmt } from '../domain/time';
export function inlineSource(value: unknown): DataSource {
  const snapshot = normalize(value);
  const date = value && typeof value === 'object' && 'generatedAt' in value ? String(value.generatedAt || '') : '';
  return {
    kind: 'mirror',
    label: 'MIRROR · ' + (date ? fmt(date, true) : '镜像'),
    subscribe(onData) {
      let active = true;
      queueMicrotask(() => {
        if (active) onData({ snapshot, confirmed: true });
      });
      return () => {
        active = false;
      };
    },
  };
}
