/**
 * Draws a reel plan one frame at a time with the map's renderer. The frame
 * shown is a function of `performance.now()` since the page started, read in
 * `requestAnimationFrame`, so a capture that drives both from a virtual clock
 * gets every frame exactly once and identically each run.
 */

import type { Pt, Rgb, ViewportCut } from '../../core';
import type { MapCamera } from '../map/camera';
import type { MapRenderer, TrailGeometry } from '../map/rendererTypes';
import { LIGHT_LINE_COLOR } from '../map/webglRenderer';
import type { ReelCircuit } from './circuits';
import { cameraAt, frameTime, stepsAt, type ReelPlan, type ReelWorld, type Trace } from './director';

/** Frames a lit circuit takes to go from white to its colour. */
const LIGHT_FRAMES = 8;
/** World units of tiling kept around the view when picking tiles to draw. */
const CULL_PAD = 4;
const CELL = 8;

export function geometry(points: readonly Pt[], origin: Pt, closed: boolean, color?: Rgb, version = 0): TrailGeometry {
  const n = points.length + (closed ? 1 : 0);
  const xy = new Float32Array(2 * n);
  const arc = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = points[i % points.length];
    xy[2 * i] = p.x - origin.x;
    xy[2 * i + 1] = p.y - origin.y;
    if (i > 0) arc[i] = arc[i - 1] + Math.hypot(xy[2 * i] - xy[2 * i - 2], xy[2 * i + 1] - xy[2 * i - 1]);
  }
  return {
    origin,
    xy,
    arc,
    pointCount: n,
    totalLength: arc[n - 1],
    version,
    color: color ? [color[0] / 255, color[1] / 255, color[2] / 255] : undefined,
  };
}

/** The part of a trace drawn by `steps` (fractional: the head is part way along its step). */
function partialTrace(tr: Trace, steps: number, origin: Pt): TrailGeometry | null {
  const n = tr.points.length;
  if (steps <= 0) return null;
  const whole = Math.floor(steps);
  const pts = tr.points.slice(0, Math.min(whole, n) + 1);
  if (whole < n) {
    const a = tr.points[whole];
    const b = tr.points[(whole + 1) % n];
    const u = steps - whole;
    pts.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  } else {
    pts.push(tr.points[0]);
  }
  return geometry(pts, origin, false, undefined, Math.round(steps * 1000));
}

export interface ReelStage {
  draw(frame: number): void;
}

export function createReelStage(
  renderer: MapRenderer,
  plan: ReelPlan,
  world: ReelWorld,
  dpr: number,
  lineScale: number,
): ReelStage {
  const o = plan.options;
  const { cut } = world;
  renderer.setChords(world.table);

  const visibleCut = cutCuller(cut);

  const solid = new Map<number, TrailGeometry>();
  const litGeometry = (c: ReelCircuit, color: Rgb, age: number): TrailGeometry => {
    if (age >= LIGHT_FRAMES) {
      let g = solid.get(c.id);
      if (!g) {
        g = geometry(c.points, cut.origin, true, color);
        solid.set(c.id, g);
      }
      return g;
    }
    const u = (age + 1) / (LIGHT_FRAMES + 1);
    const mixed: Rgb = [255 + (color[0] - 255) * u, 255 + (color[1] - 255) * u, 255 + (color[2] - 255) * u];
    return geometry(c.points, cut.origin, true, mixed, age + 1);
  };

  return {
    draw(frame) {
      const cam = cameraAt(plan, frame);
      const t = frameTime(frame, o.fps);
      const hw = o.width / 2 / cam.scale;
      const hh = o.height / 2 / cam.scale;
      renderer.setCut(visibleCut(cam, o.width, o.height));
      // Lines thin out as the camera pulls back, so a wide view stays a
      // drawing rather than a carpet of ink.
      const zoom = Math.min(1, Math.max(0.2, (cam.scale / o.scale) ** 0.7));
      renderer.setStyle({ showFills: false, showOutlines: false, lineColor: LIGHT_LINE_COLOR, lineScale: lineScale * zoom });

      const lit: TrailGeometry[] = [];
      for (const c of world.circuits) {
        const on = plan.lit.get(c.id);
        if (!on || on.frame > frame) continue;
        if (c.max.x < cam.cx - hw || c.min.x > cam.cx + hw || c.max.y < cam.cy - hh || c.min.y > cam.cy + hh) continue;
        lit.push(litGeometry(c, on.color, frame - on.frame));
      }
      renderer.setCircuits(lit);
      const live = plan.traces.find((tr) => t > tr.start && t < tr.close);
      renderer.setTrail(live ? partialTrace(live, stepsAt(live, t), cut.origin) : null);
      renderer.render(cam, o.width, o.height, dpr);
    },
  };
}

/** The cut's tiles near a view, found by grid cell, so a frame hands the renderer only what it can see. */
export function cutCuller(cut: ViewportCut): (cam: MapCamera, width: number, height: number) => ViewportCut {
  const cells = new Map<string, number[]>();
  for (let i = 0; i < cut.count; i++) {
    const key = `${Math.floor((cut.pos[2 * i] + cut.origin.x) / CELL)},${Math.floor((cut.pos[2 * i + 1] + cut.origin.y) / CELL)}`;
    const list = cells.get(key);
    if (list) list.push(i);
    else cells.set(key, [i]);
  }
  return (cam, width, height) => {
    const hw = width / 2 / cam.scale + CULL_PAD;
    const hh = height / 2 / cam.scale + CULL_PAD;
    const picked: number[] = [];
    for (let gx = Math.floor((cam.cx - hw) / CELL); gx <= Math.floor((cam.cx + hw) / CELL); gx++) {
      for (let gy = Math.floor((cam.cy - hh) / CELL); gy <= Math.floor((cam.cy + hh) / CELL); gy++) {
        const list = cells.get(`${gx},${gy}`);
        if (list) for (const i of list) picked.push(i);
      }
    }
    picked.sort((a, b) => a - b);
    const pos = new Float32Array(2 * picked.length);
    const code = new Uint8Array(picked.length);
    const type = new Uint8Array(picked.length);
    picked.forEach((i, j) => {
      pos[2 * j] = cut.pos[2 * i];
      pos[2 * j + 1] = cut.pos[2 * i + 1];
      code[j] = cut.code[i];
      type[j] = cut.type[i];
    });
    return { ...cut, count: picked.length, pos, code, type, ids: undefined, exact: undefined };
  };
}
