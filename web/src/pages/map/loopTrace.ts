/**
 * Find-all's welder and tracer: the closed circuits among a cut's chords, on
 * flat arrays.
 *
 * The general pair (`weldSegments` + `tracePaths`) sorts point objects and
 * keys every end with a string, which is fine for a rooted patch but was most
 * of a find pass on a big display cut — and a pass can never skip the open
 * lines running off the edge of the view, so that cost was paid on every pan
 * however much had been found already. Find-all only wants the circuits, so
 * this does just that: weld ends on a grid of numeric cells, count degrees,
 * and walk the components whose every point has degree two. Those are exactly
 * the loops the junction-safe tracer leaves over once its chains are walked.
 */

import type { Pt } from '../../core';

/** Ends this close weld into one point, as `weldSegments` does by default. */
export const LOOP_WELD_EPSILON = 0.05;
/** Grid cell size: a lookup needs a neighbour cell only when an end is this close to its edge. */
const CELL = 1;
/** Cells wrap at 2^16 a side so keys stay small integers (a collision only costs a distance check). */
const cellKey = (ix: number, iy: number): number => ((ix & 0xffff) << 16) | (iy & 0xffff);

export interface TracedLoop {
  /** The loop's points in order; the first is not repeated at the end. */
  readonly points: readonly Pt[];
  /** The segment that runs from point i to point i + 1 (wrapping). */
  readonly segs: Int32Array;
}

/**
 * The closed loops among `count` segments, segment s running from
 * (xy[4s], xy[4s+1]) to (xy[4s+2], xy[4s+3]). A welded point takes the
 * position of the first end that reached it.
 */
export function traceLoops(xy: Float64Array, count: number, epsilon = LOOP_WELD_EPSILON): TracedLoop[] {
  // --- weld: one node per cluster of ends -----------------------------------
  const nodeX: number[] = [];
  const nodeY: number[] = [];
  const cells = new Map<number, number[]>();
  const e2 = epsilon * epsilon;
  const nodeAt = (x: number, y: number): number => {
    const fx = x / CELL;
    const fy = y / CELL;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const m = epsilon / CELL;
    const x0 = fx - ix < m ? ix - 1 : ix;
    const x1 = ix + 1 - fx < m ? ix + 1 : ix;
    const y0 = fy - iy < m ? iy - 1 : iy;
    const y1 = iy + 1 - fy < m ? iy + 1 : iy;
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const l = cells.get(cellKey(cx, cy));
        if (!l) continue;
        for (let j = 0; j < l.length; j++) {
          const n = l[j];
          const dx = nodeX[n] - x;
          const dy = nodeY[n] - y;
          if (dx * dx + dy * dy < e2) return n;
        }
      }
    }
    const n = nodeX.length;
    nodeX.push(x);
    nodeY.push(y);
    const k = cellKey(ix, iy);
    const l = cells.get(k);
    if (l) l.push(n);
    else cells.set(k, [n]);
    return n;
  };
  const ends = new Int32Array(2 * count);
  for (let s = 0; s < count; s++) {
    ends[2 * s] = nodeAt(xy[4 * s], xy[4 * s + 1]);
    ends[2 * s + 1] = nodeAt(xy[4 * s + 2], xy[4 * s + 3]);
  }

  // --- incidence, two slots a node (a third makes it a junction) -------------
  const N = nodeX.length;
  const deg = new Int32Array(N);
  const inc0 = new Int32Array(N).fill(-1);
  const inc1 = new Int32Array(N).fill(-1);
  for (let s = 0; s < count; s++) {
    const a = ends[2 * s];
    const b = ends[2 * s + 1];
    if (a === b) continue; // degenerate chord; contributes nothing
    if (deg[a] === 0) inc0[a] = s;
    else if (deg[a] === 1) inc1[a] = s;
    deg[a]++;
    if (deg[b] === 0) inc0[b] = s;
    else if (deg[b] === 1) inc1[b] = s;
    deg[b]++;
  }

  // --- walk the all-degree-two components -----------------------------------
  const visited = new Uint8Array(N);
  const loops: TracedLoop[] = [];
  const nodes: number[] = [];
  const segs: number[] = [];
  for (let start = 0; start < N; start++) {
    if (visited[start] || deg[start] !== 2) continue;
    nodes.length = 0;
    segs.length = 0;
    let at = start;
    let via = inc0[start];
    let closed = false;
    for (;;) {
      visited[at] = 1;
      nodes.push(at);
      segs.push(via);
      const next = ends[2 * via] === at ? ends[2 * via + 1] : ends[2 * via];
      if (next === start) {
        closed = true;
        break;
      }
      // An end, a junction or ground walked already: not a pure loop.
      if (deg[next] !== 2 || visited[next]) break;
      via = inc0[next] === via ? inc1[next] : inc0[next];
      at = next;
    }
    if (!closed) continue;
    loops.push({
      points: nodes.map((n) => ({ x: nodeX[n], y: nodeY[n] })),
      segs: Int32Array.from(segs),
    });
  }
  return loops;
}
