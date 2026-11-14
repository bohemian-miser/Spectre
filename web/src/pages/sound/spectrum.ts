/**
 * A circuit's Fourier terms as sound: the Shapes page's terms (`terms` in
 * shapes/descriptor.ts: about the centroid, divided by the radius of
 * gyration, one sample per step), drawn as bars and played as additive
 * partials. Term k is harmonic |k| × f0 at amplitude |c_k|, panned left for
 * negative k and right for positive.
 */

import type { Pt } from '../../core';
import { terms, termAt } from '../shapes/descriptor';
import type { NoteEvent } from './score';

export const SCALINGS = ['linear', 'dB', 'fundamental scaled down'] as const;
export type Scaling = (typeof SCALINGS)[number];

/** dB shown and played below the largest bar; quieter terms sit at zero. */
export const DB_RANGE = 60;

export interface Bar {
  readonly k: number;
  /** |c_k|. */
  readonly amp: number;
}

/**
 * The terms k = -F..F (k = 0, the centroid, left out) of a closed path,
 * traced so that k = +1 is the larger of the two circle terms: the way round
 * a path is walked only swaps k and -k, so this puts every circuit's
 * circle on the right.
 */
export function circuitBars(points: readonly Pt[], F: number): Bar[] {
  const n = points.length;
  const xy = new Float64Array(2 * n);
  points.forEach((p, j) => {
    xy[2 * j] = p.x;
    xy[2 * j + 1] = p.y;
  });
  const t = terms({ xy, n }, F);
  const abs = (k: number): number => Math.hypot(termAt(t, k).re, termAt(t, k).im);
  const flip = abs(-1) > abs(1);
  const out: Bar[] = [];
  for (let k = -F; k <= F; k++) if (k !== 0) out.push({ k, amp: abs(flip ? -k : k) });
  return out;
}

/**
 * Bar heights 0..1 under a scaling: linear over the largest; dB over the
 * last `DB_RANGE` dB; or linear with the fundamental (k = +1) brought down
 * to the largest other term, so the rest can be seen and heard.
 */
export function scaled(bars: readonly Bar[], scaling: Scaling): number[] {
  const amps = bars.map((b) => b.amp);
  if (scaling === 'fundamental scaled down') {
    const others = Math.max(0, ...bars.filter((b) => b.k !== 1).map((b) => b.amp));
    bars.forEach((b, i) => {
      if (b.k === 1) amps[i] = Math.min(b.amp, others);
    });
  }
  const top = Math.max(1e-12, ...amps);
  if (scaling === 'dB') return amps.map((a) => (a <= 0 ? 0 : Math.max(0, 1 + (20 * Math.log10(a / top)) / DB_RANGE)));
  return amps.map((a) => a / top);
}

const ftom = (f: number): number => 69 + 12 * Math.log2(f / 440);

/** Partials above this are not played. */
const MAX_HZ = 18000;

/**
 * One sine per bar at `t`: term k at |k| × f0, its level the bar's height,
 * pan -0.6 for negative k and 0.6 for positive. Levels are shared out so
 * the sum stays near one voice's.
 */
export function partialEvents(bars: readonly Bar[], heights: readonly number[], f0: number, dur: number, t = 0): NoteEvent[] {
  const total = Math.sqrt(heights.reduce((s, h) => s + h * h, 0)) || 1;
  const out: NoteEvent[] = [];
  bars.forEach((b, i) => {
    const hz = Math.abs(b.k) * f0;
    if (heights[i] <= 0 || hz > MAX_HZ) return;
    out.push({
      kind: 'note',
      t,
      dur,
      midi: ftom(hz),
      gain: (0.5 * heights[i]) / total,
      pan: b.k < 0 ? -0.6 : 0.6,
      detune: 0,
      attack: 0.05,
      wave: 'sine',
      cutoff: 20000,
    });
  });
  return out;
}
