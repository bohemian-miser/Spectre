/**
 * Found circuits packed into a few big draws instead of one each.
 *
 * Every circuit drawn as its own pass cost a program bind, seven uniforms and
 * a draw call per frame, so a few thousand found circuits made every frame
 * slow however little else changed — panning over ground already found
 * lagged because of what had been found. Solid circuits share everything but
 * their colour and position, so they are packed per spatial cell into one
 * instanced segment list with the colour as a per-segment attribute, and a
 * cell is drawn in one call.
 *
 * Packing is per cell so that finding more re-packs only the cells it
 * touched: a cell whose circuits are exactly the ones it had keeps its batch
 * (and its GPU buffers). Each batch is drawn relative to its own cell corner,
 * which keeps f32 positions exact however far out on the plane it lies.
 */

import type { Pt } from '../../core';
import type { TrailGeometry } from './rendererTypes';

/** Batch cell size, in world units. */
export const BATCH_CELL = 256;
/** Floats per packed segment: a and b (2 each); arc at a and b; colour (4). */
const SEG = 4;
const ARC = 2;
const RGBA = 4;

export interface CircuitBatch {
  readonly key: string;
  /** Where the packed positions are relative to. */
  readonly origin: Pt;
  readonly members: readonly TrailGeometry[];
  /** ax, ay, bx, by per segment, relative to `origin`. */
  readonly seg: Float32Array;
  /** Arc length at a and at b per segment. */
  readonly arc: Float32Array;
  /** Solid colour per segment (alpha 1 marks it solid). */
  readonly rgba: Float32Array;
  readonly segments: number;
}

/** The cell a circuit is batched in: where its first point lies. */
function cellOf(g: TrailGeometry): { key: string; ix: number; iy: number } {
  const ix = Math.floor((g.origin.x + g.xy[0]) / BATCH_CELL);
  const iy = Math.floor((g.origin.y + g.xy[1]) / BATCH_CELL);
  return { key: `${ix},${iy}`, ix, iy };
}

function pack(key: string, ix: number, iy: number, members: readonly TrailGeometry[]): CircuitBatch {
  const origin = { x: ix * BATCH_CELL, y: iy * BATCH_CELL };
  let segments = 0;
  for (const g of members) segments += g.pointCount - 1;
  const seg = new Float32Array(SEG * segments);
  const arc = new Float32Array(ARC * segments);
  const rgba = new Float32Array(RGBA * segments);
  let s = 0;
  for (const g of members) {
    const dx = g.origin.x - origin.x;
    const dy = g.origin.y - origin.y;
    const [r, gr, b] = g.color!;
    for (let i = 0; i + 1 < g.pointCount; i++, s++) {
      seg[SEG * s] = g.xy[2 * i] + dx;
      seg[SEG * s + 1] = g.xy[2 * i + 1] + dy;
      seg[SEG * s + 2] = g.xy[2 * i + 2] + dx;
      seg[SEG * s + 3] = g.xy[2 * i + 3] + dy;
      arc[ARC * s] = g.arc[i];
      arc[ARC * s + 1] = g.arc[i + 1];
      rgba[RGBA * s] = r;
      rgba[RGBA * s + 1] = gr;
      rgba[RGBA * s + 2] = b;
      rgba[RGBA * s + 3] = 1;
    }
  }
  return { key, origin, members, seg, arc, rgba, segments };
}

/**
 * Batches for these solid circuits (each must carry a `color`), reusing any
 * batch in `prev` whose cell holds exactly the same circuits (in any order).
 */
export function planBatches(
  solid: readonly TrailGeometry[],
  prev: ReadonlyMap<string, CircuitBatch>,
): Map<string, CircuitBatch> {
  const cells = new Map<string, { ix: number; iy: number; members: TrailGeometry[] }>();
  for (const g of solid) {
    if (g.pointCount < 2) continue;
    const c = cellOf(g);
    const cell = cells.get(c.key);
    if (cell) cell.members.push(g);
    else cells.set(c.key, { ix: c.ix, iy: c.iy, members: [g] });
  }
  const out = new Map<string, CircuitBatch>();
  for (const [key, { ix, iy, members }] of cells) {
    const had = prev.get(key);
    let same = !!had && had.members.length === members.length;
    if (same) {
      const held = new Set(had!.members);
      same = members.every((g) => held.has(g));
    }
    out.set(key, same ? had! : pack(key, ix, iy, members));
  }
  return out;
}
