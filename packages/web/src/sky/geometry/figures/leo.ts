import { oldestFirst, template, type Slot } from './template';
import type { FigureTask, Region } from './types';

export const LEO_SLOTS = [
  ['Regulus', 0.3, 0.64],
  ['Algieba', 0.34, 0.38],
  ['Zosma', 0.7, 0.4],
  ['Denebola', 0.92, 0.54],
  ['Chertan', 0.7, 0.58],
  ['eta', 0.28, 0.5],
  ['zeta', 0.3, 0.25],
  ['mu', 0.2, 0.17],
  ['eps', 0.12, 0.26],
] as const satisfies readonly Slot[];
export const LEO_OMIT = ['eps', 'mu', 'zeta', 'eta', 'Chertan', 'Denebola', 'Zosma', 'Algieba'];

export function leo(tasks: FigureTask[], region: Region) {
  // Tasks expose no merge timestamp; updatedAt is the available proxy for entry into release.
  return template(
    oldestFirst(tasks, (task) => task.updatedAt),
    region,
    LEO_SLOTS,
    LEO_OMIT,
    [
      ['Regulus', 'eta', 'Algieba', 'zeta', 'mu', 'eps'],
      ['Algieba', 'Zosma', 'Denebola', 'Chertan', 'Regulus'],
    ],
    [
      [0.5, 0.72],
      [0.62, 0.78],
      [0.8, 0.72],
    ],
  );
}
