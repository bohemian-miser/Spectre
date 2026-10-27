/**
 * How close a circuit is to k copies of one side.
 *
 * - `fitCorners`: k tiles of the circuit, in walking order, chosen so the
 *   tiles between consecutive corners lie as close as possible to the line
 *   joining them (least sum of squared distances). Each arc's cost comes
 *   from prefix sums of the tile centres, so trying a corner is O(1).
 * - `armDistances`: the word cut at the corners into k arms, and the edit
 *   distance (Levenshtein, over letters) between consecutive arms.
 * - `segmentProfile`: the word cut into k equal parts at a sampled set of
 *   offsets, scored by the largest edit distance between consecutive parts
 *   over the part length; the best offset per k.
 */
import type { Pt } from '../src/core';

// ---------------------------------------------------------------------------
// Edit distance
// ---------------------------------------------------------------------------

/** Letters as small integers, consistently within one call site. */
export function encode(words: readonly (readonly string[])[]): Int32Array[] {
  const ids = new Map<string, number>();
  return words.map((w) => Int32Array.from(w, (l) => ids.get(l) ?? ids.set(l, ids.size).get(l)!));
}

export function levenshtein(a: Int32Array, b: Int32Array): number {
  if (a.length < b.length) [a, b] = [b, a];
  let prev = new Int32Array(b.length + 1);
  let cur = new Int32Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    const ai = a[i - 1];
    for (let j = 1; j <= b.length; j++) {
      const sub = prev[j - 1] + (ai === b[j - 1] ? 0 : 1);
      const del = prev[j] + 1;
      const ins = cur[j - 1] + 1;
      cur[j] = sub < del ? (sub < ins ? sub : ins) : del < ins ? del : ins;
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

// ---------------------------------------------------------------------------
// Corners
// ---------------------------------------------------------------------------

/** Cost of the arc from corner i to corner j (cyclic, j after i), from prefix sums. */
function arcCoster(pts: readonly Pt[]): (i: number, j: number) => number {
  const n = pts.length;
  // Prefix sums over two laps, so an arc that wraps is one contiguous range.
  const [Sx, Sy, Sxx, Syy, Sxy] = [0, 0, 0, 0, 0].map(() => new Float64Array(2 * n + 1));
  for (let t = 0; t < 2 * n; t++) {
    const { x, y } = pts[t % n];
    Sx[t + 1] = Sx[t] + x;
    Sy[t + 1] = Sy[t] + y;
    Sxx[t + 1] = Sxx[t] + x * x;
    Syy[t + 1] = Syy[t] + y * y;
    Sxy[t + 1] = Sxy[t] + x * y;
  }
  return (i, j) => {
    // The tiles strictly between the corners.
    const lo = i + 1;
    const hi = j > i ? j : j + n;
    if (hi <= lo) return 0;
    const a = pts[i];
    const b = pts[j % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const cnt = hi - lo;
    const sx = Sx[hi] - Sx[lo];
    const sy = Sy[hi] - Sy[lo];
    // Distance of p from the line through a and b is (dy*px - dx*py + c) / |b - a|.
    const c = dx * a.y - dy * a.x;
    const q = dy * dy * (Sxx[hi] - Sxx[lo]) + dx * dx * (Syy[hi] - Syy[lo]) - 2 * dx * dy * (Sxy[hi] - Sxy[lo])
      + 2 * c * (dy * sx - dx * sy) + cnt * c * c;
    return q / (dx * dx + dy * dy);
  };
}

export interface CornerFit {
  /** Corner positions in the walked order, increasing. */
  readonly corners: readonly number[];
  /** Mean squared distance of a tile from its side, in tile edges squared. */
  readonly fit: number;
}

export function fitCorners(pts: readonly Pt[], k: number): CornerFit {
  const n = pts.length;
  if (n < 2 * k) return { corners: Array.from({ length: k }, (_, i) => Math.floor((i * n) / k)), fit: 0 };
  const cost = arcCoster(pts);
  const total = (cs: readonly number[]): number => cs.reduce((s, c, i) => s + cost(c, cs[(i + 1) % k]), 0);
  // Starts: the evenly spaced corner sets that fit best, a few of them far apart.
  const even = (o: number): number[] => Array.from({ length: k }, (_, i) => (o + Math.floor((i * n) / k)) % n);
  const span = Math.floor(n / k);
  const scored = Array.from({ length: span }, (_, o) => ({ o, c: total(even(o)) })).sort((x, y) => x.c - y.c);
  const starts: number[][] = [];
  for (const { o } of scored) {
    if (starts.length >= 4) break;
    if (starts.every((s) => Math.min((s[0] - o + n) % span, (o - s[0] + n) % span) > span / 8)) starts.push(even(o));
  }
  let best: number[] = starts[0];
  let bestCost = Infinity;
  for (const s of starts) {
    const cs = [...s].sort((a, b) => a - b);
    let c0 = total(cs);
    // Move one corner at a time, with shrinking steps, while that lowers the cost.
    for (let step = Math.max(1, Math.floor(n / (4 * k))); step >= 1; step = Math.floor(step / 2)) {
      for (let moved = true; moved;) {
        moved = false;
        for (let i = 0; i < k; i++) {
          for (const d of [-step, step]) {
            const prev = cs[(i + k - 1) % k];
            const next = cs[(i + 1) % k];
            const v = (cs[i] + d + n) % n;
            // The corner must stay strictly between its neighbours.
            const gapPrev = (v - prev + n) % n;
            const gapNext = (next - v + n) % n;
            if (gapPrev === 0 || gapNext === 0 || gapPrev + gapNext !== ((next - prev + n) % n || n)) continue;
            const old = cs[i];
            cs[i] = v;
            const c1 = total(cs);
            if (c1 < c0) { c0 = c1; moved = true; } else cs[i] = old;
          }
        }
      }
    }
    if (c0 < bestCost) { bestCost = c0; best = [...cs]; }
  }
  return { corners: [...best].sort((a, b) => a - b), fit: bestCost / n };
}

// ---------------------------------------------------------------------------
// Arms and segments
// ---------------------------------------------------------------------------

export interface Arms {
  readonly lengths: readonly number[];
  /** Edit distance from arm i to arm i+1. */
  readonly distances: readonly number[];
  /** Largest distance over the mean arm length. */
  readonly score: number;
}

/** Cyclic slice of a word: positions from `a` up to (not including) `b`. */
const arc = (w: Int32Array, a: number, b: number): Int32Array => {
  if (b > a) return w.subarray(a, b);
  const out = new Int32Array(w.length - a + b);
  out.set(w.subarray(a));
  out.set(w.subarray(0, b), w.length - a);
  return out;
};

export function armDistances(word: Int32Array, corners: readonly number[]): Arms {
  const k = corners.length;
  const arms = corners.map((c, i) => arc(word, c, corners[(i + 1) % k]));
  const distances = arms.map((a, i) => levenshtein(a, arms[(i + 1) % k]));
  const mean = word.length / k;
  return { lengths: arms.map((a) => a.length), distances, score: Math.max(...distances) / mean };
}

export interface Segments {
  readonly k: number;
  /** Best offset found. */
  readonly offset: number;
  /** Largest edit distance between consecutive parts, over the part length. */
  readonly score: number;
}

/** For each k, the best of `samples` evenly spaced offsets within one part. */
export function segmentProfile(word: Int32Array, ks: readonly number[], samples = 16): Segments[] {
  const n = word.length;
  return ks.map((k) => {
    const S = n / k;
    const span = Math.floor(S);
    const step = Math.max(1, Math.floor(span / samples));
    let best: Segments = { k, offset: 0, score: Infinity };
    for (let o = 0; o < span; o += step) {
      const cuts = Array.from({ length: k }, (_, i) => (o + Math.round(i * S)) % n);
      const parts = cuts.map((c, i) => arc(word, c, cuts[(i + 1) % k]));
      let worst = 0;
      for (let i = 0; i < k && worst / S < best.score; i++) worst = Math.max(worst, levenshtein(parts[i], parts[(i + 1) % k]));
      if (worst / S < best.score) best = { k, offset: o, score: worst / S };
      if (best.score === 0) break;
    }
    return best;
  });
}
