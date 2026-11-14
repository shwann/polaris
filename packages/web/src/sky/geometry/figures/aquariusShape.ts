import type { Point } from '../../types';

// Approved v2 silhouette, in the original upright unit box.
export const URN: Point[] = [
  [0.34, 0.02],
  [0.66, 0.02],
  [0.62, 0.07],
  [0.58, 0.1],
  [0.58, 0.2],
  [0.7, 0.26],
  [0.82, 0.36],
  [0.88, 0.5],
  [0.86, 0.64],
  [0.78, 0.76],
  [0.64, 0.84],
  [0.58, 0.88],
  [0.62, 0.96],
  [0.38, 0.96],
  [0.42, 0.88],
  [0.36, 0.84],
  [0.22, 0.76],
  [0.14, 0.64],
  [0.12, 0.5],
  [0.18, 0.36],
  [0.3, 0.26],
  [0.42, 0.2],
  [0.42, 0.1],
  [0.38, 0.07],
];
export function urnShape(w: number, h: number) {
  const tall = h > w * 1.15;
  const scale = Math.min(w * (tall ? 0.14 : 0.11), h * (tall ? 0.2 : 0.176)) / 250;
  const cx = w * (tall ? 0.515 : 0.81),
    cy = h * (tall ? 0.787 : 0.676);
  const transform = ([x, y]: Point): Point => {
    const dx = (x - 0.5) * 200 * scale,
      dy = (y - 0.5) * 250 * scale;
    return [cx + dx * Math.cos(0.62) - dy * Math.sin(0.62), cy + dx * Math.sin(0.62) + dy * Math.cos(0.62)];
  };
  const lip = transform([0.5, 0.02]);
  const waves = [-7, 9].map((offset) =>
    Array.from({ length: 61 }, (_, i): Point => {
      const u = i / 60,
        z = Math.sin(u * Math.PI * 5) * 14 + offset;
      return [lip[0] + (20 + u * 210 + 0.69 * z) * scale, lip[1] + (10 + u * 200 - 0.72 * z) * scale];
    }),
  );
  const end = waves[0]![60]!;
  return {
    scale,
    transform,
    lip,
    waves,
    rim: URN.map(transform),
    surface: [end[0] + 8 * scale, end[1] + 16 * scale] as Point,
    rings: [
      [
        [0.2, 0.4],
        [0.5, 0.44],
        [0.8, 0.4],
      ],
      [
        [0.16, 0.62],
        [0.5, 0.66],
        [0.84, 0.62],
      ],
      [
        [0.42, 0.14],
        [0.5, 0.18],
        [0.58, 0.14],
      ],
    ].map((curve) => curve.map((p) => transform(p as Point))),
    handles: [
      [
        [0.42, 0.12],
        [0.18, 0.1],
        [0.2, 0.34],
      ],
      [
        [0.58, 0.12],
        [0.82, 0.1],
        [0.8, 0.34],
      ],
    ].map((curve) => curve.map((p) => transform(p as Point))),
  };
}
