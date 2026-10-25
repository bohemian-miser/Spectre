/**
 * One find-all pass over a display cut: lay every chord, leave out the ones
 * on circuits found already, weld and trace the rest, and hand back each new
 * circuit as drawable geometry.
 *
 * Pure, and holding its own memory of what it has found, so it runs the same
 * in the find worker (where a big cut costs the main thread nothing) and
 * inline (tests, or no workers). Colour is left to the caller, whose palette
 * ranks lengths as they are first seen.
 *
 * Circuits are named by an id the pass hands out. The caller says which ones
 * it still holds (`keep`) whenever that is no longer simply everything the
 * pass has handed it, so a circuit the caller let go can be found again.
 */

import { COS30, SIN30, isAggregateType, type Pt, type Segment, type StrandCurve } from '../../core';
import type { LeafChordTable } from './chords';
import { FoundIndex } from './foundIndex';
import { traceLoops } from './loopTrace';
import { curveRun, packRun } from './strandWalk';

/** What a pass needs of a chord table, as plain data a worker can be sent. */
export interface FindTable {
  readonly segments: readonly (readonly Segment[])[];
  readonly controls?: readonly (readonly (StrandCurve | undefined)[] | undefined)[];
  /** Per leaf type, per segment: true for a link that does not count towards length. */
  readonly aux?: readonly (readonly boolean[])[];
}

export function findTableOf(table: LeafChordTable): FindTable {
  const aux = table.aux;
  return {
    segments: table.segments,
    controls: table.controls,
    aux: aux ? table.segments.map((row) => row.map((s) => aux.has(s))) : undefined,
  };
}

/** The parts of a viewport cut a pass reads. */
export interface FindCut {
  readonly count: number;
  readonly origin: Pt;
  readonly pos: Float32Array;
  readonly code: Uint8Array;
  readonly type: Uint8Array;
}

export interface FoundLoop {
  readonly id: number;
  /** Tiles crossed (aux links not counted). */
  readonly tileLength: number;
  readonly origin: Pt;
  readonly xy: Float32Array;
  readonly arc: Float32Array;
  readonly pointCount: number;
  readonly totalLength: number;
}

export interface FindPassResult {
  /** Circuits not found before. */
  readonly fresh: readonly FoundLoop[];
  /** Ids of circuits found before that this cut holds whole. */
  readonly seenWhole: readonly number[];
}

export class FindPassState {
  private index = new FoundIndex<number>();
  /** Each circuit's chord midpoints (world x, y pairs), by id. */
  private readonly mids = new Map<number, Float64Array>();
  private nextId = 1;

  /** Remember only these circuits; every other one may be found again. */
  keep(ids: readonly number[]): void {
    const keep = new Set(ids);
    for (const id of [...this.mids.keys()]) if (!keep.has(id)) this.mids.delete(id);
    this.index = new FoundIndex<number>();
    for (const [id, m] of this.mids) this.index.add(id, m);
  }

  pass(cut: FindCut, table: FindTable): FindPassResult {
    const known = this.index;
    const knownSeen = new Int32Array(known.circuits);
    // Flat arrays, four doubles a chord: a big cut is hundreds of thousands
    // of them, and objects per end were a real share of a pass.
    let cap = 0;
    for (let i = 0; i < cut.count; i++) cap += table.segments[cut.type[i]]?.length ?? 0;
    const xy = new Float64Array(4 * cap);
    const aux = table.aux ? new Uint8Array(cap) : null;
    // Curved strands: each chord's world curve handles, by segment index.
    const ctrls: StrandCurve[] = [];
    let count = 0;
    for (let i = 0; i < cut.count; i++) {
      const tb = cut.type[i];
      if (isAggregateType(tb)) continue;
      const local = table.segments[tb];
      if (!local || local.length === 0) continue;
      const code = cut.code[i];
      const rot = code & 15;
      const mir = (code & 16) !== 0 ? -1 : 1;
      const co = COS30[rot];
      const si = SIN30[rot];
      const px = cut.pos[i * 2] + cut.origin.x;
      const py = cut.pos[i * 2 + 1] + cut.origin.y;
      const localCtrls = table.controls?.[tb];
      const localAux = table.aux?.[tb];
      for (let s = 0; s < local.length; s++) {
        const [a, b] = local[s];
        const ax = co * mir * a.x - si * a.y + px;
        const ay = si * mir * a.x + co * a.y + py;
        const bx = co * mir * b.x - si * b.y + px;
        const by = si * mir * b.x + co * b.y + py;
        // Found already: its chords are its own (a found circuit is a pure
        // loop), so nothing else traces differently without them.
        const slot = known.find((ax + bx) / 2, (ay + by) / 2);
        if (slot >= 0) {
          knownSeen[slot]++;
          continue;
        }
        if (aux && localAux?.[s]) aux[count] = 1;
        const c = localCtrls?.[s];
        if (c) {
          ctrls[count] = {
            c1: { x: co * mir * c.c1.x - si * c.c1.y + px, y: si * mir * c.c1.x + co * c.c1.y + py },
            c2: { x: co * mir * c.c2.x - si * c.c2.y + px, y: si * mir * c.c2.x + co * c.c2.y + py },
          };
        }
        const o = 4 * count++;
        xy[o] = ax;
        xy[o + 1] = ay;
        xy[o + 2] = bx;
        xy[o + 3] = by;
      }
    }

    const fresh: FoundLoop[] = [];
    for (const loop of traceLoops(xy, count)) {
      const pts = loop.points;
      const n = pts.length;
      if (n < 3) continue;
      const ring = [...pts, pts[0]];
      const arcs = [0];
      for (let i = 1; i <= n; i++) arcs.push(arcs[i - 1] + Math.hypot(ring[i].x - ring[i - 1].x, ring[i].y - ring[i - 1].y));
      const run = curveRun(ring, (k) => ctrls[loop.segs[k]] ?? null, (i) => arcs[i]);
      // Links that do not count towards length (a hexagon rule drawn on
      // Spectres), so a circuit keeps its hexagon colour.
      let tileLength = n;
      if (aux) for (const sg of loop.segs) tileLength -= aux[sg];
      const id = this.nextId++;
      const m = new Float64Array(2 * n);
      for (let i = 0; i < n; i++) {
        m[2 * i] = (ring[i].x + ring[i + 1].x) / 2;
        m[2 * i + 1] = (ring[i].y + ring[i + 1].y) / 2;
      }
      this.mids.set(id, m);
      known.add(id, m);
      fresh.push({ id, tileLength, origin: cut.origin, ...packRun(run, cut.origin), totalLength: arcs[n] });
    }

    const seenWhole: number[] = [];
    for (let k = 0; k < knownSeen.length; k++) if (knownSeen[k] === known.sizes[k]) seenWhole.push(known.items[k]);
    return { fresh, seenWhole };
  }
}
