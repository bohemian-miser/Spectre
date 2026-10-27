/**
 * How well a circuit fits a k-gon whose corners are tiles of the circuit.
 *
 * Cut a circuit of L tiles into k runs of (nearly) equal tile count, starting
 * at tile `s`; the k cut tiles are the corners. For every tile of a run, take
 * its distance to the line through the run's two corners and add it up, both
 * unsigned and signed (positive on the outside of the circuit, negative on the
 * inside). Doing this for every start s walks the corners round the circuit
 * tile by tile. Comparing the best start for k = 3 with the best for k = 6
 * says how much a hexagon explains that a triangle does not.
 *
 * A tile's position is the midpoint of the strand's chord through it (the
 * midpoint of the two edge crossings). Distances are reported as the mean per
 * tile over the circuit's radius of gyration, so circuits of different sizes,
 * and the reference triangle, hexagon and circle, share one scale.
 *
 * Usage: tsx chord-fit.ts <family> <rule> <combo> <level> <out.json> [starts]
 *   fits the biggest circuit of each family born at <level> (and the
 *   reference shapes) for k = 3, 5, 6, at `starts` evenly spaced start tiles
 *   (default 1200, or every tile if the circuit is shorter).
 */
import { writeFileSync } from 'node:fs';
import type { Pt, TileFamilyId } from '../src/core';
import { CircuitShapes, type BornCircuit } from './circuit-shapes';

export interface ChordFit {
  readonly k: number;
  /** Start tiles. */
  readonly starts: readonly number[];
  /** Sum over all tiles of |distance to its run's chord|, per start. */
  readonly unsigned: readonly number[];
  /** The same sum, signed (outside positive). */
  readonly signed: readonly number[];
}

/** Tile positions of a closed polyline of edge crossings: chord midpoints, turned anticlockwise. */
export function tilePositions(crossings: readonly Pt[]): Pt[] {
  const n = crossings.length;
  const out = crossings.map((p, i) => {
    const q = crossings[(i + 1) % n];
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  });
  return signedArea(out) < 0 ? out.reverse() : out;
}

export function signedArea(p: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i].x * q.y - q.x * p[i].y;
  }
  return a / 2;
}

export function radiusOfGyration(p: readonly Pt[]): number {
  let cx = 0;
  let cy = 0;
  for (const q of p) {
    cx += q.x;
    cy += q.y;
  }
  cx /= p.length;
  cy /= p.length;
  let s = 0;
  for (const q of p) s += (q.x - cx) ** 2 + (q.y - cy) ** 2;
  return Math.sqrt(s / p.length);
}

/** Corner tiles for start s: s + round(j L / k). */
export function corners(L: number, k: number, s: number): number[] {
  return Array.from({ length: k }, (_, j) => (s + Math.round((j * L) / k)) % L);
}

/**
 * Per run (corner j to corner j + 1, the tiles strictly between them), the
 * unsigned and signed sums of distance to the chord. `p` must be anticlockwise.
 */
export function runSums(p: readonly Pt[], k: number, s: number): { unsigned: number[]; signed: number[] } {
  const L = p.length;
  const c = corners(L, k, s);
  const unsigned: number[] = [];
  const signed: number[] = [];
  for (let j = 0; j < k; j++) {
    const a = p[c[j]];
    const b = p[c[(j + 1) % k]];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    let u = 0;
    let v = 0;
    const end = c[(j + 1) % k];
    for (let i = (c[j] + 1) % L; i !== end; i = (i + 1) % L) {
      // Anticlockwise, so the inside is on the left: outside distance = -cross / len.
      const d = len > 0 ? -(dx * (p[i].y - a.y) - dy * (p[i].x - a.x)) / len : Math.hypot(p[i].x - a.x, p[i].y - a.y);
      u += Math.abs(d);
      v += d;
    }
    unsigned.push(u);
    signed.push(v);
  }
  return { unsigned, signed };
}

export function chordFit(p: readonly Pt[], k: number, starts: readonly number[]): ChordFit {
  const unsigned: number[] = [];
  const signed: number[] = [];
  for (const s of starts) {
    const r = runSums(p, k, s);
    unsigned.push(r.unsigned.reduce((x, y) => x + y, 0));
    signed.push(r.signed.reduce((x, y) => x + y, 0));
  }
  return { k, starts, unsigned, signed };
}

/** A regular polygon with `sides` sides traced by L evenly spaced points, anticlockwise; sides 0 is a circle. */
export function referenceShape(sides: number, L: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < L; i++) {
    const t = i / L;
    if (sides === 0) {
      out.push({ x: Math.cos(2 * Math.PI * t), y: Math.sin(2 * Math.PI * t) });
      continue;
    }
    const side = Math.floor(t * sides);
    const f = t * sides - side;
    const a = (2 * Math.PI * side) / sides;
    const b = (2 * Math.PI * (side + 1)) / sides;
    out.push({ x: Math.cos(a) * (1 - f) + Math.cos(b) * f, y: Math.sin(a) * (1 - f) + Math.sin(b) * f });
  }
  return out;
}

const KS = [3, 5, 6];

function evenStarts(L: number, n: number): number[] {
  if (L <= n) return Array.from({ length: L }, (_, i) => i);
  return Array.from({ length: n }, (_, i) => Math.round((i * L) / n));
}

function fitAll(name: string, p: readonly Pt[], nStarts: number) {
  const L = p.length;
  const rg = radiusOfGyration(p);
  const starts = evenStarts(L, nStarts);
  const scale = 1 / (L * rg);
  const fits = KS.map((k) => {
    const f = chordFit(p, k, starts);
    const u = f.unsigned.map((x) => x * scale);
    const v = f.signed.map((x) => x * scale);
    let best = 0;
    for (let i = 1; i < u.length; i++) if (u[i] < u[best]) best = i;
    const runs = runSums(p, k, starts[best]);
    return {
      k,
      unsigned: u,
      signed: v,
      best: { start: starts[best], unsigned: u[best], signed: v[best], corners: corners(L, k, starts[best]) },
      bestRuns: { unsigned: runs.unsigned.map((x) => x / (rg * L)), signed: runs.signed.map((x) => x / (rg * L)) },
      mean: u.reduce((x, y) => x + y, 0) / u.length,
      worst: Math.max(...u),
    };
  });
  // An outline of at most 3000 points for drawing, plus the corners' positions.
  const step = Math.max(1, Math.ceil(L / 3000));
  const outline: number[] = [];
  for (let i = 0; i < L; i += step) outline.push(+p[i].x.toFixed(3), +p[i].y.toFixed(3));
  const cornerPts = fits.map((f) => f.best.corners.flatMap((i) => [+p[i].x.toFixed(3), +p[i].y.toFixed(3)]));
  console.error(`${name}: L ${L}, Rg ${rg.toFixed(1)}, best ${fits.map((f) => `k${f.k} ${f.best.unsigned.toFixed(4)}`).join(', ')}`);
  return { name, length: L, rg, starts, fits, outline, cornerPts };
}

if (process.argv[1]?.endsWith('chord-fit.ts')) {
  const [family, rule, combo, levelArg, outFile, startsArg] = process.argv.slice(2);
  const level = Number(levelArg);
  const nStarts = Number(startsArg ?? 1200);
  const cs = new CircuitShapes(family as TileFamilyId, [...rule].map(Number), [...combo].map((ch) => parseInt(ch, 36)), level, 1000);
  // The biggest circuit of each family (set of child slots) born at this level, as on the Circuits page.
  const best = new Map<string, BornCircuit>();
  for (const c of cs.born) {
    if (c.level !== level) continue;
    const key = [...new Set(c.slots)].sort((x, y) => x - y).join('');
    const m = best.get(key);
    if (!m || c.length > m.length || (c.length === m.length && c.type === 'Delta' && m.type !== 'Delta')) best.set(key, c);
  }
  const picks = [...best].sort((a, b) => b[1].length - a[1].length).slice(0, 4);
  const circuits = picks.map(([slots, c]) => fitAll(`family [${slots}], ${c.type}`, tilePositions(cs.shape(c, 0)), nStarts));
  const L = circuits[0]?.length ?? 6000;
  const n = Math.min(L, 6000);
  const references = [
    fitAll('triangle', referenceShape(3, n), nStarts),
    fitAll('hexagon', referenceShape(6, n), nStarts),
    fitAll('circle', referenceShape(0, n), nStarts),
  ];
  writeFileSync(outFile, JSON.stringify({ family, rule, combo, level, ks: KS, circuits, references }));
  console.error(`wrote ${outFile}`);
}
