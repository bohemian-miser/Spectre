/**
 * The pyramid's windows against rasterizing every segment of the strand:
 * from stored tiles and from re-walked chunks, at every level from 32 pixels
 * a tile edge to 4096 tile edges a pixel, from many spots along the strand,
 * panned pixel by pixel across tile borders, and while the strand grows.
 */
import { describe, expect, it } from 'vitest';
import { TrailPyramid } from '../pyramid';
import { emptyPicture, rasterize, type PixelGrid } from '../raster';
import { CHUNK, latticeOf, SQRT3, TrailStore } from '../store';
import { SEAM_STRAND, walkPoints } from './walkFixture';

function rng(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 2 ** 32;
  };
}

const LEVELS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12];
const STORED = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

function storeOf(xy: Float64Array, upTo = xy.length / 2): TrailStore {
  const [i0, j0] = latticeOf(xy[0], xy[1]);
  const s = new TrailStore(i0, j0);
  for (let k = 1; k < upTo; k++) s.append(...latticeOf(xy[2 * k], xy[2 * k + 1]));
  return s;
}

function reference(store: TrailStore, g: PixelGrid): Float64Array {
  const out = emptyPicture(g);
  rasterize(store.allPoints(), store.segmentCount, 0, g, out);
  return out;
}

/** A w x h window of level s centred on point k of the store. */
function windowAt(pts: Float64Array, k: number, s: number, w: number, h: number): PixelGrid {
  const p = 2 ** s;
  const x = pts[2 * k] / 4;
  const y = (pts[2 * k + 1] * SQRT3) / 4;
  return { s, m0: Math.floor(x / p) - (w >> 1), n0: Math.floor(y / p) - (h >> 1), w, h };
}

/** Compare and report the first differing pixel. */
function expectSame(got: Float64Array, want: Float64Array, what: string): void {
  if (got.length !== want.length) throw new Error(`${what}: sizes differ`);
  for (let i = 0; i < got.length; i++) {
    if (got[i] !== want[i]) throw new Error(`${what}: pixel ${i} is segment ${got[i]}, should be ${want[i]}`);
  }
}

describe('trail pyramid', () => {
  const xy = walkPoints(SEAM_STRAND, 60000);
  const store = storeOf(xy);
  const pts = store.allPoints();
  const pyr = new TrailPyramid(store, { stored: STORED, tile: 64 });

  it('draws every level exactly, from tiles and from chunks, at spots along the strand', () => {
    const rand = rng(11);
    let windows = 0;
    let inked = 0;
    for (const s of LEVELS) {
      for (let t = 0; t < 6; t++) {
        const k = Math.floor(rand() * store.pointCount);
        const g = windowAt(pts, k, s, 80, 56);
        const want = reference(store, g);
        const chunks = pyr.draw(g, 'chunks');
        expectSame(chunks.picture, want, `level ${s}, point ${k}, from chunks`);
        if (STORED.includes(s)) expectSame(pyr.draw(g, 'tiles').picture, want, `level ${s}, point ${k}, from tiles`);
        windows++;
        inked += want.filter((v) => v >= 0).length;
      }
    }
    expect(windows).toBe(LEVELS.length * 6);
    expect(inked).toBeGreaterThan(windows * 200);
  }, 60000);

  it('draws the whole strand at the coarse levels', () => {
    let minI = Infinity, maxI = -Infinity, minJ = Infinity, maxJ = -Infinity;
    for (let k = 0; k < store.pointCount; k++) {
      minI = Math.min(minI, pts[2 * k]); maxI = Math.max(maxI, pts[2 * k]);
      minJ = Math.min(minJ, pts[2 * k + 1]); maxJ = Math.max(maxJ, pts[2 * k + 1]);
    }
    for (const s of [4, 5, 6, 7, 8]) {
      const p = 2 ** s;
      const g: PixelGrid = {
        s,
        m0: Math.floor(minI / 4 / p) - 3,
        n0: Math.floor((minJ * SQRT3) / 4 / p) - 3,
        w: Math.ceil((maxI - minI) / 4 / p) + 7,
        h: Math.ceil(((maxJ - minJ) * SQRT3) / 4 / p) + 7,
      };
      const want = reference(store, g);
      expectSame(pyr.draw(g, 'tiles').picture, want, `whole strand, level ${s}, from tiles`);
      expectSame(pyr.draw(g, 'chunks').picture, want, `whole strand, level ${s}, from chunks`);
      // Every segment's start lies under the strand's ink.
      expect(want.some((v) => v === store.segmentCount - 1)).toBe(true);
    }
  }, 60000);

  it('stays exact while panning pixel by pixel across tile borders', () => {
    const rand = rng(5);
    for (const s of [-2, 1, 3, 6]) {
      let g = windowAt(pts, Math.floor(rand() * store.pointCount), s, 70, 50);
      for (let step = 0; step < 25; step++) {
        const dm = Math.floor(rand() * 41) - 20;
        const dn = Math.floor(rand() * 41) - 20;
        g = { ...g, m0: g.m0 + dm, n0: g.n0 + dn };
        const want = reference(store, g);
        expectSame(pyr.draw(g).picture, want, `pan step ${step}, level ${s}`);
        if (STORED.includes(s)) expectSame(pyr.draw(g, 'chunks').picture, want, `pan step ${step}, level ${s}, chunks`);
      }
    }
  }, 60000);

  it('stays exact while the strand grows', () => {
    const growing = storeOf(xy, 1);
    const live = new TrailPyramid(growing, { stored: [1, 3, 5], tile: 32 });
    const rand = rng(9);
    let n = 1;
    const total = xy.length / 2;
    while (n < total) {
      // Batches that straddle chunk borders.
      const next = Math.min(total, n + 1 + Math.floor(rand() * 1.7 * CHUNK));
      for (let k = n; k < next; k++) growing.append(...latticeOf(xy[2 * k], xy[2 * k + 1]));
      n = next;
      const now = growing.allPoints();
      for (const s of [1, 3, 5, -1]) {
        const k = Math.floor(rand() * growing.pointCount);
        const g = windowAt(now, k, s, 64, 48);
        expectSame(live.draw(g).picture, reference(growing, g), `grown to ${n} points, level ${s}`);
      }
    }
    expect(growing.pointCount).toBe(total);
  }, 60000);
});
