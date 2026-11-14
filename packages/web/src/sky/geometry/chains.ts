import type { Task } from '../../domain/types';
import { hash } from '../palette';
import type { Point, Star } from '../types';

/** Module prefix: the letters a task code starts with (AIX2 → AIX, CASH-NEXT → CASH). */
export const codePrefix = (code: string) => /^[A-Za-z]+/.exec(code)?.[0]?.toUpperCase();

export interface Chain {
  key: string;
  /** Tooltip line: 需求 <ID> <标题> or 同组：<前缀>. */
  label: string;
}
/**
 * Which string of stars a task joins: tasks of one lane on the same requirement first (a task on several picks the
 * one most shared in its lane), otherwise tasks sharing a code prefix.
 */
export function chainsOf(tasks: Task[], reqTitles: ReadonlyMap<string, string>): Map<string, Chain> {
  const shared = new Map<string, number>();
  for (const t of tasks)
    for (const r of t.reqIds ?? []) shared.set(`${t.lane}|${r}`, (shared.get(`${t.lane}|${r}`) ?? 0) + 1);
  const out = new Map<string, Chain>();
  for (const t of tasks) {
    const count = (r: string) => shared.get(`${t.lane}|${r}`) ?? 0;
    const req = [...(t.reqIds ?? [])].sort((a, b) => count(b) - count(a) || a.localeCompare(b))[0];
    if (req) {
      const title = reqTitles.get(req);
      out.set(t.id, { key: `req:${req}`, label: `需求 ${req}${title ? ` ${title}` : ''}` });
      continue;
    }
    const prefix = codePrefix(t.code);
    if (prefix) out.set(t.id, { key: `mod:${prefix}`, label: `同组：${prefix}` });
  }
  return out;
}

/** The star's own random place in its cluster, from its id. */
export const slotOf = (id: string) => ({ ang: hash(id, 7) * 6.2832, rad: 0.25 + 0.75 * Math.sqrt(hash(id, 11)) });
const slotPoint = (s: { ang: number; rad: number }, done: boolean): Point => {
  const r = done ? s.rad ** 1.9 : s.rad;
  return [Math.cos(s.ang) * r * 1.25, Math.sin(s.ang) * r * 0.85];
};
const chainKey = (s: Star) => s.chain ?? `star:${s.id}`;

/**
 * Hands the group's slots out again so each chain takes a run of neighbouring ones: slots are walked around the
 * cluster by angle and each chain takes the next run. The set of slots is unchanged, so the cluster keeps its shape.
 */
export function assignSlots(stars: Star[], done: boolean) {
  const sorted = [...stars].sort((a, b) => a.id.localeCompare(b.id));
  const slots = sorted.map((s) => slotOf(s.id)).sort((a, b) => a.ang - b.ang || a.rad - b.rad);
  const chains = new Map<string, Star[]>();
  for (const s of sorted) (chains.get(chainKey(s)) ?? chains.set(chainKey(s), []).get(chainKey(s))!).push(s);
  // Within a run, stars go inside-out along the radius so the string reads as a short path, not a zigzag.
  let next = 0;
  for (const [, members] of [...chains.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const run = slots.slice(next, next + members.length).sort((a, b) => slotRadius(a, done) - slotRadius(b, done));
    next += members.length;
    members.forEach((s, k) => Object.assign(s, run[k]!));
  }
}
const slotRadius = (s: { ang: number; rad: number }, done: boolean) => Math.hypot(...slotPoint(s, done));

/** One open string through each chain's stars (nearest neighbour from its outermost end); chains are not joined. */
export function chainEdges(stars: Star[], at: (s: Star) => Point): [Star, Star][] {
  const chains = new Map<string, Star[]>();
  for (const s of stars) if (s.chain) (chains.get(s.chain) ?? chains.set(s.chain, []).get(s.chain)!).push(s);
  const edges: [Star, Star][] = [];
  for (const members of chains.values()) {
    if (members.length < 2) continue;
    members.sort((a, b) => a.id.localeCompare(b.id));
    const pts = new Map(members.map((s) => [s, at(s)] as const)),
      cx = members.reduce((a, s) => a + pts.get(s)![0], 0) / members.length,
      cy = members.reduce((a, s) => a + pts.get(s)![1], 0) / members.length;
    const d = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    let cur = members.reduce((best, s) => (d(pts.get(s)!, [cx, cy]) > d(pts.get(best)!, [cx, cy]) + 1e-9 ? s : best));
    const left = new Set(members.filter((s) => s !== cur));
    while (left.size) {
      let next: Star | null = null;
      for (const s of left)
        if (!next || d(pts.get(s)!, pts.get(cur)!) < d(pts.get(next)!, pts.get(cur)!) - 1e-9) next = s;
      edges.push([cur, next!]);
      left.delete(next!);
      cur = next!;
    }
  }
  return edges;
}
