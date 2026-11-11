// First overshoot at 421ms, 12% amplitude; 2% settling at about 650ms.
export const RETURN_OMEGA = 9;
export const RETURN_DAMPING = 0.56;

/** Exact solution of a unit-mass damped spring. Time is in ms, velocity in units/s. */
export function spring(
  x: number,
  v: number,
  target: number,
  dt: number,
  omega = RETURN_OMEGA,
  damping = RETURN_DAMPING,
) {
  const t = Math.max(0, dt) / 1000,
    y = x - target,
    a = omega * damping;
  const decay = Math.exp(-a * t);
  if (damping > 1) {
    const w = omega * Math.sqrt(damping * damping - 1),
      r1 = -a + w,
      r2 = -a - w;
    const c1 = (v - r2 * y) / (r1 - r2),
      c2 = y - c1;
    return {
      x: target + c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t),
      v: c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t),
    };
  }
  if (damping === 1) {
    const b = v + omega * y;
    return { x: target + (y + b * t) * decay, v: (v - omega * b * t) * decay };
  }
  const w = omega * Math.sqrt(1 - damping * damping),
    b = (v + a * y) / w;
  const cos = Math.cos(w * t),
    sin = Math.sin(w * t);
  return {
    x: target + decay * (y * cos + b * sin),
    v: decay * (v * cos - (a * b + w * y) * sin),
  };
}
