/**
 * Region colours for the infinite view: every region between the strands gets
 * its own fill, the same hues the rooted Explorer uses (`regionFillBucket`).
 *
 * The rooted patch can name its regions once (`buildDualGraph`). Here there is
 * no patch, only whatever cut the camera holds, and a region usually runs off
 * the edge of it. Colouring each cut from scratch would repaint everything on
 * every pan, so the regions are tracked for the whole session instead:
 *
 *  - every tile edge is split at the chord ends into sub-segments, and each
 *    sub-segment becomes a SLOT, keyed by its world midpoint (shared by the
 *    two tiles either side, so they find the same slot);
 *  - the sub-segments of one tile piece are in one region, so their slots are
 *    unioned; a union-find over slots, kept across cuts, is the region map;
 *  - a region's colour is fixed when it is first seen, and when two known
 *    regions turn out to be one (panning found where they join), the larger
 *    keeps its colour.
 *
 * So a region keeps its colour as you pan away and back, and only ever
 * changes when it is discovered to be part of a bigger one.
 */

import {
  isAggregateType,
  leafOrder,
  leafPts,
  localPieces,
  REGION_FILL_BUCKETS,
  regionFillBucket,
  regionFillRgb,
  type LocalPieces,
  type Pt,
  type TileFamilyId,
  type ViewportCut,
} from '../../core';
import type { LeafChordTable } from './chords';
import { earClip } from './glyphs';
import type { RegionFillGeometry, RegionMeshTable } from './rendererTypes';

/** Piece meshes for one chord table: row `type * maxPieces + k` is piece k. */
export interface RegionMesh extends RegionMeshTable {
  readonly family: TileFamilyId;
  readonly maxPieces: number;
  /** Per leaf type byte: the tile's pieces and boundary sub-segments. */
  readonly local: readonly LocalPieces[];
}

/** Cut every leaf type by its chords and triangulate the pieces. */
export function buildRegionMesh(table: LeafChordTable): RegionMesh {
  const family = table.family;
  const types = leafOrder(family);
  const local = types.map((t, i) => localPieces(leafPts(family, t), table.segments[i] ?? []));
  let maxPieces = 1;
  for (const lp of local) maxPieces = Math.max(maxPieces, lp.polys.length);
  const rows = types.length * maxPieces;
  const rowPolys: (readonly Pt[])[] = [];
  const tris: Float32Array[] = [];
  let verts = 3;
  for (let t = 0; t < types.length; t++) {
    for (let k = 0; k < maxPieces; k++) {
      const poly = local[t].polys[k] ?? [];
      rowPolys.push(poly);
      const idx = poly.length >= 3 ? earClip(poly) : [];
      const v = new Float32Array(idx.length * 2);
      idx.forEach((pi, j) => {
        v[j * 2] = poly[pi].x;
        v[j * 2 + 1] = poly[pi].y;
      });
      tris.push(v);
      verts = Math.max(verts, idx.length);
    }
  }
  const data = new Float32Array(rows * verts * 2);
  tris.forEach((v, row) => {
    const base = row * verts * 2;
    data.set(v, base);
    // Padding repeats the last vertex: degenerate triangles, zero raster area.
    const lx = v.length ? v[v.length - 2] : 0;
    const ly = v.length ? v[v.length - 1] : 0;
    for (let j = v.length / 2; j < verts; j++) {
      data[base + j * 2] = lx;
      data[base + j * 2 + 1] = ly;
    }
  });
  return { family, maxPieces, local, rows, verts, data, rowPolys };
}

const BUCKET_RGB = Array.from({ length: REGION_FILL_BUCKETS }, (_, b) => regionFillRgb(b));

const COS30 = Array.from({ length: 12 }, (_, k) => Math.cos((k * Math.PI) / 6));
const SIN30 = Array.from({ length: 12 }, (_, k) => Math.sin((k * Math.PI) / 6));

/** Slot grid: midpoints of different sub-segments are far further apart than this. */
const GRID = 50; // cells per world unit
const MATCH_SQ = 0.01 * 0.01;
const OFFSET = 33554432; // 2^25
const SPAN = 67108864; // 2^26

/** Session cap; past it the map starts over (colours reshuffle once). */
const MAX_SLOTS = 4_000_000;

export interface RegionTracker {
  /** Colour a LEAF cut's pieces; null for an aggregate cut or no chords. */
  colour(cut: ViewportCut, mesh: RegionMesh): RegionFillGeometry | null;
  /** Forget every region (a new rule or a new world). */
  reset(): void;
  /** Slots held (for tests and the cap). */
  readonly size: number;
}

export function createRegionTracker(): RegionTracker {
  let cap = 1 << 16;
  let n = 0;
  let sx = new Float64Array(cap);
  let sy = new Float64Array(cap);
  let parent = new Int32Array(cap);
  let size = new Int32Array(cap);
  let colourOf = new Int32Array(cap);
  let grid = new Map<number, number>();
  let nextColour = 0;

  const reset = (): void => {
    n = 0;
    grid = new Map();
    nextColour = 0;
  };

  const grow = (): void => {
    cap *= 2;
    const g = <T extends Float64Array | Int32Array>(a: T, C: new (n: number) => T): T => {
      const b = new C(cap);
      b.set(a);
      return b;
    };
    sx = g(sx, Float64Array);
    sy = g(sy, Float64Array);
    parent = g(parent, Int32Array);
    size = g(size, Int32Array);
    colourOf = g(colourOf, Int32Array);
  };

  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };

  const union = (a: number, b: number): void => {
    let ra = find(a);
    let rb = find(b);
    if (ra === rb) return;
    if (size[ra] < size[rb]) [ra, rb] = [rb, ra];
    parent[rb] = ra;
    size[ra] += size[rb];
    if (colourOf[ra] < 0) colourOf[ra] = colourOf[rb];
  };

  const near = (key: number, x: number, y: number): number => {
    const s = grid.get(key);
    if (s === undefined) return -1;
    const dx = sx[s] - x;
    const dy = sy[s] - y;
    return dx * dx + dy * dy <= MATCH_SQ ? s : -1;
  };

  /** The slot for the sub-segment whose world midpoint is (x, y). */
  const slotAt = (x: number, y: number): number => {
    const qx = Math.round(x * GRID);
    const qy = Math.round(y * GRID);
    const key = (qx + OFFSET) * SPAN + (qy + OFFSET);
    let s = near(key, x, y);
    if (s >= 0) return s;
    // f32 instance positions can land a shared midpoint in the next cell.
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        s = near(key + dx * SPAN + dy, x, y);
        if (s >= 0) return s;
      }
    }
    if (n === cap) grow();
    s = n++;
    sx[s] = x;
    sy[s] = y;
    parent[s] = s;
    size[s] = 1;
    colourOf[s] = -1;
    if (!grid.has(key)) grid.set(key, s);
    return s;
  };

  const colour = (cut: ViewportCut, mesh: RegionMesh): RegionFillGeometry | null => {
    if (cut.cutLevel !== 0 || cut.count === 0) return null;
    if (n > MAX_SLOTS) reset();
    const { local, maxPieces } = mesh;

    let total = 0;
    for (let i = 0; i < cut.count; i++) {
      const tb = cut.type[i];
      if (!isAggregateType(tb) && local[tb]) total += local[tb].polys.length;
    }
    const pos = new Float32Array(total * 2);
    const code = new Uint8Array(total);
    const row = new Uint8Array(total);
    const rgb = new Uint8Array(total * 3);
    const pieceSlot = new Int32Array(total);

    // Pass 1: slots and unions.
    let o = 0;
    const first: number[] = [];
    for (let i = 0; i < cut.count; i++) {
      const tb = cut.type[i];
      if (isAggregateType(tb)) continue;
      const lp = local[tb];
      if (!lp) continue;
      const c = cut.code[i];
      const rot = c & 15;
      const mir = (c & 16) !== 0 ? -1 : 1;
      const co = COS30[rot];
      const si = SIN30[rot];
      const px = cut.pos[i * 2] + cut.origin.x;
      const py = cut.pos[i * 2 + 1] + cut.origin.y;
      first.length = lp.polys.length;
      first.fill(-1);
      for (let s = 0; s < lp.subMid.length; s++) {
        const m = lp.subMid[s];
        const slot = slotAt(co * mir * m.x - si * m.y + px, si * mir * m.x + co * m.y + py);
        const k = lp.subPiece[s];
        if (first[k] < 0) first[k] = slot;
        else union(first[k], slot);
      }
      for (let k = 0; k < lp.polys.length; k++) {
        pos[o * 2] = cut.pos[i * 2];
        pos[o * 2 + 1] = cut.pos[i * 2 + 1];
        code[o] = c;
        row[o] = tb * maxPieces + k;
        pieceSlot[o] = first[k];
        o++;
      }
    }

    // Pass 2: colours, once every union of this cut is in.
    for (let p = 0; p < total; p++) {
      const s = pieceSlot[p];
      let bucket = 0;
      if (s >= 0) {
        const r = find(s);
        if (colourOf[r] < 0) colourOf[r] = nextColour++;
        bucket = regionFillBucket(colourOf[r]);
      }
      const c = BUCKET_RGB[bucket];
      rgb[p * 3] = c[0];
      rgb[p * 3 + 1] = c[1];
      rgb[p * 3 + 2] = c[2];
    }

    return { mesh, origin: cut.origin, count: total, pos, code, row, rgb };
  };

  return {
    colour,
    reset,
    get size() {
      return n;
    },
  };
}
