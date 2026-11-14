/**
 * The reel's script: which circuits get traced, when, and where the camera
 * looks, as a pure function of the options. Nothing here reads a clock; the
 * page asks for the state at a frame number.
 *
 * Sequence: trace a circuit, speeding up as it goes, so that it closes on a
 * bar line of the soundtrack's tempo. Two beats later every other circuit
 * congruent to it lights up at once. Types go smallest first; of the next
 * type, the trace takes the copy nearest where the last one finished and
 * starts on its nearest segment. A trace's bars grow with the square root of
 * its length, so a short reel and a long one share the same pace and the
 * long one just carries on to bigger circuits. After every second close the
 * camera pulls back to show the pattern. After the last close it pulls back
 * over the cut and holds.
 *
 * Every circuit of a traced type is lit, so a trace never runs over a circuit
 * already lit. Types with no copy the camera can frame inside the cut are
 * passed over.
 */

import {
  circuitHueRgb,
  comboToMatchingIndices,
  leafOrder,
  unrootedEngineFor,
  type Pt,
  type Rgb,
  type TileFamilyId,
  type ViewportCut,
} from '../../core';
import { parseTileId, sharedLevel } from '../map/ancestry';
import type { MapCamera } from '../map/camera';
import { buildLeafChordTable, type LeafChordTable } from '../map/chords';
import { findTableOf } from '../map/findPass';
import { cutCircuits, type ReelCircuit } from './circuits';

export interface ReelOptions {
  readonly seed: number;
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly combo: string;
  /** The most the reel may run; it ends sooner when nothing unexplored is left. */
  readonly seconds: number;
  /** How many circuit types to trace, at most; Infinity runs until they or `seconds` run out. */
  readonly circuits: number;
  readonly fps: number;
  readonly bpm: number;
  /** Half the side of the square of tiling the reel uses, in world units. */
  readonly radius: number;
  /** CSS px per world unit while tracing. */
  readonly scale: number;
  /** Viewport, CSS px. */
  readonly width: number;
  readonly height: number;
}

/** A rule per family with circuits of many sizes. */
export function reelDefaults(family: TileFamilyId): Pick<ReelOptions, 'subset' | 'combo' | 'radius' | 'scale'> {
  return family === 'hex'
    ? { subset: [0, 2, 3, 4, 6, 8], combo: '000000000', radius: 100, scale: 14 }
    : { subset: [1, 2, 7, 8], combo: '0000000000', radius: 150, scale: 10 };
}

export interface ReelWorld {
  readonly cut: ViewportCut;
  readonly table: LeafChordTable;
  readonly circuits: readonly ReelCircuit[];
  /** Level of the lowest supertile holding both cut instances (0 = same tile). */
  sharedLevel(a: number, b: number): number;
}

export function loadWorld(o: ReelOptions): ReelWorld {
  const engine = unrootedEngineFor(o.seed, o.family);
  const cut = engine.query({ cx: 0, cy: 0, halfW: o.radius, halfH: o.radius }, 2_000_000, { emitIds: true });
  if (cut.cutLevel !== 0 || cut.truncated) throw new Error(`cut of radius ${o.radius} is not whole leaf tiles`);
  const table = buildLeafChordTable(o.family, o.subset, comboToMatchingIndices(o.family, o.subset, o.combo));
  const ids = (cut.ids ?? []).map(parseTileId);
  return {
    cut,
    table,
    circuits: cutCircuits(cut, findTableOf(table)),
    sharedLevel: (a, b) => {
      const ta = ids[a];
      const tb = ids[b];
      if (!ta || !tb || a === b) return 0;
      engine.ensureLevel(Math.max(ta.d, tb.d));
      return sharedLevel(ta, tb, engine.chain());
    },
  };
}

/** One traced circuit, its points rotated to start where the trace starts. */
export interface Trace {
  readonly circuit: ReelCircuit;
  readonly points: readonly Pt[];
  /** Cut instance crossed by step k (from `points[k]` to `points[k + 1]`). */
  readonly tiles: Int32Array;
  readonly start: number;
  /** Seconds; on a bar line. */
  readonly close: number;
  /** Seconds; when the rest of its type light up. */
  readonly fill: number;
  /** One hue per traced type, far apart on the colour wheel. */
  readonly color: Rgb;
}

export interface ReelEvent {
  readonly frame: number;
  readonly t: number;
  readonly type: 'start' | 'step' | 'close' | 'fill' | 'end';
  readonly [field: string]: unknown;
}

export interface ReelPlan {
  readonly options: ReelOptions;
  readonly frames: number;
  readonly traces: readonly Trace[];
  /** Circuit id → [frame it turns solid, its colour]. */
  readonly lit: ReadonlyMap<number, { frame: number; color: Rgb }>;
  /** Camera per frame, 3 doubles (cx, cy, scale). */
  readonly cameras: Float64Array;
  readonly log: { fps: number; seconds: number; bpm: number; events: ReelEvent[] };
}

/**
 * A traced type's colour: the map's golden-angle hues, with the blues lifted.
 * At full saturation and the map's lightness they come out navy, which reads
 * as dark blotches on the near-black ground once a type is lit everywhere.
 */
export function reelColor(step: number): Rgb {
  const [r, g, b] = circuitHueRgb(step);
  const blue = b > 1.5 * Math.max(r, g);
  if (!blue) return [r, g, b];
  const lift = (v: number): number => Math.round(v + (255 - v) * 0.45);
  return [lift(r), lift(g), lift(b)];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Share of a trace's time spent by the time it has covered share `u` of its
 * steps. Concave, so the trace speeds up: the last steps go 4x as fast as the
 * first.
 */
export function traceTime(u: number): number {
  return 0.4 * u + 0.6 * (1 - (1 - u) * (1 - u));
}

/** Steps a trace has covered at time `t` (fractional; 0 before it starts). */
export function stepsAt(trace: Trace, t: number): number {
  const n = trace.points.length;
  if (t <= trace.start) return 0;
  if (t >= trace.close) return n;
  const target = (t - trace.start) / (trace.close - trace.start);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (traceTime(mid) < target) lo = mid;
    else hi = mid;
  }
  return n * lo;
}

/** The time a frame shows: its middle, so a bar line lands on the nearest frame. */
export const frameTime = (frame: number, fps: number): number => (frame + 0.5) / fps;

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const boxOf = (pts: readonly Pt[]): Box => {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const p of pts) {
    b.minX = Math.min(b.minX, p.x);
    b.minY = Math.min(b.minY, p.y);
    b.maxX = Math.max(b.maxX, p.x);
    b.maxY = Math.max(b.maxY, p.y);
  }
  return b;
};

/** Bars a trace of n steps takes: this times the square root of n, at least one. */
const BARS_PER_ROOT_STEP = 0.5;
/** Seconds of the closing pull-back, at least. */
const TAIL = 4;
/** How much closer than `scale` the camera starts a trace. */
const CLOSE_UP = 1.6;
/** The camera never pulls back further than this times `scale`; past it, lines blur to grey. */
const FARTHEST = 0.2;

/**
 * Whether the camera can frame all of `c`, with the margin the post-close view
 * gives it, without looking past the cut.
 */
export function fitsCut(o: ReelOptions, c: ReelCircuit): boolean {
  const pad = (0.6 * o.width) / o.scale;
  const scale = Math.min(o.width / (c.max.x - c.min.x + 2 * pad), o.height / (c.max.y - c.min.y + 2 * pad));
  const cx = (c.min.x + c.max.x) / 2;
  const cy = (c.min.y + c.max.y) / 2;
  return Math.abs(cx) + o.width / (2 * scale) <= o.radius && Math.abs(cy) + o.height / (2 * scale) <= o.radius;
}

export function planReel(o: ReelOptions, world: ReelWorld): ReelPlan {
  const beat = 60 / o.bpm;
  const bar = 4 * beat;
  const rng = mulberry32(o.seed * 7919 + 17);

  const byShape = new Map<string, ReelCircuit[]>();
  for (const c of world.circuits) {
    const list = byShape.get(c.shape);
    if (list) list.push(c);
    else byShape.set(c.shape, [c]);
  }
  // Strands that leave the cut never close in it, so only circuits are here.
  const pool = world.circuits.filter((c) => fitsCut(o, c));

  // The types smallest first, each as the copy nearest where the last trace
  // finished (a circuit ends where it starts), with the index of its segment
  // nearest that point.
  const types = [...new Map(pool.map((c) => [c.shape, c.points.length])).entries()]
    .sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))
    .map(([shape]) => shape);
  const picks: { circuit: ReelCircuit; first: number; backward: boolean }[] = [];
  let at: Pt = { x: 0, y: 0 };
  for (const shape of types) {
    if (picks.length >= o.circuits) break;
    let found: ReelCircuit | null = null;
    let nearest = 0;
    let best = Infinity;
    for (const c of pool) {
      if (c.shape !== shape) continue;
      const n = c.points.length;
      for (let i = 0; i < n; i++) {
        const p = c.points[i];
        const q = c.points[(i + 1) % n];
        const d = Math.hypot((p.x + q.x) / 2 - at.x, (p.y + q.y) / 2 - at.y);
        if (d < best) {
          best = d;
          found = c;
          nearest = i;
        }
      }
    }
    if (!found) continue;
    // Start on the nearest segment, in a seeded direction: forwards it is
    // step 0 from its first end, backwards from its second.
    const backward = rng() < 0.5;
    const first = backward ? (nearest + 1) % found.points.length : nearest;
    picks.push({ circuit: found, first, backward });
    // Where the trace starts, and so where it finishes.
    at = found.points[first];
  }
  const gap = (k: number): number => (k % 2 === 1 ? 2 : 1);
  const ending = (fill: number): number => Math.ceil((fill + beat + TAIL) / bar) * bar;

  const traces: Trace[] = [];
  let start = beat;
  for (let k = 0; k < picks.length; k++) {
    const { circuit, first, backward } = picks[k];
    const n = circuit.points.length;
    const bars = Math.max(1, Math.round(BARS_PER_ROOT_STEP * Math.sqrt(n)));
    // start sits on a bar line after the first trace; keep rounding from
    // dropping it into the bar before.
    const close = (Math.floor(start / bar + 1e-9) + bars) * bar;
    const fill = close + 2 * beat;
    if (ending(fill) > o.seconds + 1e-9) break;
    const order = Array.from({ length: n }, (_, i) => (first + i) % n);
    const points = backward ? order.map((_, i) => circuit.points[order[(n - i) % n]]) : order.map((i) => circuit.points[i]);
    // Step k runs from points[k] to points[k + 1]; backwards, step k is the
    // forward step that ends at points[k].
    const tiles = new Int32Array(n);
    for (let i = 0; i < n; i++) tiles[i] = backward ? circuit.tiles[(order[(n - i) % n] + n - 1) % n] : circuit.tiles[order[i]];
    traces.push({ circuit, points, tiles, start, close, fill, color: reelColor(k + 1) });
    // Pull back to show the pattern after every second close.
    start = close + gap(k) * bar;
  }
  if (traces.length === 0) throw new Error('no circuit fits the reel');

  // End on a bar line once the last pull-back has had its time.
  const last = traces[traces.length - 1];
  const seconds = ending(last.fill);
  const frames = Math.round(seconds * o.fps);
  const frameOf = (t: number): number => Math.max(0, Math.ceil(t * o.fps - 0.5));

  const lit = new Map<number, { frame: number; color: Rgb }>();
  for (const tr of traces) {
    lit.set(tr.circuit.id, { frame: frameOf(tr.close), color: tr.color });
    for (const c of byShape.get(tr.circuit.shape) ?? []) {
      if (c.id !== tr.circuit.id) lit.set(c.id, { frame: frameOf(tr.fill), color: tr.color });
    }
  }

  const cameras = planCamera(o, traces, frames);
  const log = { fps: o.fps, seconds: frames / o.fps, bpm: o.bpm, events: eventsOf(o, world, traces, byShape, frames) };
  return { options: o, frames, traces, lit, cameras, log };
}

function eventsOf(
  o: ReelOptions,
  world: ReelWorld,
  traces: readonly Trace[],
  byShape: ReadonlyMap<string, readonly ReelCircuit[]>,
  frames: number,
): ReelEvent[] {
  const names = leafOrder(o.family);
  const { cut } = world;
  const events: ReelEvent[] = [];
  const at = (frame: number): { frame: number; t: number } => ({ frame, t: frame / o.fps });
  traces.forEach((tr, ci) => {
    const n = tr.points.length;
    const rgb = tr.color.map((v) => Math.round(v));
    let frame = Math.max(0, Math.ceil(tr.start * o.fps - 0.5));
    events.push({ ...at(frame), type: 'start', circuit: ci, length: n, x: tr.points[0].x, y: tr.points[0].y });
    let arc = 0;
    let heading: number | null = null;
    for (let k = 0; k < n; k++) {
      while (stepsAt(tr, frameTime(frame, o.fps)) < k + 1 - 1e-9) frame++;
      const a = tr.points[k];
      const b = tr.points[(k + 1) % n];
      const h = Math.atan2(b.y - a.y, b.x - a.x);
      let turn = 0;
      if (heading !== null) {
        turn = h - heading;
        while (turn > Math.PI) turn -= 2 * Math.PI;
        while (turn < -Math.PI) turn += 2 * Math.PI;
      }
      heading = h;
      arc += Math.hypot(b.x - a.x, b.y - a.y);
      const tile = tr.tiles[k];
      const type = cut.type[tile];
      events.push({
        ...at(frame),
        type: 'step',
        circuit: ci,
        index: k,
        tile: type,
        name: names[type],
        rot: cut.code[tile] & 15,
        turn: Math.round((turn * 180) / Math.PI),
        shared: k === 0 ? 0 : world.sharedLevel(tr.tiles[k - 1], tile),
        arc: +arc.toFixed(3),
        x: +b.x.toFixed(3),
        y: +b.y.toFixed(3),
      });
    }
    events.push({ ...at(frame), type: 'close', circuit: ci, length: n, color: rgb });
    const count = (byShape.get(tr.circuit.shape)?.length ?? 1) - 1;
    events.push({ ...at(Math.ceil(tr.fill * o.fps - 0.5)), type: 'fill', circuit: ci, length: n, count, color: rgb });
  });
  events.push({ ...at(frames), type: 'end' });
  return events.sort((a, b) => a.frame - b.frame);
}

/**
 * Where the camera wants to be at time `t`: a centre and a scale. A
 * critically damped spring follows it, so the targets can jump.
 */
function cameraTarget(o: ReelOptions, traces: readonly Trace[], t: number): { cx: number; cy: number; scale: number; rate: number } {
  const beat = 60 / o.bpm;
  const screenW = o.width / o.scale;
  const fit = (b: Box, pad: number, max: number): { cx: number; cy: number; scale: number } => ({
    cx: (b.minX + b.maxX) / 2,
    cy: (b.minY + b.maxY) / 2,
    scale: Math.min(max, o.width / (b.maxX - b.minX + 2 * pad), o.height / (b.maxY - b.minY + 2 * pad)),
  });
  const near = (p: Pt): { cx: number; cy: number; scale: number } => ({ cx: p.x, cy: p.y, scale: CLOSE_UP * o.scale });
  const last = traces[traces.length - 1];
  if (t >= last.fill + beat) {
    // The closing pull-back: nearly the whole cut, centred on the traces.
    const c = fit(boxOf(traces.flatMap((tr) => tr.points)), 0, Infinity);
    return { cx: c.cx, cy: c.cy, scale: Math.max(o.width, o.height) / (2 * o.radius * 0.97), rate: 1.4 };
  }
  for (let k = 0; k < traces.length; k++) {
    const tr = traces[k];
    const next = traces[k + 1];
    if (t < tr.start) return { ...near(tr.points[0]), rate: 4 };
    if (t < tr.close) {
      // Keep everything drawn so far in view, and room ahead of the head.
      // Once that would pull back past FARTHEST, stay there and keep the
      // head in the middle part of the view instead.
      const done = stepsAt(tr, t);
      const head = tr.points[Math.min(tr.points.length - 1, Math.ceil(done))];
      const drawn = tr.points.slice(0, Math.floor(done) + 1).concat([head]);
      const c = fit(boxOf(drawn), 0.25 * screenW, CLOSE_UP * o.scale);
      const floor = FARTHEST * o.scale;
      if (c.scale >= floor) return { ...c, rate: 3.5 };
      const hx = (0.3 * o.width) / floor;
      const hy = (0.3 * o.height) / floor;
      return {
        cx: Math.max(head.x - hx, Math.min(head.x + hx, c.cx)),
        cy: Math.max(head.y - hy, Math.min(head.y + hy, c.cy)),
        scale: floor,
        rate: 3.5,
      };
    }
    if (!next || t >= next.start) continue;
    const whole = boxOf(tr.points);
    if (t < tr.fill + beat) return { ...fit(whole, 0.6 * screenW, 0.85 * o.scale), rate: 3 };
    const overview = next.start - tr.close > 5 * beat;
    if (overview && t < next.start - 2 * beat) {
      // Everything traced so far and where the next trace starts.
      const box = boxOf(traces.slice(0, k + 2).flatMap((x) => x.points));
      return { ...fit(box, 1.2 * screenW, 0.4 * o.scale), rate: 2.5 };
    }
    // A pan to the next start, pulled back while far from it.
    const halfway = (tr.fill + beat + next.start) / 2;
    if (!overview && t < halfway) {
      return { ...fit(boxOf([...tr.points, next.points[0]]), 0.4 * screenW, o.scale), rate: 3 };
    }
    return { ...near(next.points[0]), rate: 3.5 };
  }
  return { ...near(last.points[0]), rate: 3 };
}

/** The nearest camera to `c` that shows only the cut, no further out than FARTHEST. */
function inCut<T extends MapCamera>(o: ReelOptions, c: T): T {
  const scale = Math.max(c.scale, FARTHEST * o.scale, Math.max(o.width, o.height) / (2 * o.radius));
  const hx = o.radius - o.width / (2 * scale);
  const hy = o.radius - o.height / (2 * scale);
  return { ...c, scale, cx: Math.max(-hx, Math.min(hx, c.cx)), cy: Math.max(-hy, Math.min(hy, c.cy)) };
}

function planCamera(o: ReelOptions, traces: readonly Trace[], frames: number): Float64Array {
  const out = new Float64Array(3 * frames);
  const first = cameraTarget(o, traces, 0);
  // Spring state: centre and log scale, each with a velocity.
  let x = first.cx;
  let y = first.cy;
  let z = Math.log(first.scale);
  let vx = 0;
  let vy = 0;
  let vz = 0;
  const dt = 1 / o.fps;
  const substeps = 4;
  for (let f = 0; f < frames; f++) {
    const goal = inCut(o, cameraTarget(o, traces, frameTime(f, o.fps)));
    const w = goal.rate;
    const gz = Math.log(goal.scale);
    for (let s = 0; s < substeps; s++) {
      const h = dt / substeps;
      vx += (w * w * (goal.cx - x) - 2 * w * vx) * h;
      vy += (w * w * (goal.cy - y) - 2 * w * vy) * h;
      vz += (w * w * (gz - z) - 2 * w * vz) * h;
      x += vx * h;
      y += vy * h;
      z += vz * h;
    }
    out[3 * f] = x;
    out[3 * f + 1] = y;
    out[3 * f + 2] = Math.exp(z);
  }
  return out;
}

export function cameraAt(plan: ReelPlan, frame: number): MapCamera {
  const f = Math.max(0, Math.min(plan.frames - 1, frame));
  return { cx: plan.cameras[3 * f], cy: plan.cameras[3 * f + 1], scale: plan.cameras[3 * f + 2] };
}
