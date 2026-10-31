/**
 * A strand's picture at every level, without holding a picture of every
 * level.
 *
 * Coarse levels are stored: square tiles of the level's pixel lattice, each
 * pixel the highest segment index covering it, filled in as the strand grows.
 * A coarse level has few pixels however long the strand, so its tiles stay
 * small. Fine levels are drawn when asked: the chunks of the store whose box
 * reaches the window are decoded and rasterized in order. A fine window holds
 * few chunks however long the strand.
 *
 * Both draw with `raster.ts` on the same lattice, so either gives the window
 * exactly as rasterizing every segment of the strand would.
 */

import { emptyPicture, segmentPixels, TRAIL_RADIUS, type PixelGrid, type Radius, type RasterStats } from './raster';
import { CHUNK, SQRT3, type TrailStore } from './store';

export interface PyramidOptions {
  /** Levels kept as tiles. */
  readonly stored: readonly number[];
  /** Tile side, in pixels. */
  readonly tile?: number;
  readonly radius?: Radius;
}

interface Level {
  readonly s: number;
  readonly tiles: Map<string, Float64Array>;
  /** Segments drawn into the tiles so far. */
  done: number;
}

/** How a window was drawn. */
export interface Drawn {
  readonly picture: Float64Array;
  readonly from: 'tiles' | 'chunks';
  /** Chunks decoded (drawing from chunks), or tiles read. */
  readonly pieces: number;
  readonly segments: number;
}

export class TrailPyramid {
  readonly tile: number;
  readonly radius: Radius;
  private readonly levels = new Map<number, Level>();
  private scratch: Float64Array = new Float64Array(2 * (CHUNK + 1));

  constructor(
    readonly store: TrailStore,
    opts: PyramidOptions,
  ) {
    this.tile = opts.tile ?? 256;
    this.radius = opts.radius ?? TRAIL_RADIUS;
    for (const s of opts.stored) this.levels.set(s, { s, tiles: new Map(), done: 0 });
  }

  get storedLevels(): number[] {
    return [...this.levels.keys()].sort((a, b) => a - b);
  }

  /** Tiles held at level s. */
  tileCount(s: number): number {
    return this.levels.get(s)?.tiles.size ?? 0;
  }

  /** Bytes held in tiles, all levels. */
  get bytes(): number {
    let n = 0;
    for (const L of this.levels.values()) n += L.tiles.size * this.tile * this.tile * 8;
    return n;
  }

  /** Draw the segments added since the last update into every stored level. */
  update(stats?: RasterStats): void {
    const total = this.store.segmentCount;
    for (const L of this.levels.values()) {
      if (L.done >= total) continue;
      const T = this.tile;
      const open = { mLo: -Infinity, mHi: Infinity, nLo: -Infinity, nHi: Infinity };
      let key = '';
      let cur: Float64Array | null = null;
      let curTx = NaN;
      let curTy = NaN;
      for (let c = Math.floor(L.done / CHUNK); c * CHUNK < total; c++) {
        const { first, count } = this.store.chunkSegments(c);
        const pts = (this.scratch = this.store.chunkPoints(c, this.scratch));
        for (let k = Math.max(0, L.done - first); k < count; k++) {
          const idx = first + k;
          segmentPixels(pts[2 * k], pts[2 * k + 1], pts[2 * k + 2], pts[2 * k + 3], L.s, this.radius, open, (m, n) => {
            const tx = Math.floor(m / T);
            const ty = Math.floor(n / T);
            if (tx !== curTx || ty !== curTy) {
              curTx = tx;
              curTy = ty;
              key = `${tx},${ty}`;
              cur = L.tiles.get(key) ?? null;
              if (!cur) {
                cur = new Float64Array(T * T).fill(-1);
                L.tiles.set(key, cur);
              }
            }
            cur![(n - ty * T) * T + (m - tx * T)] = idx;
          }, stats);
        }
      }
      L.done = total;
    }
  }

  /**
   * The window's picture: from the level's tiles when it is stored (unless
   * `from` says otherwise), else from the chunks reaching the window.
   */
  draw(g: PixelGrid, from: 'auto' | 'tiles' | 'chunks' = 'auto', stats?: RasterStats): Drawn {
    const level = this.levels.get(g.s);
    if (from === 'tiles' && !level) throw new Error(`level ${g.s} is not stored`);
    if (level && from !== 'chunks') {
      this.update(stats);
      return this.fromTiles(level, g);
    }
    return this.fromChunks(g, stats);
  }

  private fromTiles(L: Level, g: PixelGrid): Drawn {
    const out = emptyPicture(g);
    const T = this.tile;
    let pieces = 0;
    for (let ty = Math.floor(g.n0 / T); ty * T < g.n0 + g.h; ty++) {
      for (let tx = Math.floor(g.m0 / T); tx * T < g.m0 + g.w; tx++) {
        const t = L.tiles.get(`${tx},${ty}`);
        if (!t) continue;
        pieces++;
        const mLo = Math.max(g.m0, tx * T);
        const mHi = Math.min(g.m0 + g.w, tx * T + T);
        for (let n = Math.max(g.n0, ty * T); n < Math.min(g.n0 + g.h, ty * T + T); n++) {
          const src = (n - ty * T) * T + (mLo - tx * T);
          out.set(t.subarray(src, src + (mHi - mLo)), (n - g.n0) * g.w + (mLo - g.m0));
        }
      }
    }
    return { picture: out, from: 'tiles', pieces, segments: 0 };
  }

  private fromChunks(g: PixelGrid, stats?: RasterStats): Drawn {
    const out = emptyPicture(g);
    const p = 2 ** g.s;
    // The window's centres, widened by the radius and a pixel of slack.
    const reach = (this.radius.num / this.radius.den) * p + p;
    const x0 = g.m0 * p - reach;
    const x1 = (g.m0 + g.w) * p + reach;
    const y0 = g.n0 * p - reach;
    const y1 = (g.n0 + g.h) * p + reach;
    const clip = { mLo: g.m0, mHi: g.m0 + g.w - 1, nLo: g.n0, nHi: g.n0 + g.h - 1 };
    let pieces = 0;
    let segments = 0;
    for (let c = 0; c < this.store.chunkCount; c++) {
      const b = this.store.box(c);
      if (b.maxI / 4 < x0 || b.minI / 4 > x1 || (b.maxJ * SQRT3) / 4 < y0 || (b.minJ * SQRT3) / 4 > y1) continue;
      pieces++;
      const { first, count } = this.store.chunkSegments(c);
      const pts = (this.scratch = this.store.chunkPoints(c, this.scratch));
      segments += count;
      for (let k = 0; k < count; k++) {
        const idx = first + k;
        segmentPixels(pts[2 * k], pts[2 * k + 1], pts[2 * k + 2], pts[2 * k + 3], g.s, this.radius, clip, (m, n) => {
          out[(n - g.n0) * g.w + (m - g.m0)] = idx;
        }, stats);
      }
    }
    return { picture: out, from: 'chunks', pieces, segments };
  }
}
