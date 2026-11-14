/**
 * Any strand of the loaded tiles, found from a click: the circuit it belongs
 * to when it closes inside them, else the open strand from the clicked
 * chord onward to where it leaves the loaded tiles.
 */

import type { Pt, ViewportCut } from '../../core';
import { forEachChord, type FindTable } from '../map/findPass';
import { LOOP_WELD_EPSILON } from '../map/loopTrace';
import type { ReelCircuit } from '../reel/circuits';

export interface Strand {
  /** `c<id>` for a circuit, `o<tile>.<chord>` for an open strand (its first chord). */
  readonly key: string;
  readonly circuit: ReelCircuit | null;
  readonly closed: boolean;
  /** Closed: one point per step, the first not repeated. Open: one more point than steps. */
  readonly points: readonly Pt[];
  /** Cut instance and chord index of each step (`ReelCircuit.tiles`, `.chords`). */
  readonly tiles: Int32Array;
  readonly chords: Int32Array;
  readonly centre: Pt;
  readonly min: Pt;
  readonly max: Pt;
}

export function circuitStrand(c: ReelCircuit): Strand {
  return { key: `c${c.id}`, circuit: c, closed: true, points: c.points, tiles: c.tiles, chords: c.chords, centre: c.centre, min: c.min, max: c.max };
}

/** Steps an open strand is followed for at most. */
const MAX_STEPS = 50_000;
/** Grid cell for finding chords near a click, world units (longer than any chord). */
const CELL = 3;

function segmentDistance(q: Pt, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const u = Math.max(0, Math.min(1, ((q.x - ax) * dx + (q.y - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(q.x - ax - u * dx, q.y - ay - u * dy);
}

export function strandFinder(cut: ViewportCut, table: FindTable, circuits: readonly ReelCircuit[]): (q: Pt, tol: number) => Strand | null {
  const xy: number[] = [];
  const tileOf: number[] = [];
  const chordOf: number[] = [];
  forEachChord(cut, table, (i, s, ax, ay, bx, by) => {
    xy.push(ax, ay, bx, by);
    tileOf.push(i);
    chordOf.push(s);
  });
  const count = tileOf.length;

  // Weld ends into nodes, as the circuit tracer does.
  const nodeX: number[] = [];
  const nodeY: number[] = [];
  const cells = new Map<string, number[]>();
  const e2 = LOOP_WELD_EPSILON * LOOP_WELD_EPSILON;
  const nodeAt = (x: number, y: number): number => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    for (let cx = ix - 1; cx <= ix + 1; cx++) {
      for (let cy = iy - 1; cy <= iy + 1; cy++) {
        for (const n of cells.get(`${cx},${cy}`) ?? []) if ((nodeX[n] - x) ** 2 + (nodeY[n] - y) ** 2 < e2) return n;
      }
    }
    nodeX.push(x);
    nodeY.push(y);
    const key = `${ix},${iy}`;
    const l = cells.get(key);
    if (l) l.push(nodeX.length - 1);
    else cells.set(key, [nodeX.length - 1]);
    return nodeX.length - 1;
  };
  const ends = new Int32Array(2 * count);
  const incident = new Map<number, number[]>();
  for (let s = 0; s < count; s++) {
    for (let e = 0; e < 2; e++) {
      const n = nodeAt(xy[4 * s + 2 * e], xy[4 * s + 2 * e + 1]);
      ends[2 * s + e] = n;
      const l = incident.get(n);
      if (l) l.push(s);
      else incident.set(n, [s]);
    }
  }

  const near = new Map<string, number[]>();
  for (let s = 0; s < count; s++) {
    const key = `${Math.floor((xy[4 * s] + xy[4 * s + 2]) / 2 / CELL)},${Math.floor((xy[4 * s + 1] + xy[4 * s + 3]) / 2 / CELL)}`;
    const l = near.get(key);
    if (l) l.push(s);
    else near.set(key, [s]);
  }
  const circuitOf = new Map<number, ReelCircuit>();
  for (const c of circuits) for (let k = 0; k < c.tiles.length; k++) circuitOf.set(c.tiles[k] * 64 + c.chords[k], c);

  return (q, tol) => {
    let best = -1;
    let bestD = tol;
    const gx = Math.floor(q.x / CELL);
    const gy = Math.floor(q.y / CELL);
    for (let cx = gx - 1; cx <= gx + 1; cx++) {
      for (let cy = gy - 1; cy <= gy + 1; cy++) {
        for (const s of near.get(`${cx},${cy}`) ?? []) {
          const d = segmentDistance(q, xy[4 * s], xy[4 * s + 1], xy[4 * s + 2], xy[4 * s + 3]);
          if (d < bestD) {
            bestD = d;
            best = s;
          }
        }
      }
    }
    if (best < 0) return null;
    const circuit = circuitOf.get(tileOf[best] * 64 + chordOf[best]);
    if (circuit) return circuitStrand(circuit);

    // Open: from the clicked chord onward until the strand ends or meets a junction.
    const segs = [best];
    const nodes = [ends[2 * best], ends[2 * best + 1]];
    let at = ends[2 * best + 1];
    let via = best;
    while (segs.length < MAX_STEPS) {
      const inc = incident.get(at) ?? [];
      if (inc.length !== 2) break;
      const next = inc[0] === via ? inc[1] : inc[0];
      at = ends[2 * next] === at ? ends[2 * next + 1] : ends[2 * next];
      via = next;
      segs.push(next);
      nodes.push(at);
      if (at === nodes[0]) break;
    }
    const points = nodes.map((n) => ({ x: nodeX[n], y: nodeY[n] }));
    let sx = 0;
    let sy = 0;
    const min = { x: Infinity, y: Infinity };
    const max = { x: -Infinity, y: -Infinity };
    for (const p of points) {
      sx += p.x;
      sy += p.y;
      min.x = Math.min(min.x, p.x);
      min.y = Math.min(min.y, p.y);
      max.x = Math.max(max.x, p.x);
      max.y = Math.max(max.y, p.y);
    }
    return {
      key: `o${tileOf[best]}.${chordOf[best]}`,
      circuit: null,
      closed: false,
      points,
      tiles: Int32Array.from(segs, (s) => tileOf[s]),
      chords: Int32Array.from(segs, (s) => chordOf[s]),
      centre: { x: sx / points.length, y: sy / points.length },
      min,
      max,
    };
  };
}
