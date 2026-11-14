/** The continuous rotation rate of Pisces and Sagittarius at overview zoom, in radians per second. */
export const OVERVIEW_SPIN_SPEED = 0.012;

/** A sine swing reaches the overview rotation speed as it passes through its resting angle. */
export const swingPeriod = (degrees: number) => (degrees * Math.PI ** 2 * 1000) / (90 * OVERVIEW_SPIN_SPEED);
