import { curve } from './common';
import { oldestFirst, template, type Slot } from './template';
import type { FigureTask, Region } from './types';

export const LIBRA_SLOTS = [
  ['pivot', 0.5, 0.18],
  ['panL', 0.2, 0.42],
  ['panR', 0.8, 0.42],
  ['base', 0.5, 0.86],
] as const satisfies readonly Slot[];
export const LIBRA_OMIT = ['base', 'panR', 'panL'];

export function libra(tasks: FigureTask[], region: Region) {
  const f = template(
    oldestFirst(tasks, (task) => task.waitingSince || task.updatedAt),
    region,
    LIBRA_SLOTS,
    LIBRA_OMIT,
    [
      ['pivot', 'panL'],
      ['pivot', 'panR'],
      ['pivot', 'base'],
    ],
    [
      [0.5, 0.42],
      [0.5, 0.64],
      [0.35, 0.3],
      [0.65, 0.3],
    ],
  );
  const pivot = f.nodes[0];
  if (!pivot) return f;
  // Pan rims are decorative curves, never extra tasks. Their basis follows the live pivot and pan.
  const scale = 1.7 * region[2];
  f.arcs = f.nodes.flatMap((node, at) => {
    if (node.slot !== 'panL' && node.slot !== 'panR') return [];
    const [x, y] = node.point,
      basis = (px: number, py: number) => curve(pivot.point, node.point, [px, py]);
    return [
      {
        from: 0,
        at,
        start: basis(x - 0.08 * scale, y + 0.035 * scale),
        control: basis(x, y + 0.15 * scale),
        end: basis(x + 0.08 * scale, y + 0.035 * scale),
      },
    ];
  });
  return f;
}
