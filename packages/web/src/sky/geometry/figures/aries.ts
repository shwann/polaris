import { oldestFirst, template, type Slot } from './template';
import type { FigureTask, Region } from './types';

export const ARIES_SIMPLE_SLOTS = [
  ['Hamal', 0.6, 0.4],
  ['Sheratan', 0.4, 0.5],
  ['Mesarthim', 0.34, 0.65],
  ['41Ari', 0.86, 0.3],
] as const satisfies readonly Slot[];
export const ARIES_SIMPLE_OMIT = ['41Ari', 'Mesarthim', 'Sheratan'];

export const ARIES_RAM_FROM = 8;

// Every turn is occupied by a real task; extra tasks progressively complete the horns.
export const ARIES_SLOTS = [
  ['forehead', 0.5, 0.3],
  ['muzzle', 0.5, 0.88],
  ['rootL', 0.34, 0.4],
  ['rootR', 0.66, 0.4],
  ['crownL', 0.13, 0.14],
  ['crownR', 0.87, 0.14],
  ['curlL', 0.16, 0.55],
  ['curlR', 0.84, 0.55],
  ['outerL', 0.05, 0.36],
  ['outerR', 0.95, 0.36],
  ['innerL', 0.29, 0.53],
  ['innerR', 0.71, 0.53],
  ['tipL', 0.26, 0.36],
  ['tipR', 0.74, 0.36],
] as const satisfies readonly Slot[];
export const ARIES_OMIT = [
  'tipR',
  'tipL',
  'innerR',
  'innerL',
  'outerR',
  'outerL',
  'curlR',
  'curlL',
  'crownR',
  'crownL',
  'rootR',
  'rootL',
  'muzzle',
];

export function aries(tasks: FigureTask[], region: Region) {
  const sorted = oldestFirst(tasks, (task) => task.createdAt || task.updatedAt);
  if (tasks.length < ARIES_RAM_FROM)
    return template(
      sorted,
      region,
      ARIES_SIMPLE_SLOTS,
      ARIES_SIMPLE_OMIT,
      [['41Ari', 'Hamal', 'Sheratan', 'Mesarthim']],
      [
        [0.49, 0.75],
        [0.64, 0.72],
      ],
    );
  return template(
    sorted,
    region,
    ARIES_SLOTS,
    ARIES_OMIT,
    [
      ['forehead', 'rootL', 'muzzle', 'rootR', 'forehead'],
      ['rootL', 'crownL', 'outerL', 'curlL', 'innerL', 'tipL'],
      ['rootR', 'crownR', 'outerR', 'curlR', 'innerR', 'tipR'],
    ],
    [
      [0.43, 0.48],
      [0.57, 0.48],
      [0.44, 0.65],
      [0.56, 0.65],
    ],
  );
}
