/**
 * A strand's picture at every level, without holding a picture of every
 * level.
 *
 * Coarse levels are stored: square tiles of the level's pixel lattice, each
 * pixel the highest segment index covering it (and, under coverage, how many
 * segments crossed it), filled in as the strand grows. A coarse level has
 * few pixels however long the strand, so its tiles stay small. Fine levels
 * are drawn when asked: the chunks of the store whose box reaches the window
 * are decoded and rasterized in order. A fine window holds few chunks
 * however long the strand.
 *
 * Both draw with `raster.ts` on the same lattice, so either gives the window
 * exactly as rasterizing every segment of the strand would.
 */

import { emptyPicture, midpointPixel, pixelGrid, ruleAt, segmentPixels, DEFAULT_LINE_WIDTH, type PixelGrid, type Picture, type RasterStats, type Rule } from './raster';
import { CHUNK, SQRT3, type TrailStore } from './store';

export interface PyramidOptions {
  /** Levels kept as tiles. */
  readonly stored: readonly number[];
  /** Tile side, in pixels. */
  readonly tile?: number;
  /** The line's width in tile edges. */
  readonly width?: number;
}

/** A tile: 4-byte segment indices (a strand of under 2^31 segments) and, under coverage, 2-byte counts that stop at 65,535, far past full brightness. */
interface Tile {
  readonly idx: Int32Array;
  readonly cnt: Uint16Array | null;
}

interface Level {
  readonly s: number;
  readonly rule: Rule;
  readonly tiles: Map<string, Tile>;
}

/** How a window was drawn. */
export interface Drawn {
  readonly picture: Picture;
  readonly from: 'tiles' | 'chunks';
  /** Chunks decoded (drawing from chunks), or tiles read. */
  readonly pieces: number;
  readonly segments: number;
}

export class TrailPyramid {
  readonly tile: number;
  readonly width: number;
  private readonly levels = new Map<number, Level>();
  private scratch: Float64Array = new Float64Array(2 * (CHUNK + 1));

  constructor(
    readonly store: TrailStore,
    opts: PyramidOptions,
  ) {
    this.tile = opts.tile ?? 256;
    this.width = opts.width ?? DEFAULT_LINE_WIDTH;
    for (const s of opts.stored) this.levels.set(s, { s, rule: ruleAt(s, this.width), tiles: new Map() });
  }

  get storedLevels(): number[] {
    return [...this.levels.keys()].sort((a, b) => a - b);
  }

  /** The rule a window of level s is drawn by. */
  ruleFor(s: number): Rule {
    return this.levels.get(s)?.rule ?? ruleAt(s, this.width);
  }

  /** A window of level s, drawn by this pyramid's rule for it. */
  grid(s: number, m0: number, n0: number, w: number, h: number): PixelGrid {
    return pixelGrid(s, m0, n0, w, h, this.ruleFor(s));
  }

  /** Tiles held at level s. */
  tileCount(s: number): number {
    return this.levels.get(s)?.tiles.size ?? 0;
  }

  /** Bytes held in tiles, all levels. */
  get bytes(): number {
    let n = 0;
    for (const L of this.levels.values()) n += L.tiles.size * this.tile * this.tile * (L.rule.mode === 'coverage' ? 6 : 4);
    return n;
  }

  /** Segments of the store not yet in the stored levels. */
  get behind(): number {
    return this.store.segmentCount - this.done;
  }

  /** Segments drawn into every stored level so far: the levels advance together. */
  private done = 0;
  /** The decoded chunk the update is in, and how many points it held when decoded (the last chunk grows). */
  private decoded = { chunk: -1, points: 0 };

  /**
   * Draw the segments added since the last update into every stored level:
   * all of them, or the next `budget` of them, so a page can keep up in
   * slices. A segment is decoded once and, for the coverage levels, placed
   * once: the pixel of its midpoint at each level is the midpoint's lattice
   * column and row shifted down. Returns how many segments are still behind.
   */
  update(budget = Infinity, stats?: RasterStats): number {
    const total = this.store.segmentCount;
    const stop = Math.min(total, this.done + budget);
    const T = this.tile;
    const open = { mLo: -Infinity, mHi: Infinity, nLo: -Infinity, nHi: Infinity };
    const levels = [...this.levels.values()];
    const coverage = levels.map((L, i) => ({ L, i })).filter(({ L }) => L.rule.mode === 'coverage');
    const strokes = levels.map((L, i) => ({ L, i, g: pixelGrid(L.s, 0, 0, Infinity, Infinity, L.rule) })).filter(({ L }) => L.rule.mode === 'stroke');
    // The tile last written at each level, so a run of segments in one tile looks it up once.
    const at = levels.map(() => ({ tx: NaN, ty: NaN, tile: null as Tile | null }));
    const tileAt = (L: Level, i: number, m: number, n: number): Tile => {
      const tx = Math.floor(m / T);
      const ty = Math.floor(n / T);
      const a = at[i];
      if (tx !== a.tx || ty !== a.ty || !a.tile) {
        a.tx = tx;
        a.ty = ty;
        const key = `${tx},${ty}`;
        let tile = L.tiles.get(key);
        if (!tile) {
          tile = { idx: new Int32Array(T * T).fill(-1), cnt: L.rule.mode === 'coverage' ? new Uint16Array(T * T) : null };
          L.tiles.set(key, tile);
        }
        a.tile = tile;
      }
      return a.tile!;
    };
    for (let k = this.done; k < stop; k++) {
      const c = Math.floor(k / CHUNK);
      const { first, count } = this.store.chunkSegments(c);
      if (this.decoded.chunk !== c || this.decoded.points < count + 1) {
        this.scratch = this.store.chunkPoints(c, this.scratch);
        this.decoded = { chunk: c, points: count + 1 };
      }
      const o = 2 * (k - first);
      const pts = this.scratch;
      const ai = pts[o], aj = pts[o + 1], bi = pts[o + 2], bj = pts[o + 3];
      if (coverage.length) {
        if (stats) stats.tested++;
        for (const { L, i } of coverage) {
          const [m, n] = midpointPixel(ai, aj, bi, bj, L.s);
          const tile = tileAt(L, i, m, n);
          const tx = Math.floor(m / T), ty = Math.floor(n / T);
          const q = (n - ty * T) * T + (m - tx * T);
          tile.idx[q] = k;
          if (tile.cnt![q] < 65535) tile.cnt![q]++;
        }
      }
      for (const { L, i, g } of strokes) {
        segmentPixels(ai, aj, bi, bj, g, open, (m, n) => {
          const tile = tileAt(L, i, m, n);
          const tx = Math.floor(m / T), ty = Math.floor(n / T);
          tile.idx[(n - ty * T) * T + (m - tx * T)] = k;
        }, stats);
      }
    }
    this.done = stop;
    return total - this.done;
  }

  /**
   * The window's picture: from the level's tiles when it is stored (unless
   * `from` says otherwise), else from the chunks reaching the window. A
   * stored level is brought up to date first.
   */
  draw(g: PixelGrid, from: 'auto' | 'tiles' | 'chunks' = 'auto', stats?: RasterStats): Drawn {
    const level = this.levels.get(g.s);
    if (from === 'tiles' && !level) throw new Error(`level ${g.s} is not stored`);
    if (level && from !== 'chunks') {
      if (this.behind > 0) this.update(Infinity, stats);
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
          const dst = (n - g.n0) * g.w + (mLo - g.m0);
          out.idx.set(t.idx.subarray(src, src + (mHi - mLo)), dst);
          if (out.cnt && t.cnt) out.cnt.set(t.cnt.subarray(src, src + (mHi - mLo)), dst);
        }
      }
    }
    return { picture: out, from: 'tiles', pieces, segments: 0 };
  }

  private fromChunks(g: PixelGrid, stats?: RasterStats): Drawn {
    const out = emptyPicture(g);
    const p = 2 ** g.s;
    // The window's centres, widened by the stroke (a midpoint under coverage) and a pixel of slack.
    const reach = (g.rule.radius.num / g.rule.radius.den) * p + p;
    const x0 = g.m0 * p - reach;
    const x1 = (g.m0 + g.w) * p + reach;
    const y0 = g.n0 * p - reach;
    const y1 = (g.n0 + g.h) * p + reach;
    const clip = { mLo: g.m0, mHi: g.m0 + g.w - 1, nLo: g.n0, nHi: g.n0 + g.h - 1 };
    const { idx, cnt } = out;
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
        const index = first + k;
        segmentPixels(pts[2 * k], pts[2 * k + 1], pts[2 * k + 2], pts[2 * k + 3], g, clip, cnt
          ? (m, n) => { const o = (n - g.n0) * g.w + (m - g.m0); idx[o] = index; cnt[o]++; }
          : (m, n) => { idx[(n - g.n0) * g.w + (m - g.m0)] = index; }, stats);
      }
    }
    return { picture: out, from: 'chunks', pieces, segments };
  }
}
