import type { Color, SkyState } from './types';
export const rgba = (c: Color, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
export const hash = (str: string, salt: number) => {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};
export function makeHalo() {
  const halo = document.createElement('canvas');
  halo.width = halo.height = 64;
  const g = halo.getContext('2d')!;
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(255,255,255,.9)');
  rg.addColorStop(0.2, 'rgba(255,255,255,.3)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 64, 64);
  return halo;
}
export function tint(s: SkyState, c: Color) {
  const k = c.join(',');
  let canvas = s.tints.get(k);
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d')!;
  g.drawImage(s.halo, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = `rgb(${k})`;
  g.fillRect(0, 0, 64, 64);
  s.tints.set(k, canvas);
  return canvas;
}
