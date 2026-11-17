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

const FOUR_TASK_SLOTS = [
  TAURUS_SLOTS[0],
  ['tipL', 0.08, 0.13],
  ['tipR', 0.92, 0.13],
  ['forehead', 0.5, 0.48],
] as const satisfies readonly Slot[];

export function taurus(tasks: FigureTask[], region: Region) {
  // Tasks expose no merge timestamp; updatedAt is the available proxy for entry into release.
  const fourTasks = tasks.length === FOUR_TASK_SLOTS.length;
  const f = template(
    oldestFirst(tasks, (task) => task.updatedAt),
    region,
    fourTasks ? FOUR_TASK_SLOTS : TAURUS_SLOTS,
    TAURUS_OMIT,
    fourTasks
      ? [
          ['tipL', 'forehead', 'tipR'],
          ['tipL', 'muzzle', 'tipR'],
        ]
      : [
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
  if (fourTasks) {
    // Both curves follow real stars as the figure moves; the lower face stays quieter than the horns.
    for (const edge of f.edges) {
      const face = edge.a === 0 || edge.b === 0;
      edge.control = [0, face ? 0.2 : 0.24];
      if (face) edge.alpha = 0.62;
    }
  }
  return f;
}
