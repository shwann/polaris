import { pickRelease } from './geometry/figures/aquarius';
import { clearTooltip } from './tooltip';
import { COL } from '../domain/lanes';
import { setInput, uiStore } from '../store/uiStore';
import { hitDoneLabel, zoomDone } from './draw/doneOverview';
import { pickAt } from './draw/picking';
import { constrain, rubberPoint } from './motion/bounds';
import { cameraBounds, cameraMoving, stopCamera } from './motion/cameraMotion';
import { LAUNCH_SPEED, record, velocity } from './motion/inertia';
import { draggedParticle } from './motion/constellation';
import { prepareDrag, releaseHeld } from './motion/drag';
import { stillPointer } from './motion/pause';
import type { Point, SkyState } from './types';

export function attachInput(s: SkyState) {
  const abort = new AbortController(),
    signal = abort.signal;
  const blocked = (target: EventTarget | null, wheel = false) => s.events.isBlocked?.(target, wheel) || false;
  const pick = (star: ReturnType<typeof pickAt>['star'], dip: number) => {
    clearTooltip(s);
    if (star) {
      star.flare = 1;
      s.selected = star.id;
      s.events.onPickStar?.(star.id);
    } else if (dip >= 0) s.events.onPickDipper?.(dip);
  };
  const double = (x: number, y: number) => {
    if (hitDoneLabel(s, x, y)) {
      zoomDone(s, x, y);
      return;
    }
    const release = pickRelease(s, x, y);
    if (release) {
      s.events.onPickRelease?.(release.release.version);
      return;
    }
    const hit = pickAt(s, x, y);
    if (hit.star || hit.dip >= 0) pick(hit.star, hit.dip);
    else if (zoomDone(s, x, y)) return;
    else if (s.sky) s.zoomTo(x, y, s.camT.s * 1.6);
  };
  let touchDoubleAt = -Infinity;
  let lastTap: { x: number; y: number; t: number } | null = null;
  window.addEventListener(
    'pointermove',
    (e) => {
      s.px = e.clientX;
      s.py = e.clientY;
      if (!s.drag && !cameraMoving(s) && !s.reduce.matches && !stillPointer(s)) {
        s.tx = (e.clientX / s.w - 0.5) * -1;
        s.ty = (e.clientY / s.h - 0.5) * -1;
      }
      s.onSky = !blocked(e.target);
      const d = s.drag;
      if (!d || !s.pointers.has(e.pointerId)) return;
      s.pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (d.pinch) {
        if (s.pointers.size < 2) return;
        const [a, b] = [...s.pointers.values()] as [Point, Point];
        const scale = Math.min(5, Math.max(0.5, (d.s0! * Math.hypot(a[0] - b[0], a[1] - b[1])) / d.pinch));
        s.camT.s = scale;
        const midpoint: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        [s.camT.x, s.camT.y] = constrain(
          [midpoint[0] - d.anchor![0] * scale, midpoint[1] - d.anchor![1] * scale],
          cameraBounds(s),
        );
        return;
      }
      const dx = e.clientX - d.x0,
        dy = e.clientY - d.y0;
      if (!d.moved && Math.hypot(dx, dy) >= 5 && (s.sky || d.star || (s.w > 560 && d.dip >= 0))) d.moved = true;
      if (d.moved) {
        clearTooltip(s);
        s.tooltipSettling = s.w > 560;
      }
      d.samples = record(d.samples, { x: e.clientX, y: e.clientY, t: e.timeStamp });
      if (d.moved && !draggedParticle(s, d) && (d.dip < 0 || s.w <= 560)) {
        [s.camT.x, s.camT.y] = rubberPoint([d.cx + dx, d.cy + dy], cameraBounds(s));
        // Direct manipulation must not wait for the next interpolated camera frame.
        Object.assign(s.cam, s.camT);
      }
    },
    { passive: true, signal },
  );
  const cancel = () => {
    s.drag = null;
    s.soft.pin = undefined;
    s.pointers.clear();
    stopCamera(s);
    s.px = s.py = -1e4;
    s.events.onTooltip?.('', '', 0, 0);
  };
  document.addEventListener(
    'pointerleave',
    () => {
      if (s.drag) return;
      s.px = s.py = -1e4;
      s.onSky = false;
      s.events.onTooltip?.('', '', 0, 0);
    },
    { signal },
  );
  window.addEventListener('blur', cancel, { signal });
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (blocked(e.target) || e.button > 0 || s.pointers.size >= 2) return;
      clearTooltip(s);
      stopCamera(s);
      Object.assign(s.camT, s.cam);
      s.px = e.clientX;
      s.py = e.clientY;
      s.onSky = true;
      s.pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (s.pointers.size === 2 && s.sky) {
        lastTap = null;
        const [a, b] = [...s.pointers.values()] as [Point, Point];
        s.drag = {
          x0: 0,
          y0: 0,
          cx: s.cam.x,
          cy: s.cam.y,
          star: null,
          pinch: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1,
          s0: s.cam.s,
          anchor: s.toWorld((a[0] + b[0]) / 2, (a[1] + b[1]) / 2),
          moved: true,
          samples: [],
          grab: [0, 0],
          dip: -1,
        };
      } else {
        const hit = pickAt(s, e.clientX, e.clientY);
        const [wx, wy] = s.toWorld(e.clientX, e.clientY);
        s.drag = {
          x0: e.clientX,
          y0: e.clientY,
          cx: s.cam.x,
          cy: s.cam.y,
          moved: false,
          star: pickRelease(s, e.clientX, e.clientY) ? null : hit.star,
          dip: pickRelease(s, e.clientX, e.clientY) ? -1 : hit.dip,
          grab: [0, 0],
          samples: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }],
        };
        prepareDrag(s, s.drag, wx, wy);
      }
      s.emitTooltip();
    },
    { signal },
  );
  const release = (e: PointerEvent) => {
    if (!s.pointers.delete(e.pointerId)) return;
    const d = s.drag;
    if (d?.pinch) {
      // Keep the gesture consumed until every finger lifts; never turn a pinch into a fling or click.
      if (!s.pointers.size) s.drag = null;
      return;
    }
    if (s.pointers.size) return;
    if (d?.moved && e.type !== 'pointercancel') {
      s.px = e.clientX;
      s.py = e.clientY;
      if (!draggedParticle(s, d) && (d.dip < 0 || s.w <= 560)) {
        [s.camT.x, s.camT.y] = rubberPoint([d.cx + e.clientX - d.x0, d.cy + e.clientY - d.y0], cameraBounds(s));
        Object.assign(s.cam, s.camT);
      }
    }
    if (!d) return;
    if (d.moved || e.type === 'pointercancel') lastTap = null;
    if ((d.star || (s.w > 560 && d.dip >= 0)) && d.moved) {
      releaseHeld(s, d, e);
      s.drag = null;
      return;
    }
    s.drag = null;
    if (d.moved && s.sky && !s.reduce.matches && e.type !== 'pointercancel') {
      const samples = record(d.samples, { x: e.clientX, y: e.clientY, t: e.timeStamp });
      const v = velocity(samples, e.timeStamp);
      if (Math.hypot(...v) > LAUNCH_SPEED) s.inertia = v;
    }
    if (d.moved || e.type === 'pointercancel') return;
    if (e.pointerType === 'touch') {
      if (lastTap && e.timeStamp - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 24) {
        double(e.clientX, e.clientY);
        touchDoubleAt = e.timeStamp;
        lastTap = null;
        return;
      }
      lastTap = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    }
    const release = pickRelease(s, e.clientX, e.clientY);
    if (release) {
      clearTooltip(s);
      s.events.onPickRelease?.(release.release.version);
      return;
    }
    if (hitDoneLabel(s, e.clientX, e.clientY)) {
      zoomDone(s, e.clientX, e.clientY);
      return;
    }
    if (d.star || d.dip >= 0) {
      pick(d.star, d.dip);
      return;
    }
    clearTooltip(s);
    if (zoomDone(s, e.clientX, e.clientY)) return;
    const [x, y] = s.toWorld(e.clientX, e.clientY);
    if (!s.reduce.matches) s.ripple(x, y, COL.doing, 0.8);
    if (s.selected) {
      s.selected = null;
      s.events.onPickStar?.(null);
    }
  };
  window.addEventListener('pointerup', release, { signal });
  window.addEventListener('pointercancel', release, { signal });
  window.addEventListener(
    'dblclick',
    (e) => {
      if (!blocked(e.target) && e.timeStamp - touchDoubleAt > 500) {
        e.preventDefault();
        double(e.clientX, e.clientY);
      }
    },
    { signal },
  );
  window.addEventListener(
    'wheel',
    (e) => {
      if (!s.sky || s.drag || blocked(e.target, true)) return;
      e.preventDefault();
      clearTooltip(s);
      stopCamera(s);
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? s.h : 1;
      if (
        !uiStore.getState().inputChosen &&
        !e.ctrlKey &&
        e.deltaMode === 0 &&
        (e.deltaX !== 0 || !Number.isInteger(e.deltaY))
      )
        setInput('pad', false);
      if (s.padMode && !e.ctrlKey) {
        [s.camT.x, s.camT.y] = constrain([s.camT.x - e.deltaX * k, s.camT.y - e.deltaY * k], cameraBounds(s));
        Object.assign(s.cam, s.camT);
      } else s.zoomTo(e.clientX, e.clientY, s.camT.s * Math.exp(-e.deltaY * k * (e.ctrlKey ? 0.012 : 0.0018)));
    },
    { passive: false, signal },
  );
  return () => {
    abort.abort();
    cancel();
  };
}
