import type { Release } from '@polaris/core';
import type { Point } from '../../types';
import { aquariusFrame, aquariusPoint, chronological } from './aquariusJar';

export type AquariusStyle = 'jar' | 'drops';
type Item = NonNullable<Release['items']>[number];

export interface DropNode {
  id: string;
  point: Point;
  slot: string;
  bright: boolean;
  item: Item;
  release: Release;
}
export interface DropsShape {
  /** Per chronological release: its delivered-item node indices in outline order (the tip is the release star). */
  members: number[][];
  /** Per release: the node farthest down its drop, where the chain leaves for the next older release. */
  far: (number | null)[];
  /** Per release: unit vector away from the arc's centre, used for its version caption. */
  normal: Point[];
  /** Oldest releases drawn as bare stars at the arc's tail because no drop fits there. */
  folded: number;
  foldedItems: number;
  caption: { point: Point; align: 'left' | 'right' };
  note?: Point;
}
export interface DropsLayout extends DropsShape {
  stars: { release: Release; point: Point; radius: number; alpha: number }[];
  nodes: DropNode[];
  edges: { a: number; b: number; bright: boolean }[];
}

/** Most drops the arc carries before older releases fold into its tail. */
export const MAX_DROPS = 12;
/** The pour arc in Aquarius frame units, from beside Dubhe round to the lower edge. */
const ARC: Point[] = [
  [0.125, -0.41],
  [0.653, -0.483],
  [1.006, -0.025],
  [0.926, 1.133],
];

const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Point, k: number): Point => [a[0] * k, a[1] * k];
const norm = (a: Point): Point => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
const perp = (a: Point): Point => [-a[1], a[0]];

function arc(w: number, h: number) {
  const P = ARC.map((p) => aquariusPoint(p, w, h)),
    N = 240,
    pts: Point[] = [],
    lengths = [0];
  for (let i = 0; i <= N; i++) {
    const t = i / N,
      u = 1 - t;
    pts.push(
      [0, 1].map(
        (k) => u * u * u * P[0]![k]! + 3 * u * u * t * P[1]![k]! + 3 * u * t * t * P[2]![k]! + t * t * t * P[3]![k]!,
      ) as Point,
    );
    if (i) lengths.push(lengths[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  }
  const total = lengths[N]!;
  const at = (s: number): Point => {
    s = Math.max(0, Math.min(total, s));
    const i = Math.max(
        1,
        lengths.findIndex((l) => l >= s),
      ),
      a = pts[i - 1]!,
      b = pts[i]!,
      k = (s - lengths[i - 1]!) / (lengths[i]! - lengths[i - 1]! || 1);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
  const tangent = (s: number) => {
    const a = at(Math.max(0, s - 3)),
      b = at(Math.min(total, s + 3));
    return norm([b[0] - a[0], b[1] - a[1]]);
  };
  return { total, at, tangent };
}

const sortedItems = (release: Release) =>
  [...(release.items ?? [])].sort(
    (a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }) || a.id.localeCompare(b.id),
  );

/**
 * Each release is a drop: the release star is the tip and its delivered items are the drop's corners, so every corner is
 * real data. Drops hang along an arc poured from Dubhe, newest nearest the Dipper; a release with one item is a star with
 * a tail and one with none is a lone star.
 */
export function aquariusDrops(releases: Release[], w: number, h: number): DropsLayout {
  const chrono = chronological(releases),
    n = chrono.length,
    newest = [...chrono].reverse(),
    frame = aquariusFrame(w, h),
    k = Math.max(0.6, Math.min(1.5, frame.w / 352)),
    g = arc(w, h),
    dropLen = (m: number) => (m ? (13 + 8 * Math.sqrt(m)) * k : 0),
    foldGap = 7 * k;
  const need = (keep: number) =>
    newest.slice(0, keep).reduce((sum, r) => sum + dropLen(r.items?.length ?? 0) + 12 * k, 0) +
    (n > keep ? 14 * k + (n - keep) * foldGap : 0);
  let keep = Math.min(MAX_DROPS, n);
  while (keep > 1 && need(keep) > g.total) keep--;
  const sumL = newest.slice(0, keep).reduce((sum, r) => sum + dropLen(r.items?.length ?? 0), 0),
    foldLen = n > keep ? 14 * k + (n - keep) * foldGap : 0,
    gap = Math.max(12 * k, Math.min(30 * k, (g.total - sumL - foldLen) / Math.max(1, keep)));

  const stars: DropsLayout['stars'] = new Array(n),
    nodes: DropNode[] = [],
    edges: DropsLayout['edges'] = [],
    members: number[][] = Array.from({ length: n }, () => []),
    far: (number | null)[] = new Array(n).fill(null),
    normal: Point[] = new Array(n).fill([0, -1]);
  const look = (index: number) => {
    const progress = n === 1 ? 1 : index / (n - 1);
    return { radius: index === n - 1 ? 4.6 : 2.1 + progress * 1.3, alpha: 0.38 + progress * 0.62 };
  };
  let s = 0,
    end: Point = g.at(0),
    foldedItems = 0;
  newest.forEach((release, rank) => {
    const index = n - 1 - rank;
    if (rank >= keep) {
      const point = g.at(s + (rank === keep ? 6 * k : foldGap));
      s += rank === keep ? 6 * k : foldGap;
      stars[index] = { release, point, radius: 1.5, alpha: 0.45 };
      normal[index] = mul(perp(g.tangent(s)), -1);
      foldedItems += release.items?.length ?? 0;
      end = point;
      return;
    }
    const items = sortedItems(release),
      m = items.length,
      L = dropLen(m),
      tip = g.at(s),
      // Drops hang between the arc's direction and gravity, so they read as falling water rather than arrows.
      u = norm(add(mul(g.tangent(s + L / 2), 0.45), [0, 0.55])),
      v = perp(u),
      R = (m >= 3 ? 0.62 : 0.36) * L,
      // From three items on, corners sit on the belly only, leaving a clean taper up to the release star.
      th0 = m >= 3 ? 0.75 : 0;
    stars[index] = { release, point: tip, ...look(index) };
    normal[index] = mul(perp(g.tangent(s)), -1);
    let farthest = -1,
      reach = -Infinity;
    items.forEach((item, j) => {
      const th = th0 + ((2 * Math.PI - 2 * th0) * (j + 0.5)) / m,
        along = (L * (1 - Math.cos(th))) / 2,
        side = R * Math.sin(th) * Math.sin(th / 2) * 1.25;
      const id = nodes.length;
      nodes.push({
        id: item.id,
        point: add(tip, add(mul(u, along), mul(v, side))),
        slot: `drop-${index}-${j}`,
        bright: true,
        item,
        release,
      });
      members[index]!.push(id);
      if (j) edges.push({ a: id - 1, b: id, bright: false });
      if (along > reach) [reach, farthest] = [along, id];
    });
    far[index] = farthest >= 0 ? farthest : null;
    end = farthest >= 0 ? nodes[farthest]!.point : tip;
    s += L + gap;
  });
  const folded = n - keep;
  const caption: DropsShape['caption'] =
    n <= 3
      ? { point: aquariusPoint([0.239, -0.208], w, h), align: 'left' }
      : { point: [end[0] - 4 * k, Math.min(h - 8, end[1] + 26 * k)], align: 'right' };
  return {
    stars,
    nodes,
    edges,
    members,
    far,
    normal,
    folded,
    foldedItems,
    caption,
    note: folded ? add(end, [-14 * k, 4 * k]) : undefined,
  };
}
