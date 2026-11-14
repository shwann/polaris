import { oldestFirst, template, type Slot } from './template';
import type { FigureTask, Region } from './types';

export const TAURUS_SLOTS = [
  ['muzzle', 0.5, 0.86],
  ['browL', 0.34, 0.36],
  ['browR', 0.66, 0.36],
  ['hornL', 0.16, 0.26],
  ['hornR', 0.84, 0.26],
  ['tipL', 0.08, 0.06],
  ['tipR', 0.92, 0.06],
  ['cheekL', 0.36, 0.62],
  ['cheekR', 0.64, 0.62],
] as const satisfies readonly Slot[];
export const TAURUS_OMIT = ['cheekR', 'cheekL', 'hornR', 'hornL', 'tipR', 'tipL', 'browR', 'browL'];

export function taurus(tasks: FigureTask[], region: Region) {
  // Tasks expose no merge timestamp; updatedAt is the available proxy for entry into release.
  return template(
    oldestFirst(tasks, (task) => task.updatedAt),
    region,
    TAURUS_SLOTS,
    TAURUS_OMIT,
    [
      ['tipL', 'hornL', 'browL', 'browR', 'hornR', 'tipR'],
      ['browL', 'cheekL', 'muzzle', 'cheekR', 'browR'],
    ],
    [
      [0.2, 0.42],
      [0.8, 0.42],
      [0.42, 0.5],
      [0.58, 0.5],
    ],
  );
}
