import { oldestFirst, template, type Slot } from './template';
import type { FigureTask, Region } from './types';

export const ARIES_SLOTS = [
  ['Hamal', 0.6, 0.4],
  ['Sheratan', 0.38, 0.5],
  ['Mesarthim', 0.32, 0.58],
  ['41Ari', 0.86, 0.3],
] as const satisfies readonly Slot[];
export const ARIES_OMIT = ['41Ari', 'Mesarthim', 'Sheratan'];

export function aries(tasks: FigureTask[], region: Region) {
  return template(
    oldestFirst(tasks, (task) => task.createdAt || task.updatedAt),
    region,
    ARIES_SLOTS,
    ARIES_OMIT,
    [['41Ari', 'Hamal', 'Sheratan', 'Mesarthim']],
    [
      [0.26, 0.7],
      [0.34, 0.8],
    ],
  );
}
