import type { Point } from '../../types';
import { addEdge, emptyFigure, fitFigure, nearest, randomFor } from './common';
import type { FigureTask, Region } from './types';

export type Slot = readonly [string, number, number];

/** Unknown dates follow dated tasks; equal dates use IDs so input order cannot change the layout. */
export function oldestFirst(tasks: FigureTask[], date: (task: FigureTask) => string | undefined) {
  const time = (task: FigureTask) => {
    const value = Date.parse(date(task) ?? '');
    return Number.isFinite(value) ? value : Infinity;
  };
  return [...tasks].sort((a, b) => time(a) - time(b) || a.id.localeCompare(b.id));
}

/** Filling and omission are independent: surviving slots keep their original coordinates. */
export function template(
  tasks: FigureTask[],
  region: Region,
  slots: readonly Slot[],
  omit: readonly string[],
  paths: string[][],
  extras: readonly Point[],
) {
  const f = emptyFigure(),
    missing = new Set(omit.slice(0, Math.max(0, slots.length - tasks.length))),
    active = slots.filter(([name]) => !missing.has(name)),
    rnd = randomFor(tasks.map((task) => task.id));
  tasks.forEach((task, i) => {
    const slot = active[i],
      extra = i - active.length,
      seed = extras[extra % extras.length]!,
      point: Point = slot
        ? [slot[1], slot[2]]
        : extra < extras.length
          ? [...seed]
          : [seed[0] + (rnd() - 0.5) * 0.12, seed[1] + (rnd() - 0.5) * 0.12];
    f.nodes.push({
      id: task.id,
      point,
      slot: slot?.[0] ?? `extra-${extra}`,
      bright: !!slot,
      main: i === 0,
      size: i === 0 ? 1.65 : 1,
    });
  });
  for (const path of paths) {
    const indices = path.map((name) => f.nodes.findIndex((node) => node.slot === name)).filter((i) => i >= 0);
    for (let i = 1; i < indices.length; i++) addEdge(f, indices[i - 1]!, indices[i]!, true);
  }
  for (let i = active.length; i < f.nodes.length; i++) addEdge(f, nearest(f.nodes, f.nodes[i]!.point, i), i, false);
  if (f.nodes.length === 1) f.nodes[0]!.point = [region[0], region[1]];
  else fitFigure(f, region, [0, 0, 1, 1]);
  return f;
}
