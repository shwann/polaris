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
  const sorted = oldestFirst(tasks, (task) => task.waitingSince || task.updatedAt);
  const twoPans = sorted.length === 2;
  const f = template(
    sorted,
    twoPans ? [region[0], region[1] - 0.72 * region[2], region[2]] : region,
    twoPans ? LIBRA_SLOTS.slice(1, 3) : LIBRA_SLOTS,
    LIBRA_OMIT,
    [['pivot', 'panL'], ['pivot', 'panR'], ['pivot', 'base'], ...(twoPans ? [['panL', 'panR']] : [])],
    [
      [0.5, 0.42],
      [0.5, 0.64],
      [0.35, 0.3],
      [0.65, 0.3],
    ],
  );
  // With two tasks the rims follow the beam between the real pan stars.
  const scale = 1.7 * region[2];
  f.arcs = f.nodes.flatMap((node, at) => {
    if (node.slot !== 'panL' && node.slot !== 'panR') return [];
    const from = twoPans ? 1 - at : 0;
    const [x, y] = node.point,
      rim = y + (twoPans ? 0.13 : 0.035) * scale,
      basis = (px: number, py: number) => curve(f.nodes[from]!.point, node.point, [px, py]);
    return [
      {
        from,
        at,
        start: basis(x - 0.08 * scale, rim),
        control: basis(x, rim + 0.115 * scale),
        end: basis(x + 0.08 * scale, rim),
      },
    ];
  });
  return f;
}
