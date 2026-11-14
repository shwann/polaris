import { waitingOnOf } from '@polaris/core';
import type { Point } from '../../types';
import { addEdge, connect, curve, emptyFigure, fitFigure, nearest, timestamp } from './common';
import type { FigureTask, Region } from './types';

export const SCORPIUS_SLOTS = [
  ['heart', 0.42, 0.58],
  ['H', 0.31, 0.56],
  ['B1', 0.53, 0.6],
  ['B2', 0.64, 0.6],
  ['A', 0.18, 0.42],
  ['C', 0.18, 0.7],
  ['UJ1', 0.05, 0.33],
  ['UJ2', 0.09, 0.47],
  ['LJ1', 0.05, 0.62],
  ['LJ2', 0.1, 0.78],
  ['T1', 0.75, 0.52],
  ['T2', 0.81, 0.39],
  ['T3', 0.79, 0.26],
  ['T4', 0.7, 0.16],
  ['S', 0.57, 0.2],
  ['L1', 0.4, 0.8],
  ['L2', 0.5, 0.82],
  ['L3', 0.6, 0.81],
  ['L4', 0.7, 0.76],
] as const;
// Preserve the raised tail hook and both claws before removing intermediate body stars.
export const SCORPIUS_OMIT = [
  'S',
  'B2',
  'B1',
  'H',
  'T4',
  'T3',
  'T2',
  'T1',
  'LJ2',
  'LJ1',
  'UJ2',
  'UJ1',
  'C',
  'A',
  'heart',
];
export const SCORPIUS_BOUNDS = [0.02, 0.14, 0.85, 0.94] as const;

export function scorpius(tasks: FigureTask[], region: Region) {
  const f = emptyFigure();
  if (!tasks.length) return f;
  const sorted = [...tasks].sort(
    (a, b) =>
      timestamp(a.waitingSince || a.updatedAt) - timestamp(b.waitingSince || b.updatedAt) || a.id.localeCompare(b.id),
  );
  const users = sorted.filter((t) => waitingOnOf({ ...t, lane: 'waiting' }) === 'user'),
    quiet = sorted.filter((t) => waitingOnOf({ ...t, lane: 'waiting' }) !== 'user');
  // Only user waits occupy the fifteen skeleton slots. External waits never fill the tail.
  const omitted = new Set(SCORPIUS_OMIT.slice(0, Math.max(0, 15 - users.length)));
  const queue = [...users],
    dark = [...quiet];
  for (const [slot, x, y] of SCORPIUS_SLOTS.slice(0, 15)) {
    if (omitted.has(slot)) continue;
    const task = queue.shift();
    if (task)
      f.nodes.push({
        id: task.id,
        point: [x, y],
        slot,
        bright: true,
        main: slot === 'heart',
        size: slot === 'heart' ? 1.65 : 1,
      });
  }
  // External-only groups still need one dim anchor; no external task becomes a bright skeleton star.
  if (!f.nodes.length && dark.length)
    f.nodes.push({
      id: dark.shift()!.id,
      point: [0.42, 0.58],
      slot: 'external-heart',
      bright: false,
      main: true,
      size: 1.65,
    });
  const skeleton = f.nodes.length;
  for (const [slot, x, y] of SCORPIUS_SLOTS.slice(15)) {
    const task = dark.shift();
    if (task) f.nodes.push({ id: task.id, point: [x, y], slot, bright: false });
  }
  const idx = (slot: string) => f.nodes.findIndex((n) => n.slot === slot);
  for (const path of [
    ['H', 'heart', 'B1', 'B2', 'T1', 'T2', 'T3', 'T4', 'S'],
    ['heart', 'H', 'A', 'UJ1'],
    ['A', 'UJ2'],
    ['heart', 'H', 'C', 'LJ1'],
    ['C', 'LJ2'],
  ].map((path) => path.filter((slot) => idx(slot) >= 0)))
    for (let i = 1; i < path.length; i++) {
      const a = idx(path[i - 1]!),
        b = idx(path[i]!);
      addEdge(f, a, b, !!f.nodes[a]?.bright && !!f.nodes[b]?.bright);
    }
  for (let i = skeleton; i < f.nodes.length; i++) {
    addEdge(f, nearest(f.nodes, f.nodes[i]!.point, skeleton), i, false);
  }
  for (const [a, b] of [
    ['UJ1', 'UJ2'],
    ['LJ1', 'LJ2'],
  ]) {
    const i = idx(a!),
      j = idx(b!);
    if (i >= 0 && j >= 0) {
      const p = f.nodes[i]!.point,
        q = f.nodes[j]!.point;
      addEdge(f, i, j, false, { alpha: 0.45, control: curve(p, q, [p[0] - 0.045, (p[1] + q[1]) / 2]) });
    }
  }
  for (const [i, task] of [...dark, ...queue].entries()) {
    // Evenly spaced dim satellites stay below the body or beside the claw arms.
    const external = waitingOnOf({ ...task, lane: 'waiting' }) !== 'user';
    const p: Point = external
      ? [0.2 + (i % 7) * 0.09, 0.88 + Math.floor(i / 7) * 0.045]
      : [0.32 + (i % 5) * 0.065, 0.52 + Math.floor(i / 5) * 0.025];
    const a = nearest(f.nodes, p, skeleton),
      b = f.nodes.length;
    f.nodes.push({ id: task.id, point: p, slot: `extra-${b}`, bright: false });
    addEdge(f, a, b, false);
  }
  const tail = ['T1', 'T2', 'T3', 'T4', 'S'].map(idx).filter((i) => i >= 0);
  if (tail.length) {
    const at = tail.at(-1)!,
      from = tail.at(-2) ?? idx('heart'),
      p = f.nodes[at]!.point;
    // The sting is a short stroke on the last surviving joint, never another task star.
    f.spur = { at, from, offset: curve(f.nodes[from]!.point, p, [p[0] - 0.025, p[1] + 0.0375]) };
  }
  return fitFigure(connect(f), region, [...SCORPIUS_BOUNDS]);
}
