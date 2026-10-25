import { describe, expect, it } from 'vitest';
import { BATCH_CELL, planBatches } from '../circuitBatches';
import type { TrailGeometry } from '../rendererTypes';

/** A closed square of side 1 at world (x, y), stored relative to `origin`. */
function square(x: number, y: number, origin = { x: 0, y: 0 }, color: [number, number, number] = [1, 0, 0]): TrailGeometry {
  const pts = [
    [x, y],
    [x + 1, y],
    [x + 1, y + 1],
    [x, y + 1],
    [x, y],
  ];
  return {
    color,
    origin,
    xy: Float32Array.from(pts.flatMap(([px, py]) => [px - origin.x, py - origin.y])),
    arc: Float32Array.from([0, 1, 2, 3, 4]),
    pointCount: 5,
    totalLength: 4,
    version: 1,
  };
}

describe('planBatches', () => {
  it('packs the circuits of a cell into one segment list, relative to the cell corner', () => {
    const a = square(10, 10);
    const b = square(20, 30, { x: 5, y: 5 }, [0, 1, 0]);
    const far = square(BATCH_CELL * 3 + 1, 2);
    const batches = planBatches([a, b, far], new Map());
    expect(batches.size).toBe(2);
    const near = batches.get('0,0')!;
    expect(near.members).toEqual([a, b]);
    expect(near.segments).toBe(8);
    expect(near.origin).toEqual({ x: 0, y: 0 });
    // b's second segment, in world coordinates, with b's colour.
    expect(Array.from(near.seg.slice(4 * 5, 4 * 6))).toEqual([21, 30, 21, 31]);
    expect(Array.from(near.arc.slice(2 * 5, 2 * 6))).toEqual([1, 2]);
    expect(Array.from(near.rgba.slice(4 * 5, 4 * 6))).toEqual([0, 1, 0, 1]);
    const out = batches.get('3,0')!;
    expect(out.origin).toEqual({ x: BATCH_CELL * 3, y: 0 });
    expect(out.seg[0]).toBe(1);
  });

  it('keeps a cell’s batch while it holds the same circuits, and re-packs only cells that changed', () => {
    const a = square(10, 10);
    const b = square(BATCH_CELL + 10, 10);
    const first = planBatches([a, b], new Map());
    const c = square(BATCH_CELL + 40, 40);
    // Reordered, and one more in the second cell.
    const next = planBatches([b, c, a], first);
    expect(next.get('0,0')).toBe(first.get('0,0'));
    expect(next.get('1,0')).not.toBe(first.get('1,0'));
    expect(next.get('1,0')!.members).toEqual([b, c]);
    // A cell left empty is gone.
    expect(planBatches([b, c], next).has('0,0')).toBe(false);
  });
});
