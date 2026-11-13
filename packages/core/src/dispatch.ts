import { DISPATCH_ENGINE_LABELS } from './enums.js';
import type { DispatchSetting } from './types.js';

/** Use the reader's local date, matching the session hook and board. */
export function dispatchDate(at: string, full = false): string {
  const d = new Date(at);
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return full ? `${d.getFullYear()}-${md}` : md;
}
export function dispatchLabel(d: DispatchSetting): string {
  return `${DISPATCH_ENGINE_LABELS[d.engine]} ${d.model} / ${d.effort}`;
}
