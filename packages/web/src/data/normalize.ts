import { fromLegacy } from '@polaris/core';
import type { LegacyBoard, LegacyLog, LegacyTask } from '@polaris/core';
import type { DisplaySnapshot } from '../domain/types';
export function normalize(value: unknown, now = new Date().toISOString()): DisplaySnapshot {
  if (!value || typeof value !== 'object') throw new Error('Invalid snapshot');
  if ('schema' in value && value.schema === 1) return value as DisplaySnapshot;
  const raw = value as { board?: LegacyBoard; log?: LegacyLog; tasks?: LegacyTask[] };
  if (!Array.isArray(raw.tasks)) throw new Error('Invalid legacy tasks');
  const s: DisplaySnapshot = fromLegacy({ ...raw, tasks: raw.tasks }, now);
  const text = (key: string) => (typeof raw.board?.[key] === 'string' ? (raw.board[key] as string) : undefined);
  s.presentation = {
    primaryAppPresent: !!raw.board?.app,
    note: text('note'),
    appNote: text('appNote'),
    appVersion: text('appVersion'),
    nextRelease: text('nextRelease'),
  };
  return s;
}
