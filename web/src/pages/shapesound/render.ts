/**
 * The three shape-to-sound mappings of social/experiments/shapesound,
 * rendered to stereo sample buffers: `spectrum.spectrum` (Fourier terms as
 * partials), `mappings.radius` (distance from the centre as pitch) and
 * `mappings.corners_v2` (one note per fitted side). The pen trace
 * (`mappings.pen_trace`) renders on its own so it can be mixed in or left out.
 * Each clip is a lap with `PRE` seconds before it and `POST` after.
 */

import { fitCorners, pointAt, shapeTerms, termLevel, termRef, type Shape } from './shape';

export const PRE = 0.4;
export const POST = 0.8;
/** Spectrum: seconds for the terms to join, and when the pen starts. */
export const JOIN = 1.8;
export const SPECTRUM_LAP = 5;
export const PEN_START = PRE + JOIN + 0.2;
/** Partials above this are left out. */
const MAX_HZ = 18000;

export interface Clip {
  readonly sr: number;
  readonly left: Float32Array<ArrayBuffer>;
  readonly right: Float32Array<ArrayBuffer>;
  readonly seconds: number;
}

export interface SpectrumSettings {
  readonly f0: number;
  readonly terms: number;
  readonly pen: boolean;
  readonly penSpeed: number;
  readonly penLevel: number;
}
export interface RadiusSettings {
  readonly f0: number;
  /** Octaves per unit of radius. */
  readonly range: number;
  readonly lap: number;
}
export interface CornerSettings {
  /** Multiple of the default fit tolerance. */
  readonly tolerance: number;
  readonly root: number;
  readonly lap: number;
}

export const MAPPINGS = ['spectrum', 'radius', 'corners'] as const;
export type Mapping = (typeof MAPPINGS)[number];

export interface Settings {
  readonly spectrum: SpectrumSettings;
  readonly radius: RadiusSettings;
  readonly corners: CornerSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  spectrum: { f0: 131, terms: 24, pen: false, penSpeed: 7000, penLevel: 0.5 },
  radius: { f0: 220, range: 1.3, lap: 5 },
  corners: { tolerance: 1, root: 64, lap: 5 },
};

/** Reverb send each mapping had in the prototypes. */
export const REVERB: Record<Mapping, number> = { spectrum: 0.12, radius: 0.22, corners: 0.2 };

export function clipSeconds(m: Mapping, s: Settings): number {
  return PRE + (m === 'spectrum' ? SPECTRUM_LAP : s[m].lap) + POST;
}

// ---------------------------------------------------------------- helpers

/** Equal-power pan, -1 left .. 1 right (`mappings.stereo`). */
function panGains(pan: number): [number, number] {
  const th = ((pan + 1) * Math.PI) / 4;
  return [Math.cos(th), Math.sin(th)];
}

/** `mappings.envelope`: attack from `start`, release after `end`. */
function envelope(t: number, attack: number, release: number, start: number, end: number): number {
  return Math.max(0, Math.min(1, (t - start) / attack)) * Math.max(0, Math.min(1, 1 - (t - end) / release));
}

/** A second-order Butterworth section (bilinear transform), run in place. */
export function butter2(x: Float32Array | Float64Array, hz: number, sr: number, type: 'low' | 'high'): void {
  const w = Math.tan((Math.PI * Math.min(hz, 0.49 * sr)) / sr);
  const r = Math.SQRT2;
  const n = 1 / (1 + r * w + w * w);
  const b0 = type === 'low' ? w * w * n : n;
  const b1 = type === 'low' ? 2 * b0 : -2 * b0;
  const b2 = b0;
  const a1 = 2 * (w * w - 1) * n;
  const a2 = (1 - r * w + w * w) * n;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
}

/** Gaussian smoothing with edges held (`gaussian_filter1d`, mode nearest). */
function gauss(x: Float64Array, sigma: number): Float64Array {
  const s = Math.max(sigma, 1e-3);
  const r = Math.ceil(4 * s);
  const w = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-0.5 * ((i - r) / s) ** 2));
  const sum = w.reduce((a, b) => a + b, 0);
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let acc = 0;
    for (let j = -r; j <= r; j++) acc += w[j + r] * x[Math.max(0, Math.min(x.length - 1, i + j))];
    out[i] = acc / sum;
  }
  return out;
}

/** Central differences, one-sided at the ends (`np.gradient`). */
function gradient(x: Float64Array): Float64Array {
  const n = x.length;
  const out = new Float64Array(n);
  if (n < 2) return out;
  out[0] = x[1] - x[0];
  out[n - 1] = x[n - 1] - x[n - 2];
  for (let i = 1; i < n - 1; i++) out[i] = (x[i + 1] - x[i - 1]) / 2;
  return out;
}

/** Scale both channels so their mean square is `rms`². */
export function normalise(l: Float32Array, r: Float32Array, rms: number): void {
  let s = 0;
  for (let i = 0; i < l.length; i++) s += l[i] * l[i] + r[i] * r[i];
  const now = Math.sqrt(s / (2 * l.length));
  if (now < 1e-12) return;
  const g = rms / now;
  for (let i = 0; i < l.length; i++) {
    l[i] *= g;
    r[i] *= g;
  }
}

/** Seeded uniform noise in -1..1 (mulberry32), for the corner clicks. */
function noise(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

function blank(seconds: number, sr: number): Clip {
  const len = Math.ceil(seconds * sr);
  return { sr, seconds, left: new Float32Array(len), right: new Float32Array(len) };
}

/** Loudness every voice is brought to, RMS of the clip. */
export const VOICE_RMS = 0.1;

// ---------------------------------------------------------------- 1. spectrum

/** Seconds into the clip at which term k joins. */
export function joinedAt(k: number, K: number): number {
  return PRE + (JOIN * (Math.abs(k) - 1)) / Math.max(1, K - 1);
}

/**
 * `spectrum.spectrum` without its pen: term k is a sine at |k| × f0, panned
 * 0.7 left for k < 0 and right for k > 0, as loud as its bar, joining from
 * |k| = 1 to K over `JOIN` seconds, then held to the end of the lap.
 */
export function renderSpectrum(shape: Shape, s: SpectrumSettings, sr: number): Clip {
  const clip = blank(PRE + SPECTRUM_LAP + POST, sr);
  const ts = shapeTerms(shape, s.terms);
  const K = Math.max(...ts.map((t) => Math.abs(t.k)));
  const ref = termRef(ts);
  const { left, right } = clip;
  const len = left.length;
  for (const t of ts) {
    const a = termLevel(t.amp, ref);
    const hz = Math.abs(t.k) * s.f0;
    if (a <= 0 || hz > MAX_HZ) continue;
    const [gl, gr] = panGains(0.7 * Math.sign(t.k));
    const on = joinedAt(t.k, K);
    // A rotating phasor instead of a sine per sample.
    const w = (2 * Math.PI * hz) / sr;
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const ph = Math.atan2(t.im, t.re);
    let c = Math.cos(ph);
    let si = Math.sin(ph);
    for (let i = 0; i < len; i++) {
      const tt = i / sr;
      const e = Math.max(0, Math.min(1, (tt - on) / 0.03));
      if (e > 0) {
        const x = a * si * e;
        left[i] += x * gl;
        right[i] += x * gr;
      }
      const nc = c * cw - si * sw;
      si = si * cw + c * sw;
      c = nc;
      if ((i & 1023) === 0) {
        const m = 1 / Math.hypot(c, si);
        c *= m;
        si *= m;
      }
    }
  }
  for (let i = 0; i < len; i++) {
    const e = envelope(i / sr, 0.03, 0.5, PRE, PRE + SPECTRUM_LAP);
    left[i] *= e;
    right[i] *= e;
  }
  normalise(left, right, VOICE_RMS);
  return clip;
}

/**
 * `mappings.pen_trace`: a pen runs round the full loop from `PEN_START` at
 * `speed` steps a second; the sound is its velocity (x left, y right),
 * mixed 0.7 : 0.3 with its position, low-passed at 9 kHz and high-passed at
 * 60 Hz. Same length as the spectrum clip.
 */
export function renderPen(shape: Shape, speed: number, sr: number): Clip {
  const clip = blank(PRE + SPECTRUM_LAP + POST, sr);
  const len = clip.left.length;
  const i0 = Math.ceil(PEN_START * sr);
  const m = len - i0;
  const zx = new Float64Array(m);
  const zy = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const [x, y] = pointAt(shape.full, shape.steps, (speed * (i / sr)) / shape.steps);
    zx[i] = x;
    zy[i] = y;
  }
  const vx = gradient(zx).map((v) => (v * sr) / speed);
  const vy = gradient(zy).map((v) => (v * sr) / speed);
  butter2(vx, 9000, sr, 'low');
  butter2(vy, 9000, sr, 'low');
  let mx = 0;
  let my = 0;
  for (let i = 0; i < m; i++) {
    mx += zx[i];
    my += zy[i];
  }
  mx /= m || 1;
  my /= m || 1;
  let sv = 0;
  let sz = 0;
  for (let i = 0; i < m; i++) {
    sv += vx[i] ** 2 + vy[i] ** 2;
    sz += (zx[i] - mx) ** 2 + (zy[i] - my) ** 2;
  }
  const rv = Math.sqrt(sv / (2 * m)) + 1e-9;
  const rz = Math.sqrt(sz / (2 * m)) + 1e-9;
  const yl = new Float64Array(m);
  const yr = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    yl[i] = (0.7 * vx[i]) / rv + (0.3 * (zx[i] - mx)) / rz;
    yr[i] = (0.7 * vy[i]) / rv + (0.3 * (zy[i] - my)) / rz;
  }
  butter2(yl, 60, sr, 'high');
  butter2(yr, 60, sr, 'high');
  for (let i = 0; i < m; i++) {
    const e = envelope((i0 + i) / sr, 0.1, 0.5, PEN_START, PRE + SPECTRUM_LAP);
    clip.left[i0 + i] = yl[i] * e;
    clip.right[i0 + i] = yr[i] * e;
  }
  normalise(clip.left, clip.right, VOICE_RMS);
  return clip;
}

// ---------------------------------------------------------------- 2. radius

/** Head track and pitch rate for the radius mapping. */
const CONTROL_HZ = 1000;

/**
 * `mappings.radius`: the head's distance r from the centroid (radius of
 * gyration 1) is the pitch, f0 × 2^(range (r - 1)); its bearing is the pan;
 * how fast the path turns at the head brightens the tone with harmonics 2, 3
 * and 5.
 */
export function renderRadius(shape: Shape, s: RadiusSettings, sr: number): Clip {
  const T = PRE + s.lap + POST;
  const clip = blank(T, sr);
  const nc = Math.ceil(T * CONTROL_HZ) + 1;
  const lapPos = (t: number): number => Math.max(0, Math.min(1, (t - PRE) / s.lap));
  let px: Float64Array = new Float64Array(nc);
  let py: Float64Array = new Float64Array(nc);
  for (let i = 0; i < nc; i++) {
    const [x, y] = pointAt(shape.p, shape.n, lapPos(i / CONTROL_HZ));
    px[i] = x;
    py[i] = y;
  }
  // Smoothed over 0.6 of a thinned point.
  const sig = (0.6 / shape.n) * s.lap * CONTROL_HZ;
  px = gauss(px, sig);
  py = gauss(py, sig);
  const vx = gradient(px);
  const vy = gradient(py);
  const ang = new Float64Array(nc);
  for (let i = 0; i < nc; i++) {
    let a = Math.atan2(vy[i], vx[i] + 1e-12);
    if (i > 0) {
      while (a - ang[i - 1] > Math.PI) a -= 2 * Math.PI;
      while (a - ang[i - 1] < -Math.PI) a += 2 * Math.PI;
    }
    ang[i] = a;
  }
  // Radians per thinned point.
  const turn = gradient(ang).map((v) => Math.min(3, Math.abs(v) * ((s.lap * CONTROL_HZ) / shape.n)));
  const bright = gauss(turn, 0.02 * CONTROL_HZ).map((v) => Math.min(1, v / 1.2));
  const freq = new Float64Array(nc);
  const pan = new Float64Array(nc);
  for (let i = 0; i < nc; i++) {
    freq[i] = s.f0 * 2 ** (s.range * (Math.hypot(px[i], py[i]) - 1));
    pan[i] = 0.7 * Math.cos(Math.atan2(py[i], px[i]));
  }
  const at = (arr: Float64Array, t: number): number => {
    const x = Math.min(nc - 1, t * CONTROL_HZ);
    const i = Math.floor(x);
    const f = x - i;
    return i + 1 < nc ? arr[i] * (1 - f) + arr[i + 1] * f : arr[i];
  };
  let ph = 0;
  const { left, right } = clip;
  for (let i = 0; i < left.length; i++) {
    const t = i / sr;
    const f = at(freq, t) * (1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * t) * Math.max(0, Math.min(1, (t - PRE) / 1)));
    ph += f / sr;
    const b = at(bright, t);
    const w = 2 * Math.PI * ph;
    const x =
      (Math.sin(w) + (0.25 + 0.5 * b) * Math.sin(2 * w) + 0.35 * b * Math.sin(3 * w) + 0.2 * b * Math.sin(5 * w)) *
      envelope(t, 0.08, 0.5, PRE, PRE + s.lap);
    const [gl, gr] = panGains(at(pan, t));
    left[i] = x * gl;
    right[i] = x * gr;
  }
  normalise(left, right, VOICE_RMS);
  return clip;
}

// ---------------------------------------------------------------- 3. corners

const PENTA_DOWN = [0, 3, 5, 8, 10];

export interface Side {
  /** Clip seconds the side starts and lasts. */
  readonly start: number;
  readonly dur: number;
  readonly midi: number;
  /** 0 (shallow) .. 1 (turn of 120° or more). */
  readonly sharp: number;
  readonly pan: number;
}

/**
 * `mappings.corners_v2`'s notes: a side per pair of neighbouring corners,
 * sounding while the head runs along it. A side one tile long plays two
 * octaves above the root; each doubling of its length is one octave lower,
 * in pentatonic steps. The turn into it sets how sharp its attack is.
 */
export function cornerSides(shape: Shape, cuts: readonly number[], s: CornerSettings): Side[] {
  const n = shape.steps;
  const k = cuts.length;
  const C = (j: number): [number, number] => {
    const i = cuts[((j % k) + k) % k];
    return [shape.full[2 * i], shape.full[2 * i + 1]];
  };
  const out: Side[] = [];
  for (let j = 0; j < k; j++) {
    const a0 = cuts[j];
    const a1 = cuts[(j + 1) % k];
    const span = ((((a1 - a0) % n) + n) % n) || n;
    const [x0, y0] = C(j);
    const [x1, y1] = C(j + 1);
    const [xp, yp] = C(j - 1);
    const h = Math.atan2(y1 - y0, x1 - x0);
    const length = Math.max(Math.hypot(x1 - x0, y1 - y0) / shape.tile, 0.5);
    const deg = Math.round(((12 * Math.log2(length)) / 12) * 5);
    const midi = s.root + 24 - 12 * Math.floor(deg / 5) - PENTA_DOWN[((deg % 5) + 5) % 5];
    const d = h - Math.atan2(y0 - yp, x0 - xp) + Math.PI;
    const turn = Math.abs((((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI);
    out.push({
      start: PRE + (s.lap * a0) / n,
      dur: (s.lap * span) / n,
      midi,
      sharp: Math.max(0, Math.min(1, turn / ((120 * Math.PI) / 180))),
      pan: 0.5 * Math.cos(h),
    });
  }
  return out;
}

/**
 * Each side an FM note (modulator at twice the note, index 0.3 + 4 × sharp)
 * with a sub-octave, its attack quick for a sharp corner and slow for a
 * shallow one, and a click as loud as the corner is sharp.
 */
export function renderCorners(shape: Shape, s: CornerSettings, sr: number): Clip {
  const clip = blank(PRE + s.lap + POST, sr);
  const { cuts } = fitCorners(shape, s.tolerance);
  const sides = cornerSides(shape, cuts, s);
  const rnd = noise(3);
  const { left, right } = clip;
  const len = left.length;
  for (const sd of sides) {
    const hold = Math.max(sd.dur, 0.03);
    const m = Math.floor((hold + 0.25) * sr);
    const f = 440 * 2 ** ((sd.midi - 69) / 12);
    const att = Math.min(0.002 + 0.1 * (1 - sd.sharp) ** 2, 0.4 * hold);
    const idx = 0.3 + 4 * sd.sharp;
    const modDecay = 0.03 + 0.3 * (1 - sd.sharp);
    const click = new Float64Array(Math.min(m, Math.ceil(0.03 * sr)));
    if (sd.sharp > 0) {
      for (let i = 0; i < click.length; i++) click[i] = rnd() * Math.sqrt(3) * Math.exp(-i / sr / 0.003) * sd.sharp ** 2 * 0.6;
      butter2(click, 2500, sr, 'high');
    }
    const [gl, gr] = panGains(sd.pan);
    const i0 = Math.floor(sd.start * sr);
    for (let i = 0; i < m && i0 + i < len; i++) {
      const tt = i / sr;
      let env = Math.min(1, tt / att) * Math.exp(-tt / (0.08 + hold));
      env *= Math.max(0, Math.min(1, (hold + 0.06 - tt) / 0.06));
      const mod = Math.sin(2 * Math.PI * 2 * f * tt) * idx * Math.exp(-tt / modDecay);
      let x = (Math.sin(2 * Math.PI * f * tt + mod) + 0.3 * Math.sin(Math.PI * f * tt)) * env;
      if (i < click.length) x += click[i];
      left[i0 + i] += x * gl;
      right[i0 + i] += x * gr;
    }
  }
  normalise(left, right, VOICE_RMS);
  return clip;
}

export function render(shape: Shape, m: Mapping, s: Settings, sr: number): Clip {
  if (m === 'spectrum') return renderSpectrum(shape, s.spectrum, sr);
  if (m === 'radius') return renderRadius(shape, s.radius, sr);
  return renderCorners(shape, s.corners, sr);
}

