import { waitingOnOf } from '@polaris/core';
import type { Point } from '../../types';
import { addEdge, connect, curve, emptyFigure, fitFigure, nearest, randomFor, timestamp } from './common';
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
export const SCORPIUS_OMIT = [
  'S',
  'T4',
  'T3',
  'T2',
  'T1',
  'L4',
  'L3',
  'L2',
  'L1',
  'LJ2',
  'LJ1',
  'UJ2',
  'UJ1',
  'C',
  'A',
  'B2',
  'B1',
  'H',
  'heart',
];

export function scorpius(tasks: FigureTask[], region: Region) {
  const f = emptyFigure();
  if (!tasks.length) return f;
  const sorted = [...tasks].sort(
    (a, b) =>
      timestamp(a.waitingSince || a.updatedAt) - timestamp(b.waitingSince || b.updatedAt) || a.id.localeCompare(b.id),
  );
  const users = sorted.filter((t) => waitingOnOf({ ...t, lane: 'waiting' }) === 'user'),
    quiet = sorted.filter((t) => waitingOnOf({ ...t, lane: 'waiting' }) !== 'user');
  const omitted = new Set(SCORPIUS_OMIT.slice(0, Math.max(0, 19 - tasks.length)));
  // Reserve four legs first; external overflow may occupy dim tail slots to preserve the full silhouette.
  const active = SCORPIUS_SLOTS.filter((s) => !omitted.has(s[0]));
  const queue = [...users],
    dark = [...quiet],
    spare: FigureTask[] = [];
  if (!queue.length && dark.length) queue.push(dark.shift()!);
  const legs = dark.splice(0, active.filter(([slot]) => /^L[1-4]$/.test(slot)).length);
  for (const [slot, x, y] of active) {
    const leg = /^L[1-4]$/.test(slot);
    const task = leg ? legs.shift() || queue.shift() || dark.shift() : queue.shift() || dark.shift();
    if (!task) continue;
    f.nodes.push({
      id: task.id,
      point: [x, y],
      slot,
      bright: !leg && waitingOnOf({ ...task, lane: 'waiting' }) === 'user',
      main: slot === 'heart',
      size: slot === 'heart' ? 1.65 : slot === 'S' ? 1.25 : 1,
    });
  }
  spare.push(...queue, ...legs, ...dark);
  // With no user waits, a quiet task still anchors the whole figure at the heart.
  if (!f.nodes.length && spare.length)
    f.nodes.push({ id: spare.shift()!.id, point: [0.42, 0.58], slot: 'heart', bright: false, main: true, size: 1.65 });
  const idx = (slot: string) => f.nodes.findIndex((n) => n.slot === slot);
  for (const path of [
    ['H', 'heart', 'B1', 'B2', 'T1', 'T2', 'T3', 'T4', 'S'],
    ['H', 'A', 'UJ1'],
    ['A', 'UJ2'],
    ['H', 'C', 'LJ1'],
    ['C', 'LJ2'],
  ])
    for (let i = 1; i < path.length; i++) {
      const a = idx(path[i - 1]!),
        b = idx(path[i]!);
      addEdge(f, a, b, !!f.nodes[a]?.bright && !!f.nodes[b]?.bright);
    }
  for (const [a, b] of [
    ['heart', 'L1'],
    ['B1', 'L2'],
    ['B2', 'L3'],
    ['B2', 'L4'],
  ])
    addEdge(f, idx(a!), idx(b!), false);
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
  const rnd = randomFor(tasks.map((t) => t.id));
  for (const task of spare) {
    // Additional external waits extend the legs; other extras sit inside the body.
    const p: Point =
      waitingOnOf({ ...task, lane: 'waiting' }) !== 'user'
        ? [0.36 + rnd() * 0.36, 0.74 + rnd() * 0.1]
        : [0.3 + rnd() * 0.4, 0.49 + rnd() * 0.18];
    const a = nearest(f.nodes, p),
      b = f.nodes.length;
    f.nodes.push({ id: task.id, point: p, slot: `extra-${b}`, bright: false });
    addEdge(f, a, b, false);
  }
  const s = idx('S'),
    t = idx('T4');
  if (s >= 0 && t >= 0)
    f.spur = { at: s, from: t, offset: curve(f.nodes[t]!.point, f.nodes[s]!.point, [0.545, 0.2375]) };
  return fitFigure(connect(f), region, [0.02, 0.14, 0.85, 0.84]);
}
