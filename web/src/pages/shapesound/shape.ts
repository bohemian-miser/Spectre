/**
 * A circuit as the shape-sound prototypes see it
 * (social/experiments/shapesound/gallery.py `Shape`): anticlockwise, centred
 * on the mean of its points, scaled to radius of gyration 1. `full` keeps one
 * point per step; `p` is thinned to at most 720 points for the head track,
 * and `view` to at most 8192 for drawing. Also the corner fit of
 * `mappings.corners_v2`: Ramer-Douglas-Peucker on the full loop (every k-th
 * step of a very long one).
 */

import type { Pt } from '../../core';
import { terms, termAt } from '../shapes/descriptor';

export interface Shape {
  /** One point per step, normalised; x, y interleaved. */
  readonly full: Float64Array;
  readonly steps: number;
  /** Thinned (every k-th step, at most `THIN` points), normalised. */
  readonly p: Float64Array;
  readonly n: number;
  /** Every k-th step, at most `VIEW` points, for drawing and for Fourier terms of long loops. */
  readonly view: Float64Array;
  readonly viewN: number;
  /** Median step length, in normalised units. */
  readonly tile: number;
  readonly perimeter: number;
  /** An open path (a strand that did not close), closed here by a straight chord of tile-spaced points. */
  readonly open: boolean;
}

const THIN = 720;
/** Points kept for drawing and for the Fourier terms of a long loop: 4096 terms either side, far past the 512 used. */
export const VIEW = 8192;
/** Points the corner fit works on at most; a longer loop is fitted on every k-th step. */
export const FIT_POINTS = 50_000;
/** Step lengths sampled for the median, at most. */
const MEDIAN_SAMPLES = 20_000;

function signedArea(pts: readonly Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

/** Every k-th of n interleaved points, k the smallest that leaves at most `most`. */
function every(xy: Float64Array, n: number, most: number): { xy: Float64Array; n: number; k: number } {
  const k = Math.ceil(n / most);
  if (k <= 1) return { xy, n, k: 1 };
  const m = Math.ceil(n / k);
  const out = new Float64Array(2 * m);
  for (let i = 0; i < m; i++) {
    out[2 * i] = xy[2 * i * k];
    out[2 * i + 1] = xy[2 * i * k + 1];
  }
  return { xy: out, n: m, k };
}

/**
 * The shape of a loop of points, one per step. `open`: a path that did not
 * close; its centre and size come from its own points, and a straight run of
 * points about a step apart joins its end back to its start, so every mapping
 * can go round it as a loop.
 */
export function makeShape(points: readonly Pt[], open = false): Shape {
  const pts = signedArea(points) < 0 ? [...points].reverse() : [...points];
  const traced = pts.length;
  const k = Math.ceil(traced / THIN);
  const thin = pts.filter((_, i) => i % k === 0);
  let cx = 0;
  let cy = 0;
  for (const q of thin) {
    cx += q.x;
    cy += q.y;
  }
  cx /= thin.length;
  cy /= thin.length;
  let s = 0;
  for (const q of thin) s += (q.x - cx) ** 2 + (q.y - cy) ** 2;
  const rg = Math.sqrt(s / thin.length) || 1;
  const median = (n: number, len: (i: number) => number): number => {
    const stride = Math.max(1, Math.ceil(n / MEDIAN_SAMPLES));
    const d: number[] = [];
    for (let i = 0; i < n; i += stride) d.push(len(i));
    d.sort((a, b) => a - b);
    return d[Math.floor(d.length / 2)];
  };
  if (open && traced > 1) {
    // Close the path by its chord, in steps of about one step length.
    const step = median(traced - 1, (i) => Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)) || 1;
    const a = pts[traced - 1];
    const b = pts[0];
    const m = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / step);
    for (let j = 1; j < m; j++) pts.push({ x: a.x + ((b.x - a.x) * j) / m, y: a.y + ((b.y - a.y) * j) / m });
  }
  const steps = pts.length;
  const norm = (list: readonly Pt[]): Float64Array => {
    const out = new Float64Array(2 * list.length);
    list.forEach((q, i) => {
      out[2 * i] = (q.x - cx) / rg;
      out[2 * i + 1] = (q.y - cy) / rg;
    });
    return out;
  };
  const full = norm(pts);
  const seg = (i: number): number => {
    const j = (i + 1) % steps;
    return Math.hypot(full[2 * j] - full[2 * i], full[2 * j + 1] - full[2 * i + 1]);
  };
  let perimeter = 0;
  for (let i = 0; i < steps; i++) perimeter += seg(i);
  const view = every(full, steps, VIEW);
  return { full, steps, p: norm(thin), n: thin.length, view: view.xy, viewN: view.n, tile: median(steps, seg), perimeter, open };
}

/** Point at lap share u of a closed path xy (n points), interpolated. */
export function pointAt(xy: Float64Array, n: number, u: number): [number, number] {
  const x = (((u % 1) + 1) % 1) * n;
  const i = Math.floor(x) % n;
  const f = x - Math.floor(x);
  const j = (i + 1) % n;
  return [xy[2 * i] * (1 - f) + xy[2 * j] * f, xy[2 * i + 1] * (1 - f) + xy[2 * j + 1] * f];
}

// ---------------------------------------------------------------- Fourier terms

export interface Term {
  readonly k: number;
  readonly re: number;
  readonly im: number;
  readonly amp: number;
}

/** The most terms a spectrum takes: a cap for cost. */
export const MAX_TERMS = 512;

/** How many terms a loop has: half its steps (a term needs two samples a cycle), at most `MAX_TERMS`. */
export const usableTerms = (shape: Shape): number => Math.max(1, Math.min(MAX_TERMS, Math.floor((shape.steps - 1) / 2)));

/**
 * Terms 1 <= |k| <= K of the loop (Shapes page `terms`), over the radius of
 * gyration, from one point per step so a long loop has all its terms.
 */
export function shapeTerms(shape: Shape, K: number): Term[] {
  const usable = Math.max(1, Math.min(K, usableTerms(shape)));
  // A long loop's terms come from its drawn points: up to 4096 terms, far past what is used.
  const src = shape.steps <= VIEW ? { xy: shape.full, n: shape.steps } : { xy: shape.view, n: shape.viewN };
  const t = terms(src, usable);
  const out: Term[] = [];
  for (let k = -usable; k <= usable; k++) {
    if (k === 0) continue;
    const c = termAt(t, k);
    out.push({ k, re: c.re, im: c.im, amp: Math.hypot(c.re, c.im) });
  }
  return out;
}

/** dB below term 1 that maps to an empty bar and a silent partial. */
export const FLOOR_DB = 50;

/** A term's bar height and partial level, 0..1: its dB relative to term 1, from -FLOOR_DB to 0. */
export function termLevel(amp: number, ref: number): number {
  return Math.max(0, Math.min(1, (20 * Math.log10(amp / ref + 1e-12) + FLOOR_DB) / FLOOR_DB));
}

export function termRef(ts: readonly Term[]): number {
  const one = ts.find((t) => t.k === 1);
  return one && one.amp > 0 ? one.amp : Math.max(1e-12, ...ts.map((t) => t.amp));
}

/** Bars in the k ≡ 1 (mod 3) class. */
export const isComb = (k: number): boolean => (((k - 1) % 3) + 3) % 3 === 0;

/** The curve rebuilt from the terms with |k| <= kmax, at m points. */
export function partialCurve(ts: readonly Term[], kmax: number, m: number): Float64Array {
  const out = new Float64Array(2 * m);
  for (const t of ts) {
    if (Math.abs(t.k) > kmax) continue;
    for (let j = 0; j < m; j++) {
      const a = (2 * Math.PI * t.k * j) / m;
      const c = Math.cos(a);
      const s = Math.sin(a);
      out[2 * j] += t.re * c - t.im * s;
      out[2 * j + 1] += t.re * s + t.im * c;
    }
  }
  return out;
}

// ---------------------------------------------------------------- corners

/**
 * Ramer-Douglas-Peucker on a closed path: indices of the kept vertices, in
 * order from the smallest. Starts from the two points furthest apart (as
 * `shapes.rdp`), so a larger `eps` keeps a subset of a smaller one's.
 */
export function rdp(xy: Float64Array, n: number, eps: number): number[] {
  const far = (from: number): number => {
    let best = 0;
    let bd = -1;
    for (let i = 0; i < n; i++) {
      const d = (xy[2 * i] - xy[2 * from]) ** 2 + (xy[2 * i + 1] - xy[2 * from + 1]) ** 2;
      if (d > bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  };
  const i1 = far(0);
  const i0 = far(i1);
  const keep = new Set<number>([i0, i1]);
  const stack: [number, number][] = [
    [i0, i1],
    [i1, i0],
  ];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const len = (((b - a) % n) + n) % n || n;
    if (len < 2) continue;
    const ax = xy[2 * a];
    const ay = xy[2 * a + 1];
    const dx = xy[2 * b] - ax;
    const dy = xy[2 * b + 1] - ay;
    const L = Math.hypot(dx, dy);
    let best = -1;
    let bd = -1;
    for (let s = 1; s < len; s++) {
      const i = (a + s) % n;
      const sx = xy[2 * i] - ax;
      const sy = xy[2 * i + 1] - ay;
      const d = L > 1e-12 ? Math.abs(dx * sy - dy * sx) / L : Math.hypot(sx, sy);
      if (d > bd) {
        bd = d;
        best = i;
      }
    }
    if (bd <= eps) continue;
    keep.add(best);
    stack.push([a, best], [best, b]);
  }
  return [...keep].sort((x, y) => x - y);
}

/** `corners_v2` defaults: the fit follows the outline to within one tile or 1% of its length, whichever is smaller. */
export const EPS_TILES = 1;
export const EPS_SHARE = 0.01;

/** The fit tolerance, normalised units, for a multiple `scale` of the default. */
export function cornerEps(shape: Shape, scale: number): number {
  return scale * Math.min(EPS_TILES * shape.tile, EPS_SHARE * shape.perimeter);
}

export interface CornerFit {
  /** Step index of each corner, increasing. */
  readonly cuts: readonly number[];
  readonly eps: number;
}

/** Corners a fit keeps at most: each is a note, and a lap of tens of thousands of them is a buzz that takes minutes to render. */
export const MAX_CORNERS = 4096;

/**
 * The corners at `scale` times the default tolerance; with more than
 * `MAX_CORNERS`, the tolerance is raised (by quarters) until there are no more
 * than that. `eps` is the tolerance used.
 */
export function fitCorners(shape: Shape, scale: number): CornerFit {
  // A long loop is fitted on every k-th step, its corners put back on the steps they came from.
  const d = shape.steps <= FIT_POINTS ? { xy: shape.full, n: shape.steps, k: 1 } : every(shape.full, shape.steps, FIT_POINTS);
  let eps = cornerEps(shape, scale);
  let cuts = rdp(d.xy, d.n, eps);
  while (cuts.length > MAX_CORNERS) {
    eps *= 1.25;
    cuts = rdp(d.xy, d.n, eps);
  }
  return { cuts: d.k === 1 ? cuts : cuts.map((i) => i * d.k), eps };
}
