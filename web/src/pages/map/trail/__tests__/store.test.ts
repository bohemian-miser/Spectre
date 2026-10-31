/**
 * The exact trail store against the walk it was fed: every point read back
 * is the walk's point on the lattice, and every chunk's box holds its points.
 */
import { describe, expect, it } from 'vitest';
import { CHUNK, latticeOf, SQRT3, TrailStore } from '../store';
import { SEAM_STRAND, walkPoints } from './walkFixture';

describe('exact trail store', () => {
  const xy = walkPoints(SEAM_STRAND, 30000);
  const n = xy.length / 2;
  const [i0, j0] = latticeOf(xy[0], xy[1]);
  const store = new TrailStore(i0, j0);
  for (let k = 1; k < n; k++) store.append(...latticeOf(xy[2 * k], xy[2 * k + 1]));

  it('reads back every point of the walk, on the lattice', () => {
    expect(store.pointCount).toBe(n);
    const pts = store.allPoints();
    let worst = 0;
    for (let k = 0; k < n; k++) {
      const x = (pts[2 * k] + i0) / 4;
      const y = ((pts[2 * k + 1] + j0) * SQRT3) / 4;
      worst = Math.max(worst, Math.abs(x - xy[2 * k]), Math.abs(y - xy[2 * k + 1]));
    }
    // The walk's floats carry their own drift; the lattice point is within it.
    expect(worst).toBeLessThan(1e-4);
  });

  it('decodes each chunk to the same points, inside its box', () => {
    const all = store.allPoints();
    for (let c = 0; c < store.chunkCount; c++) {
      const { first, count } = store.chunkSegments(c);
      const pts = store.chunkPoints(c);
      const b = store.box(c);
      for (let k = 0; k <= count; k++) {
        expect(pts[2 * k]).toBe(all[2 * (first + k)]);
        expect(pts[2 * k + 1]).toBe(all[2 * (first + k) + 1]);
        expect(pts[2 * k]).toBeGreaterThanOrEqual(b.minI);
        expect(pts[2 * k]).toBeLessThanOrEqual(b.maxI);
        expect(pts[2 * k + 1]).toBeGreaterThanOrEqual(b.minJ);
        expect(pts[2 * k + 1]).toBeLessThanOrEqual(b.maxJ);
      }
    }
    expect(store.chunkCount).toBe(Math.ceil((n - 1) / CHUNK));
  });

  it('holds a byte a step', () => {
    expect(store.bytes).toBeLessThan(1.1 * n + 1000);
  });
});
