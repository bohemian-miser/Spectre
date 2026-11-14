/**
 * The closed circuits of one cut, each with the tiles it crosses and a key
 * that two circuits share exactly when they are congruent.
 *
 * Congruence is checked on the circuit's polygon (its chord ends in order):
 * a closed polygon is fixed up to a rigid motion by its cyclic sequence of
 * (edge length, turn at the edge's start), so the key is the least rotation
 * of that sequence over both directions of travel and both mirror images.
 * Lengths are rounded to 0.01 world units and turns to whole degrees.
 */

import type { Pt } from '../../core';
import { forEachChord, type FindCut, type FindTable } from '../map/findPass';
import { traceLoops } from '../map/loopTrace';

export interface ReelCircuit {
  readonly id: number;
  /** Chord ends in order; the first is not repeated at the end. */
  readonly points: readonly Pt[];
  /** Cut instance of the tile crossed from `points[k]` to `points[k + 1]`. */
  readonly tiles: Int32Array;
  readonly centre: Pt;
  readonly min: Pt;
  readonly max: Pt;
  /** Congruence key (see the module note). */
  readonly shape: string;
}

function tokens(points: readonly Pt[]): number[] {
  const n = points.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const a = points[(i + n - 1) % n];
    const b = points[i];
    const c = points[(i + 1) % n];
    const len = Math.hypot(c.x - b.x, c.y - b.y);
    let turn = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
    while (turn > Math.PI) turn -= 2 * Math.PI;
    while (turn <= -Math.PI) turn += 2 * Math.PI;
    out[i] = Math.round(len * 100) * 1000 + Math.round((turn * 180) / Math.PI) + 360;
  }
  return out;
}

/** -1, 0 or 1 as rotation `i` of `s` sorts before, with or after rotation `j` of `t`. */
function compareRotations(s: readonly number[], i: number, t: readonly number[], j: number): number {
  const n = s.length;
  for (let k = 0; k < n; k++) {
    const d = s[(i + k) % n] - t[(j + k) % n];
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function shapeKey(points: readonly Pt[]): string {
  const reversed = [...points].reverse();
  const variants = [points, reversed, points.map((p) => ({ x: -p.x, y: p.y })), reversed.map((p) => ({ x: -p.x, y: p.y }))].map(tokens);
  let best = variants[0];
  let bestAt = 0;
  for (const v of variants) {
    for (let i = 0; i < v.length; i++) {
      if (compareRotations(v, i, best, bestAt) < 0) {
        best = v;
        bestAt = i;
      }
    }
  }
  const n = best.length;
  const out = new Array<number>(n);
  for (let k = 0; k < n; k++) out[k] = best[(bestAt + k) % n];
  return `${n}:${out.join(',')}`;
}

/** Every closed circuit among the cut's chords. */
export function cutCircuits(cut: FindCut, table: FindTable): ReelCircuit[] {
  let cap = 0;
  for (let i = 0; i < cut.count; i++) cap += table.segments[cut.type[i]]?.length ?? 0;
  const xy = new Float64Array(4 * cap);
  const tileOf = new Int32Array(cap);
  let count = 0;
  forEachChord(cut, table, (i, _s, ax, ay, bx, by) => {
    tileOf[count] = i;
    const o = 4 * count++;
    xy[o] = ax;
    xy[o + 1] = ay;
    xy[o + 2] = bx;
    xy[o + 3] = by;
  });
  const out: ReelCircuit[] = [];
  for (const loop of traceLoops(xy, count)) {
    const points = loop.points;
    if (points.length < 3) continue;
    const tiles = new Int32Array(points.length);
    let sx = 0;
    let sy = 0;
    const min = { x: Infinity, y: Infinity };
    const max = { x: -Infinity, y: -Infinity };
    points.forEach((p, k) => {
      tiles[k] = tileOf[loop.segs[k]];
      sx += p.x;
      sy += p.y;
      min.x = Math.min(min.x, p.x);
      min.y = Math.min(min.y, p.y);
      max.x = Math.max(max.x, p.x);
      max.y = Math.max(max.y, p.y);
    });
    out.push({
      id: out.length,
      points,
      tiles,
      centre: { x: sx / points.length, y: sy / points.length },
      min,
      max,
      shape: shapeKey(points),
    });
  }
  return out;
}
