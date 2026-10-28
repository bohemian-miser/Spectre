/**
 * How many sides a circuit has, measured four ways from its tile positions
 * (a closed, anticlockwise loop sampled evenly by tile count; see
 * `web/circuit-classes/corner-paths.ts`).
 *
 * - Corners walked round: cut the loop into k runs of equal tile count from
 *   every start, add up each tile's distance to its run's chord
 *   (`web/circuit-classes/chord-fit.ts`), and see how much the start matters.
 * - Fitted polygons: put k corners on the loop anywhere and find the ones
 *   whose sides pass closest to it (least total squared distance of each
 *   sample to the side across its run) by dynamic programming, so sides can
 *   have any lengths and the polygon measured is the polygon drawn. A
 *   symmetric fit makes the loop's m turns share one set of corners.
 * - A score that only takes more corners when each one cuts the error by a
 *   set fraction.
 * - The Fourier series of the loop: an m-fold turn that maps tile i to tile
 *   i + L/m leaves only the harmonics f = 1 (mod m), so the share of the
 *   spectrum on those harmonics measures m-fold symmetry. Its terms, largest
 *   first, are the epicycles that redraw the loop.
 */

export interface Loop {
  /** x, y per sample, anticlockwise. */
  readonly xy: Float64Array;
  readonly n: number;
}

// ---------------------------------------------------------------- basics

export function centroid(loop: Loop): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (let i = 0; i < loop.n; i++) {
    x += loop.xy[2 * i];
    y += loop.xy[2 * i + 1];
  }
  return { x: x / loop.n, y: y / loop.n };
}

export function radiusOfGyration(loop: Loop): number {
  const c = centroid(loop);
  let s = 0;
  for (let i = 0; i < loop.n; i++) s += (loop.xy[2 * i] - c.x) ** 2 + (loop.xy[2 * i + 1] - c.y) ** 2;
  return Math.sqrt(s / loop.n);
}

/** n evenly spaced start samples (every sample if the loop is shorter). */
export function evenStarts(n: number, count: number): number[] {
  if (n <= count) return Array.from({ length: n }, (_, i) => i);
  return Array.from({ length: count }, (_, i) => Math.round((i * n) / count));
}

/** Corner samples for start s: s + round(j n / k). */
export function chordCorners(n: number, k: number, s: number): number[] {
  return Array.from({ length: k }, (_, j) => (s + Math.round((j * n) / k)) % n);
}

// ---------------------------------------------------------------- corners walked round

export interface ChordCurve {
  readonly k: number;
  readonly starts: readonly number[];
  /** Mean |distance| to the run's chord, over the radius of gyration, per start. */
  readonly unsigned: Float64Array;
  /** The same, signed (outside positive). */
  readonly signed: Float64Array;
  readonly best: number;
  readonly worst: number;
  /** (worst - best) / mean. */
  readonly contrast: number;
  /** Twice the amplitude of the curve's k-th harmonic over its mean: how much the start matters, from every start. */
  readonly swing: number;
}

export function chordCurve(loop: Loop, k: number, starts: readonly number[], rg: number): ChordCurve {
  const { xy, n } = loop;
  const u = new Float64Array(starts.length);
  const v = new Float64Array(starts.length);
  const scale = 1 / (n * rg);
  const c = new Int32Array(k);
  for (let q = 0; q < starts.length; q++) {
    const s = starts[q];
    for (let j = 0; j < k; j++) c[j] = (s + Math.round((j * n) / k)) % n;
    let su = 0;
    let sv = 0;
    for (let j = 0; j < k; j++) {
      const a = c[j];
      const b = c[(j + 1) % k];
      const ax = xy[2 * a];
      const ay = xy[2 * a + 1];
      const dx = xy[2 * b] - ax;
      const dy = xy[2 * b + 1] - ay;
      const len = Math.hypot(dx, dy);
      for (let i = a + 1 === n ? 0 : a + 1; i !== b; i = i + 1 === n ? 0 : i + 1) {
        const px = xy[2 * i] - ax;
        const py = xy[2 * i + 1] - ay;
        // Anticlockwise, so the inside is on the left: outside distance = -cross / len.
        const d = len > 0 ? -(dx * py - dy * px) / len : Math.hypot(px, py);
        su += d < 0 ? -d : d;
        sv += d;
      }
    }
    u[q] = su * scale;
    v[q] = sv * scale;
  }
  let best = 0;
  let worst = 0;
  let mean = 0;
  let re = 0;
  let im = 0;
  for (let q = 0; q < u.length; q++) {
    if (u[q] < u[best]) best = q;
    if (u[q] > u[worst]) worst = q;
    mean += u[q];
    const a = (-2 * Math.PI * k * starts[q]) / n;
    re += u[q] * Math.cos(a);
    im += u[q] * Math.sin(a);
  }
  mean /= u.length;
  const swing = mean > 0 ? (2 * Math.hypot(re, im)) / u.length / mean : 0;
  return { k, starts, unsigned: u, signed: v, best, worst, contrast: mean > 0 ? (u[worst] - u[best]) / mean : 0, swing };
}

// ---------------------------------------------------------------- fitted polygons

/**
 * Running sums over a sequence of point groups (each index holds `per`
 * points: one per turn when the loop is folded), so the squared distance of
 * any run of indices to any line comes in O(1).
 */
export class RunSums {
  readonly len: number;
  private readonly s: Float64Array;
  /** Each index's corner: the mean of its group. */
  readonly cx: Float64Array;
  readonly cy: Float64Array;

  constructor(
    /** x, y of `per` points at each index, index-major. */
    pts: Float64Array,
    readonly per: number,
  ) {
    this.len = pts.length / (2 * per);
    this.s = new Float64Array(5 * (this.len + 1));
    this.cx = new Float64Array(this.len);
    this.cy = new Float64Array(this.len);
    for (let i = 0; i < this.len; i++) {
      let x = 0;
      let y = 0;
      let xx = 0;
      let yy = 0;
      let xy = 0;
      for (let j = 0; j < per; j++) {
        const px = pts[2 * (i * per + j)];
        const py = pts[2 * (i * per + j) + 1];
        x += px;
        y += py;
        xx += px * px;
        yy += py * py;
        xy += px * py;
      }
      this.cx[i] = x / per;
      this.cy[i] = y / per;
      const o = 5 * i;
      this.s[o + 5] = this.s[o] + x;
      this.s[o + 6] = this.s[o + 1] + y;
      this.s[o + 7] = this.s[o + 2] + xx;
      this.s[o + 8] = this.s[o + 3] + yy;
      this.s[o + 9] = this.s[o + 4] + xy;
    }
  }

  /**
   * Sum of squared distances of the points at indices [a, b) to the side
   * from corner a to corner b (to corner a itself if they coincide).
   */
  cost(a: number, b: number): number {
    const s = this.s;
    const n = (b - a) * this.per;
    const A = 5 * a;
    const B = 5 * b;
    const ax = this.cx[a];
    const ay = this.cy[a];
    const sx = s[B] - s[A];
    const sy = s[B + 1] - s[A + 1];
    // Moments of the points about corner a.
    const xx = s[B + 2] - s[A + 2] - 2 * ax * sx + n * ax * ax;
    const yy = s[B + 3] - s[A + 3] - 2 * ay * sy + n * ay * ay;
    const xy = s[B + 4] - s[A + 4] - ax * sy - ay * sx + n * ax * ay;
    const dx = this.cx[b] - ax;
    const dy = this.cy[b] - ay;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return xx + yy;
    const c = (dy * dy * xx + dx * dx * yy - 2 * dx * dy * xy) / l2;
    return c > 0 ? c : 0;
  }
}

/**
 * Corners at indices of `sums` for a closed run [start, start + n): k sides
 * from corner start through k − 1 more corners and back to corner start + n
 * (the same corner one lap on), with the least total cost. Each side spans at
 * least `minRun` indices. Returns the cost and the corners, `start` first.
 */
export function cutRuns(sums: RunSums, start: number, n: number, k: number, minRun = 2): { cost: number; cuts: number[] } {
  if (k * minRun > n) return { cost: Infinity, cuts: [] };
  // f[t][j]: least cost of t sides from corner start to corner start + j.
  const f = new Float64Array((k + 1) * (n + 1)).fill(Infinity);
  const from = new Int32Array((k + 1) * (n + 1)).fill(-1);
  f[0] = 0;
  for (let t = 1; t <= k; t++) {
    const lo = t * minRun;
    const hi = n - (k - t) * minRun;
    const prev = (t - 1) * (n + 1);
    const row = t * (n + 1);
    for (let j = lo; j <= hi; j++) {
      if (t === k && j !== n) continue;
      let bestV = Infinity;
      let bestI = -1;
      for (let i = (t - 1) * minRun; i <= j - minRun; i++) {
        const p = f[prev + i];
        if (p === Infinity) continue;
        const v = p + sums.cost(start + i, start + j);
        if (v < bestV) {
          bestV = v;
          bestI = i;
        }
      }
      f[row + j] = bestV;
      from[row + j] = bestI;
    }
  }
  const cuts: number[] = [];
  let j = n;
  for (let t = k; t >= 1; t--) {
    const i = from[t * (n + 1) + j];
    cuts.push(start + i);
    j = i;
  }
  return { cost: f[k * (n + 1) + n], cuts: cuts.reverse() };
}

export interface PolygonFit {
  /** Sides. */
  readonly k: number;
  /** Turns sharing one set of corners (1 for a free fit). */
  readonly m: number;
  /** Sum of squared distances of the samples to their sides. */
  readonly cost: number;
  /** sqrt(cost / n) / rg. */
  readonly rms: number;
  /** The sample at each corner, in loop order; side j runs from corner j to corner j + 1. */
  readonly cuts: readonly number[];
  readonly corners: readonly { x: number; y: number }[];
  readonly sides: readonly number[];
}

/**
 * The k-gon with corners on the loop whose sides pass closest to it: each
 * sample's squared distance to the side across its run, summed, is least.
 * `step` decimates the loop first (every step-th sample).
 *
 * The corners of a closed loop are found by fixing one corner, solving the
 * rest exactly, then fixing each corner that solution chose in turn and
 * keeping the best; fixing a corner of the best polygon would be exact.
 */
export function fitPolygon(loop: Loop, k: number, rg: number, step = 1): PolygonFit {
  return fitSymmetric(loop, k, 1, rg, step);
}

/** Corners refixed after the first solve: enough to settle, few enough to stay quick at 24 sides. */
const RESTARTS = 8;

/**
 * The best k-gon whose m turns about the centroid share one set of corners
 * (k a multiple of m): fold the loop into its first n/m samples, each holding
 * the m samples a turn apart turned back to the first, and fit that. A
 * corner is the mean of its m turned-back samples.
 */
export function fitSymmetric(loop: Loop, k: number, m: number, rg: number, step = 1): PolygonFit {
  const { xy, n } = loop;
  if (k % m !== 0) throw new Error(`${k} sides cannot share corners across ${m} turns`);
  const c = centroid(loop);
  const idx = Array.from({ length: Math.floor(n / step) }, (_, i) => i * step);
  const nd = idx.length;
  if (nd % m !== 0) throw new Error(`${nd} samples do not split into ${m} equal turns`);
  const per = nd / m;
  const q = k / m;
  // Folded points, two laps so sides can wrap: index i holds the m samples i + j per, turned back by j / m.
  const pts = new Float64Array(2 * (2 * per + 1) * m);
  for (let i = 0; i <= 2 * per; i++) {
    for (let j = 0; j < m; j++) {
      const s = idx[(i + j * per) % nd];
      const a = (-2 * Math.PI * j) / m;
      const x = xy[2 * s] - c.x;
      const y = xy[2 * s + 1] - c.y;
      pts[2 * (i * m + j)] = x * Math.cos(a) - y * Math.sin(a);
      pts[2 * (i * m + j) + 1] = x * Math.sin(a) + y * Math.cos(a);
    }
  }
  const sums = new RunSums(pts, m);
  let best = cutRuns(sums, 0, per, q);
  // One corner per turn: every position is a single side, so try them all.
  if (q === 1)
    for (let s = 1; s < per; s++) {
      const cost = sums.cost(s, s + per);
      if (cost < best.cost) best = { cost, cuts: [s] };
    }
  const tried = new Set(q === 1 ? best.cuts : [0]);
  for (let round = 0; round < 2; round++) {
    let improved = false;
    const from = best.cuts.map((x) => x % per).filter((x) => !tried.has(x));
    const pick = from.length <= RESTARTS ? from : Array.from({ length: RESTARTS }, (_, i) => from[Math.floor((i * from.length) / RESTARTS)]);
    for (const s of pick) {
      tried.add(s);
      const r = cutRuns(sums, s, per, q);
      if (r.cost < best.cost - 1e-12 * Math.abs(best.cost)) {
        best = r;
        improved = true;
      }
    }
    if (!improved) break;
  }
  const corners: { x: number; y: number }[] = [];
  const cuts: number[] = [];
  for (let j = 0; j < m; j++) {
    const a = (2 * Math.PI * j) / m;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (const i of best.cuts) {
      const x = sums.cx[i];
      const y = sums.cy[i];
      corners.push({ x: c.x + x * ca - y * sa, y: c.y + x * sa + y * ca });
      cuts.push(idx[(i + j * per) % nd]);
    }
  }
  const sides = corners.map((p, t) => {
    const nx = corners[(t + 1) % k];
    return Math.hypot(nx.x - p.x, nx.y - p.y);
  });
  // The cost was over the decimated samples; scale it to all n.
  const cost = (best.cost * n) / nd;
  return { k, m, cost, rms: Math.sqrt(cost / n) / rg, cuts, corners, sides };
}

// ---------------------------------------------------------------- how many corners

/**
 * The corner count to keep: the one minimising ln rms(k) + k ln(1 / (1 - gain)).
 * Between any two counts, the larger wins only if every extra corner cuts the
 * error by at least `gain` on average: rms(k) < rms(j) (1 - gain)^(k - j).
 */
export function chooseCorners(rms: ReadonlyMap<number, number>, gain: number): number {
  const beta = -Math.log(1 - gain);
  // Errors below a millionth of the radius of gyration count as an exact fit.
  const floor = 1e-6;
  let bestK = -1;
  let bestS = Infinity;
  for (const [k, e] of [...rms].sort((a, b) => a[0] - b[0])) {
    const s = Math.log(Math.max(e, floor)) + beta * k;
    if (s < bestS - 1e-12) {
      bestS = s;
      bestK = k;
    }
  }
  return bestK;
}

// ---------------------------------------------------------------- Fourier

export interface Spectrum {
  readonly n: number;
  /** Harmonic f at index f mod n: re, im. z_j = c + sum_f c_f e^{2 pi i f j / n}. */
  readonly re: Float64Array;
  readonly im: Float64Array;
  readonly cx: number;
  readonly cy: number;
}

/** The discrete Fourier series of the loop about its centroid. */
export function spectrum(loop: Loop): Spectrum {
  const { xy, n } = loop;
  const c = centroid(loop);
  const cos = new Float64Array(n);
  const sin = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    cos[j] = Math.cos((2 * Math.PI * j) / n);
    sin[j] = Math.sin((2 * Math.PI * j) / n);
  }
  const zx = new Float64Array(n);
  const zy = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    zx[j] = xy[2 * j] - c.x;
    zy[j] = xy[2 * j + 1] - c.y;
  }
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let f = 0; f < n; f++) {
    let a = 0;
    let b = 0;
    let t = 0;
    for (let j = 0; j < n; j++) {
      // (zx + i zy)(cos - i sin) at angle 2 pi f j / n.
      a += zx[j] * cos[t] + zy[j] * sin[t];
      b += zy[j] * cos[t] - zx[j] * sin[t];
      t += f;
      if (t >= n) t -= n;
    }
    re[f] = a / n;
    im[f] = b / n;
  }
  return { n, re, im, cx: c.x, cy: c.y };
}

/** Harmonic f (any integer) of a spectrum. */
export function harmonic(s: Spectrum, f: number): { re: number; im: number } {
  const i = ((f % s.n) + s.n) % s.n;
  return { re: s.re[i], im: s.im[i] };
}

/** The signed harmonic of index i: i for i < n/2, i - n above. */
export function signedHarmonic(n: number, i: number): number {
  return i < n / 2 ? i : i - n;
}

/**
 * Share of the spectrum's energy on the harmonics f = 1 (mod m): 1 for an
 * m-fold turn that maps tile i to i + L/m. The circle (f = 1) sits on that
 * set for every m, so `beyondCircle` leaves it out of both sums and measures
 * only the shape's departure from a circle.
 */
export function symmetryShare(s: Spectrum, m: number, beyondCircle = false): number {
  let on = 0;
  let all = 0;
  for (let i = 0; i < s.n; i++) {
    const f = signedHarmonic(s.n, i);
    if (beyondCircle && f === 1) continue;
    const e = s.re[i] * s.re[i] + s.im[i] * s.im[i];
    all += e;
    if ((((f - 1) % m) + m) % m === 0) on += e;
  }
  return all > 0 ? on / all : 0;
}

export interface Epicycle {
  readonly f: number;
  readonly r: number;
  /** Phase at t = 0. */
  readonly phase: number;
}

/** The harmonics as epicycles, largest first. */
export function epicycles(s: Spectrum, count: number): Epicycle[] {
  const all: Epicycle[] = [];
  for (let i = 1; i < s.n; i++) {
    const r = Math.hypot(s.re[i], s.im[i]);
    if (r > 0) all.push({ f: signedHarmonic(s.n, i), r, phase: Math.atan2(s.im[i], s.re[i]) });
  }
  all.sort((a, b) => b.r - a.r || Math.abs(a.f) - Math.abs(b.f));
  return all.slice(0, count);
}

/** The point the epicycles reach at t in [0, 1), relative to the centroid. */
export function epicyclePoint(cycles: readonly Epicycle[], t: number): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const c of cycles) {
    const a = 2 * Math.PI * c.f * t + c.phase;
    x += c.r * Math.cos(a);
    y += c.r * Math.sin(a);
  }
  return { x, y };
}

/**
 * The sample step for a fit whose m turns share cuts: the smallest step that
 * leaves at most `target` samples and splits the loop into m equal turns of
 * whole steps, or null if no step does.
 */
export function decimation(n: number, m: number, target = 720): number | null {
  for (let step = Math.max(1, Math.ceil(n / target)); step * m <= n; step++) if (n % (step * m) === 0) return step;
  return null;
}
