/**
 * Circuits compared by shape: the first Fourier terms of each loop (samples
 * evenly spaced by tile count, `corners/measure.ts`), about its centroid and
 * divided by its radius of gyration, so position and size drop out. Turning
 * the loop multiplies every term by one phase, and starting it at another
 * tile multiplies term f by e^{2 pi i f s}; the gap between two circuits is
 * the rms distance left between their outlines after the turn and start
 * (and, if allowed, the mirror image) that bring them closest. Circuits are
 * then grouped by average-linkage clustering of the gaps and laid out in the
 * plane by classical multidimensional scaling.
 */

import { centroid, radiusOfGyration, type Loop } from '../corners/measure';

/** Terms f = -F..F of a loop, f = 0 left zero: re, im at 2 (f + F). */
export interface Terms {
  readonly F: number;
  readonly c: Float64Array;
}

export function terms(loop: Loop, F: number): Terms {
  const { xy, n } = loop;
  const o = centroid(loop);
  const rg = radiusOfGyration(loop);
  const c = new Float64Array(2 * (2 * F + 1));
  const cos = new Float64Array(n);
  const sin = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    cos[j] = Math.cos((2 * Math.PI * j) / n);
    sin[j] = Math.sin((2 * Math.PI * j) / n);
  }
  for (let f = -F; f <= F; f++) {
    if (f === 0 || 2 * Math.abs(f) >= n) continue;
    let re = 0;
    let im = 0;
    let t = 0;
    const step = ((f % n) + n) % n;
    for (let j = 0; j < n; j++) {
      const x = xy[2 * j] - o.x;
      const y = xy[2 * j + 1] - o.y;
      // (x + i y)(cos - i sin) at angle 2 pi f j / n.
      re += x * cos[t] + y * sin[t];
      im += y * cos[t] - x * sin[t];
      t += step;
      if (t >= n) t -= n;
    }
    c[2 * (f + F)] = re / (n * rg);
    c[2 * (f + F) + 1] = im / (n * rg);
  }
  return { F, c };
}

/** The mirror image traced the same way round: z(t) -> conj(z(-t)), which conjugates every term. */
export function mirrored(t: Terms): Terms {
  const c = Float64Array.from(t.c);
  for (let i = 1; i < c.length; i += 2) c[i] = -c[i];
  return { F: t.F, c };
}

function norm2(t: Terms): number {
  let s = 0;
  for (let i = 0; i < t.c.length; i++) s += t.c[i] * t.c[i];
  return s;
}

/** In-place radix-2 FFT, e^{-2 pi i k j / n}. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len;
    const wr = Math.cos(a);
    const wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

export interface Alignment {
  /** rms distance between the outlines, in radii of gyration, over the terms kept. */
  readonly gap: number;
  /** Whether b was mirrored. */
  readonly mirror: boolean;
  /** b restarted this fraction of a lap on, then turned by theta: b(t + s) e^{i theta}. */
  readonly s: number;
  readonly theta: number;
}

/** X(s) = sum_f a_f conj(b_f) e^{-2 pi i f s}. */
function cross(a: Terms, b: Terms, s: number): { re: number; im: number } {
  let re = 0;
  let im = 0;
  for (let f = -a.F; f <= a.F; f++) {
    const i = 2 * (f + a.F);
    const pr = a.c[i] * b.c[i] + a.c[i + 1] * b.c[i + 1];
    const pi = a.c[i + 1] * b.c[i] - a.c[i] * b.c[i + 1];
    const t = -2 * Math.PI * f * s;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    re += pr * ct - pi * st;
    im += pr * st + pi * ct;
  }
  return { re, im };
}

/**
 * The start s and turn that bring b closest to a. sum_f |a_f - e^{i theta}
 * e^{2 pi i f s} b_f|^2 = |a|^2 + |b|^2 - 2 Re(e^{-i theta} X(s)), least at
 * theta = arg X(s) with s maximising |X(s)|: X on a grid of starts by one
 * FFT, then the best grid point refined by golden-section search.
 */
function alignOne(a: Terms, b: Terms): { gap: number; s: number; theta: number } {
  const F = a.F;
  let G = 64;
  while (G < 8 * F) G <<= 1;
  const re = new Float64Array(G);
  const im = new Float64Array(G);
  for (let f = -F; f <= F; f++) {
    const i = 2 * (f + F);
    const k = ((f % G) + G) % G;
    re[k] += a.c[i] * b.c[i] + a.c[i + 1] * b.c[i + 1];
    im[k] += a.c[i + 1] * b.c[i] - a.c[i] * b.c[i + 1];
  }
  fft(re, im);
  let g = 0;
  for (let k = 1; k < G; k++) if (re[k] * re[k] + im[k] * im[k] > re[g] * re[g] + im[g] * im[g]) g = k;
  const mag = (s: number) => {
    const x = cross(a, b, s);
    return x.re * x.re + x.im * x.im;
  };
  let lo = (g - 1) / G;
  let hi = (g + 1) / G;
  const phi = (Math.sqrt(5) - 1) / 2;
  let x1 = hi - phi * (hi - lo);
  let x2 = lo + phi * (hi - lo);
  let f1 = mag(x1);
  let f2 = mag(x2);
  for (let it = 0; it < 40; it++) {
    if (f1 < f2) {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + phi * (hi - lo);
      f2 = mag(x2);
    } else {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - phi * (hi - lo);
      f1 = mag(x1);
    }
  }
  const s = (((lo + hi) / 2) % 1 + 1) % 1;
  const x = cross(a, b, s);
  const gap2 = norm2(a) + norm2(b) - 2 * Math.hypot(x.re, x.im);
  return { gap: Math.sqrt(Math.max(0, gap2)), s, theta: Math.atan2(x.im, x.re) };
}

export function align(a: Terms, b: Terms, allowMirror: boolean): Alignment {
  const plain = alignOne(a, b);
  if (!allowMirror) return { ...plain, mirror: false };
  const flip = alignOne(a, mirrored(b));
  return flip.gap < plain.gap ? { ...flip, mirror: true } : { ...plain, mirror: false };
}

/** Every pair's gap, row-major n x n. */
export function gaps(all: readonly Terms[], allowMirror: boolean): Float64Array {
  const n = all.length;
  const d = new Float64Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const g = align(all[i], all[j], allowMirror).gap;
      d[i * n + j] = g;
      d[j * n + i] = g;
    }
  return d;
}

export interface Merge {
  readonly a: number;
  readonly b: number;
  /** Mean gap between the two clusters' members. */
  readonly height: number;
}

/**
 * Average-linkage clustering: repeatedly join the two clusters whose
 * members are closest on average. Clusters are numbered 0..n-1 for the
 * circuits, then n, n+1, ... for each merge in order.
 */
export function cluster(d: Float64Array, n: number): Merge[] {
  const size = new Map<number, number>();
  const dist = new Map<number, Map<number, number>>();
  for (let i = 0; i < n; i++) {
    size.set(i, 1);
    const row = new Map<number, number>();
    for (let j = 0; j < n; j++) if (j !== i) row.set(j, d[i * n + j]);
    dist.set(i, row);
  }
  const merges: Merge[] = [];
  let next = n;
  while (size.size > 1) {
    let a = -1;
    let b = -1;
    let best = Infinity;
    for (const [i, row] of dist)
      for (const [j, v] of row)
        if (i < j && v < best) {
          best = v;
          a = i;
          b = j;
        }
    const sa = size.get(a)!;
    const sb = size.get(b)!;
    const row = new Map<number, number>();
    for (const k of size.keys()) {
      if (k === a || k === b) continue;
      const v = (sa * dist.get(a)!.get(k)! + sb * dist.get(b)!.get(k)!) / (sa + sb);
      row.set(k, v);
      dist.get(k)!.delete(a);
      dist.get(k)!.delete(b);
      dist.get(k)!.set(next, v);
    }
    dist.delete(a);
    dist.delete(b);
    size.delete(a);
    size.delete(b);
    dist.set(next, row);
    size.set(next, sa + sb);
    merges.push({ a, b, height: best });
    next++;
  }
  return merges;
}

/** Group of each circuit when every merge at or below `height` is kept, groups numbered by size, largest first. */
export function cut(merges: readonly Merge[], n: number, height: number): number[] {
  const parent = Array.from({ length: n + merges.length }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  merges.forEach((m, k) => {
    if (m.height <= height) {
      parent[find(m.a)] = n + k;
      parent[find(m.b)] = n + k;
    }
  });
  const roots = Array.from({ length: n }, (_, i) => find(i));
  const count = new Map<number, number>();
  for (const r of roots) count.set(r, (count.get(r) ?? 0) + 1);
  const order = [...count.keys()].sort((x, y) => count.get(y)! - count.get(x)! || x - y);
  const label = new Map(order.map((r, i) => [r, i]));
  return roots.map((r) => label.get(r)!);
}

/** The member with the least total gap to the rest. */
export function medoid(members: readonly number[], d: Float64Array, n: number): number {
  let best = members[0];
  let bestS = Infinity;
  for (const i of members) {
    let s = 0;
    for (const j of members) s += d[i * n + j];
    if (s < bestS) {
      bestS = s;
      best = i;
    }
  }
  return best;
}

/** b's terms turned, restarted and (if so) mirrored onto a. */
export function aligned(b: Terms, al: Alignment): Terms {
  const src = al.mirror ? mirrored(b) : b;
  const c = new Float64Array(src.c.length);
  for (let f = -src.F; f <= src.F; f++) {
    const i = 2 * (f + src.F);
    const t = al.theta + 2 * Math.PI * f * al.s;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    c[i] = src.c[i] * ct - src.c[i + 1] * st;
    c[i + 1] = src.c[i] * st + src.c[i + 1] * ct;
  }
  return { F: src.F, c };
}

/** The outline the terms draw, at `count` points, in radii of gyration about the centroid. */
export function outline(t: Terms, count: number): Float64Array {
  const out = new Float64Array(2 * count);
  for (let j = 0; j < count; j++) {
    let x = 0;
    let y = 0;
    for (let f = -t.F; f <= t.F; f++) {
      const i = 2 * (f + t.F);
      const a = (2 * Math.PI * f * j) / count;
      x += t.c[i] * Math.cos(a) - t.c[i + 1] * Math.sin(a);
      y += t.c[i] * Math.sin(a) + t.c[i + 1] * Math.cos(a);
    }
    out[2 * j] = x;
    out[2 * j + 1] = y;
  }
  return out;
}

/** The mean of the members' terms, each aligned onto the medoid first. */
export function meanShape(members: readonly number[], all: readonly Terms[], centre: number, allowMirror: boolean): Terms {
  const F = all[centre].F;
  const c = new Float64Array(all[centre].c.length);
  for (const i of members) {
    const t = i === centre ? all[i] : aligned(all[i], align(all[centre], all[i], allowMirror));
    for (let k = 0; k < c.length; k++) c[k] += t.c[k] / members.length;
  }
  return { F, c };
}

/**
 * Classical multidimensional scaling to the plane: the two leading
 * eigenvectors of the double-centred squared gaps, by power iteration.
 */
export function planeLayout(d: Float64Array, n: number): Float64Array {
  const B = new Float64Array(n * n);
  const rowMean = new Float64Array(n);
  let all = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const v = d[i * n + j] ** 2;
      rowMean[i] += v / n;
      all += v / (n * n);
    }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) B[i * n + j] = -0.5 * (d[i * n + j] ** 2 - rowMean[i] - rowMean[j] + all);
  const out = new Float64Array(2 * n);
  const found: Float64Array[] = [];
  for (let axis = 0; axis < 2; axis++) {
    let v = Float64Array.from({ length: n }, (_, i) => Math.sin(i * 1.7 + axis * 0.9 + 0.3));
    let lambda = 0;
    for (let it = 0; it < 500; it++) {
      const w = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < n; j++) s += B[i * n + j] * v[j];
        w[i] = s;
      }
      for (const u of found) {
        let p = 0;
        for (let i = 0; i < n; i++) p += w[i] * u[i];
        for (let i = 0; i < n; i++) w[i] -= p * u[i];
      }
      const len = Math.hypot(...w);
      if (len === 0) break;
      lambda = len;
      v = w.map((x) => x / len);
    }
    found.push(v);
    for (let i = 0; i < n; i++) out[2 * i + axis] = v[i] * Math.sqrt(Math.max(0, lambda));
  }
  return out;
}

/** Term f of a set of terms, re and im. */
export function termAt(t: Terms, f: number): { re: number; im: number } {
  const i = 2 * (f + t.F);
  return { re: t.c[i], im: t.c[i + 1] };
}

/**
 * The terms turned and restarted to a fixed position, so phases can be read
 * and compared: the circle term and the largest other term g both real and
 * positive. That fixes the turn and the start up to |g - 1| choices, which
 * differ only in the terms f with f - 1 not a multiple of g - 1; of those,
 * the one giving the largest such term the largest real part is kept (with
 * no such term the choices are the same terms).
 */
export function canonical(t: Terms): Terms {
  const F = t.F;
  const mag = (f: number) => Math.hypot(t.c[2 * (f + F)], t.c[2 * (f + F) + 1]);
  const others = Array.from({ length: 2 * F + 1 }, (_, i) => i - F).filter((f) => f !== 0 && f !== 1 && mag(f) > 0);
  others.sort((a, b) => mag(b) - mag(a) || Math.abs(a) - Math.abs(b));
  const g = others[0];
  if (g === undefined) return t;
  const h = others.find((f) => (f - 1) % (g - 1) !== 0);
  const p1 = Math.atan2(t.c[2 * (1 + F) + 1], t.c[2 * (1 + F)]);
  const pg = Math.atan2(t.c[2 * (g + F) + 1], t.c[2 * (g + F)]);
  // Phase of f after the move: phi_f + theta + 2 pi f s. Zero for f = 1 and f = g.
  const k = Math.abs(g - 1);
  let best: Terms | null = null;
  let bestRe = -Infinity;
  for (let j = 0; j < k; j++) {
    const s = (-(pg - p1) / (2 * Math.PI) + j) / (g - 1);
    const theta = -p1 - 2 * Math.PI * s;
    const moved = aligned(t, { gap: 0, mirror: false, s, theta });
    const re = h === undefined ? 0 : moved.c[2 * (h + F)];
    if (re > bestRe + 1e-12) {
      bestRe = re;
      best = moved;
    }
  }
  return best!;
}

/** Only `count` terms kept: the lowest |f| first, or the largest first. */
export function truncated(t: Terms, count: number, order: 'lowest' | 'largest'): Terms {
  const F = t.F;
  const fs = Array.from({ length: 2 * F + 1 }, (_, i) => i - F).filter((f) => f !== 0);
  const mag = (f: number) => Math.hypot(t.c[2 * (f + F)], t.c[2 * (f + F) + 1]);
  fs.sort(order === 'lowest' ? (a, b) => Math.abs(a) - Math.abs(b) || b - a : (a, b) => mag(b) - mag(a) || Math.abs(a) - Math.abs(b));
  const keep = new Set(fs.slice(0, count));
  const c = new Float64Array(t.c.length);
  for (const f of keep) {
    c[2 * (f + F)] = t.c[2 * (f + F)];
    c[2 * (f + F) + 1] = t.c[2 * (f + F) + 1];
  }
  return { F, c };
}

/** |a_f - b_f|^2 for each f = -F..F: each harmonic's part of the squared gap once b is aligned onto a. */
export function termGaps(a: Terms, b: Terms): Float64Array {
  const out = new Float64Array(2 * a.F + 1);
  for (let i = 0; i < out.length; i++) out[i] = (a.c[2 * i] - b.c[2 * i]) ** 2 + (a.c[2 * i + 1] - b.c[2 * i + 1]) ** 2;
  return out;
}

/**
 * For each f = -F..F, how much the size |c_f| differs between groups against
 * within them: the one-way analysis-of-variance ratio (mean square between
 * groups over mean square within), over the groups of two or more. A
 * harmonic every circuit has at the same size scores 0.
 */
export function separation(all: readonly Terms[], groups: readonly number[]): Float64Array {
  const F = all[0].F;
  const members = new Map<number, number[]>();
  groups.forEach((g, i) => (members.get(g) ?? members.set(g, []).get(g)!).push(i));
  const used = [...members.values()].filter((m) => m.length > 1);
  const N = used.reduce((s, m) => s + m.length, 0);
  const k = used.length;
  const out = new Float64Array(2 * F + 1);
  if (k < 2 || N <= k) return out;
  for (let f = -F; f <= F; f++) {
    if (f === 0) continue;
    const x = (i: number) => Math.hypot(all[i].c[2 * (f + F)], all[i].c[2 * (f + F) + 1]);
    let total = 0;
    for (const m of used) for (const i of m) total += x(i);
    const mean = total / N;
    let between = 0;
    let within = 0;
    for (const m of used) {
      const gm = m.reduce((s, i) => s + x(i), 0) / m.length;
      between += m.length * (gm - mean) ** 2;
      for (const i of m) within += (x(i) - gm) ** 2;
    }
    const msb = between / (k - 1);
    const msw = within / (N - k);
    out[f + F] = msw > 0 ? msb / msw : msb > 0 ? Infinity : 0;
  }
  return out;
}
