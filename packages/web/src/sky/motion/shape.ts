import type { Particle } from './softbody';

// Recovery starts after the visible launch, leaving the held chain free to follow the hand.
export const SHAPE_FORCE = 65;
export const RECOVERY_DELAY = 0.18;
export const RECOVERY_RAMP = 0.12;
export const RECOVERY_HOME = 100;
export const RECOVERY_DAMPING = 16;
export const RECOVERY_DURATION = 1.5;

/** Best rigid fit: preserve the current centroid and average rotation without shrinking the tree. */
export function shapeTargets(group: Particle[]) {
  const mean = (f: (p: Particle) => number) => group.reduce((sum, p) => sum + f(p), 0) / group.length;
  const hx = mean((p) => p.baseX!),
    hy = mean((p) => p.baseY!),
    cx = mean((p) => p.baseX! + p.ox),
    cy = mean((p) => p.baseY! + p.oy);
  let dot = 0,
    cross = 0;
  for (const p of group) {
    const x = p.baseX! - hx,
      y = p.baseY! - hy,
      dx = p.baseX! + p.ox - cx,
      dy = p.baseY! + p.oy - cy;
    dot += x * dx + y * dy;
    cross += x * dy - y * dx;
  }
  const angle = Math.atan2(cross, dot),
    c = Math.cos(angle),
    s = Math.sin(angle);
  return group.map((p) => {
    const x = p.baseX! - hx,
      y = p.baseY! - hy;
    return [cx + x * c - y * s - p.baseX!, cy + x * s + y * c - p.baseY!] as const;
  });
}

export const ORDER_GAP = 0.0005;
export const ORDER_ITERATIONS = 32;
/** Remove a tiny angular inversion already introduced by the last interpolated pin pose. The root stays fixed. */
export function repairOrder(group: Particle[], root: Particle) {
  const angle = (p: Particle, home: boolean) =>
    Math.atan2(
      p.baseY! - root.baseY! + (home ? 0 : p.oy - root.oy),
      p.baseX! - root.baseX! + (home ? 0 : p.ox - root.ox),
    );
  const sorted = group.filter((p) => p !== root).sort((a, b) => angle(a, true) - angle(b, true));
  if (sorted.length < 3) return;
  // Coincident home rays have no unique cyclic order (for example a rectangular grid).
  if (
    sorted.some((p, i) => {
      const next = sorted[(i + 1) % sorted.length]!;
      return (
        Math.abs(
          Math.atan2(Math.sin(angle(next, true) - angle(p, true)), Math.cos(angle(next, true) - angle(p, true))),
        ) < ORDER_GAP
      );
    })
  )
    return;
  const tau = Math.PI * 2;
  let cut = 0,
    gap = 0;
  sorted.forEach((p, i) => {
    const next = (i + 1) % sorted.length,
      distance = (angle(sorted[next]!, true) - angle(p, true) + tau) % tau;
    if (distance > gap) {
      gap = distance;
      cut = next;
    }
  });
  const list = [...sorted.slice(cut), ...sorted.slice(0, cut)];
  const start = angle(list[0]!, true);
  const angles = list.map((p) => {
    const reference = start + ((angle(p, true) - start + tau) % tau);
    const a = angle(p, false);
    return a + Math.round((reference - a) / tau) * tau;
  });
  for (let pass = 0; pass < ORDER_ITERATIONS; pass++)
    for (let i = 0; i < angles.length - 1; i++) {
      const overlap = angles[i]! + ORDER_GAP - angles[i + 1]!;
      if (overlap > 0) {
        angles[i]! -= overlap / 2;
        angles[i + 1]! += overlap / 2;
      }
    }
  list.forEach((p, i) => {
    const radius = Math.hypot(p.baseX! + p.ox - root.baseX! - root.ox, p.baseY! + p.oy - root.baseY! - root.oy);
    p.ox = root.baseX! + root.ox + Math.cos(angles[i]!) * radius - p.baseX!;
    p.oy = root.baseY! + root.oy + Math.sin(angles[i]!) * radius - p.baseY!;
  });
}
