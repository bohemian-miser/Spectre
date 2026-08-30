/**
 * Geometry for the instanced renderer: the per-family leaf meshes and the
 * aggregate SUPERTILE GLYPHS (docs/BIGMAP_INVESTIGATION.md §3 "Aggregate
 * (far-LOD) drawing").
 *
 * A level-c aggregate instance from the engine carries the isometry of the
 * level-c node's local frame. Its glyph is the level-`GLYPH_LEVEL` supertile
 * boundary of the same flavour — computed hierarchically by edge cancellation
 * over the shared DAG, decimated, ear-clipped — mapped into the level-c frame
 * by a similarity fitted between the two levels' key-point quads. The true
 * fractal outline converges per level, so past the LOD cut (tiles < ~1 px)
 * the glyph is visually exact. NOTE the fit is DIRECT (det > 0) at every
 * Δlevel — the substitution's per-level mirror is already carried by the
 * engine's aggregate instance code (mirror = cutLevel & 1), never by the
 * local frames (verified numerically against the true level-4 boundary).
 *
 * Pure module (imports core only) so every mesh/fit property is testable in
 * node: glyph area ≈ tileCount × SPECTRE_TILE_AREA, fit scale ≈ 2.806^(c−J),
 * fit parity = (−1)^(c−J).
 */

import {
  TILE_NAMES,
  buildSystem,
  countTiles,
  leafOrder,
  leafPts,
  type Affine,
  type Pt,
  type TileFamilyId,
  type TileNode,
  type TileTypeId,
} from '../../core';

/** Level whose boundary is baked into each aggregate glyph. */
export const GLYPH_LEVEL = 3;
/** Decimation budget per glyph outline. */
export const MAX_GLYPH_POINTS = 96;

// ---------------------------------------------------------------------------
// Polygon helpers
// ---------------------------------------------------------------------------

/** Signed shoelace area. */
export function polygonArea(pts: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; ++i) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/**
 * Ear-clipping triangulation (the spike's, hardened): always returns exactly
 * `n − 2` triangles. If no strict ear exists (decimation can leave slightly
 * degenerate corners) the most convex corner is clipped anyway — a far-zoom
 * glyph tolerates a sliver of overdraw, an incomplete fill does not.
 */
export function earClip(pts: readonly Pt[]): number[] {
  const n = pts.length;
  if (n < 3) return [];
  const idx = Array.from({ length: n }, (_, i) => i);
  const tris: number[] = [];
  const area2 = (a: Pt, b: Pt, c: Pt): number =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const sign = polygonArea(pts) > 0 ? 1 : -1;
  let size = 0;
  for (const p of pts) size = Math.max(size, Math.abs(p.x), Math.abs(p.y));
  const eps = 1e-12 * Math.max(1, size * size);
  const inTri = (p: Pt, a: Pt, b: Pt, c: Pt): boolean => {
    const d1 = area2(a, b, p);
    const d2 = area2(b, c, p);
    const d3 = area2(c, a, p);
    const neg = d1 < -eps || d2 < -eps || d3 < -eps;
    const pos = d1 > eps || d2 > eps || d3 > eps;
    return !(neg && pos);
  };

  while (idx.length > 3) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const ia = idx[(i - 1 + idx.length) % idx.length];
      const ib = idx[i];
      const ic = idx[(i + 1) % idx.length];
      const a = pts[ia];
      const b = pts[ib];
      const c = pts[ic];
      if (sign * area2(a, b, c) <= eps) continue; // reflex or degenerate
      let ok = true;
      for (const j of idx) {
        if (j === ia || j === ib || j === ic) continue;
        if (inTri(pts[j], a, b, c)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      tris.push(ia, ib, ic);
      idx.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) {
      // Degenerate leftover: clip the most convex corner unconditionally.
      let best = 0;
      let bestA = -Infinity;
      for (let i = 0; i < idx.length; i++) {
        const a = pts[idx[(i - 1 + idx.length) % idx.length]];
        const b = pts[idx[i]];
        const c = pts[idx[(i + 1) % idx.length]];
        const v = sign * area2(a, b, c);
        if (v > bestA) {
          bestA = v;
          best = i;
        }
      }
      tris.push(
        idx[(best - 1 + idx.length) % idx.length],
        idx[best],
        idx[(best + 1) % idx.length],
      );
      idx.splice(best, 1);
    }
  }
  tris.push(idx[0], idx[1], idx[2]);
  return tris;
}

// ---------------------------------------------------------------------------
// Hierarchical supertile boundary (edge cancellation over the shared DAG)
// ---------------------------------------------------------------------------

/**
 * Vertex quantum for edge identity: 1/64 world unit. Distinct tiling vertices
 * are ≥ ~0.23 units apart (Z[ζ12] lattice), and lattice coordinates
 * `a + b·(√3/2) + c/2` can never land exactly on a half-quantum boundary
 * (that would need 55.4256…·b to be a half-integer), so the keys are stable
 * against the ~1e-12 float drift of composing child transforms at glyph
 * levels.
 */
const Q = 64;

const vKey = (x: number, y: number): number =>
  (Math.round(x * Q) + 0x40000) * 0x100000 + (Math.round(y * Q) + 0x40000);

// Packed [ax, ay, bx, by] per surviving boundary segment, node-local frame.
// Nodes are unique to their family (buildSystem caches per family:level), so
// the per-node cache never mixes families even though the key omits it.
const boundaryCache = new WeakMap<TileNode, Float64Array>();

/** Outer-boundary segments of a supertile node, in its local frame. */
export function boundarySegments(node: TileNode, family: TileFamilyId = 'spectre'): Float64Array {
  const hit = boundaryCache.get(node);
  if (hit) return hit;
  let out: Float64Array;
  if (node.kind === 'leaf') {
    const pts = leafPts(family, node.type);
    out = new Float64Array(pts.length * 4);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      out[i * 4] = a.x;
      out[i * 4 + 1] = a.y;
      out[i * 4 + 2] = b.x;
      out[i * 4 + 3] = b.y;
    }
  } else {
    // An edge appearing in two children is interior; survivors are boundary.
    const seen = new Map<string, Float64Array | null>();
    for (const child of node.children) {
      const T = child.xform;
      const segs = boundarySegments(child.node, family);
      for (let s = 0; s < segs.length; s += 4) {
        const ax = T[0] * segs[s] + T[1] * segs[s + 1] + T[2];
        const ay = T[3] * segs[s] + T[4] * segs[s + 1] + T[5];
        const bx = T[0] * segs[s + 2] + T[1] * segs[s + 3] + T[2];
        const by = T[3] * segs[s + 2] + T[4] * segs[s + 3] + T[5];
        const ka = vKey(ax, ay);
        const kb = vKey(bx, by);
        const key = ka < kb ? `${ka}~${kb}` : `${kb}~${ka}`;
        if (seen.has(key)) seen.set(key, null);
        else seen.set(key, Float64Array.of(ax, ay, bx, by));
      }
    }
    let count = 0;
    for (const v of seen.values()) if (v) count++;
    out = new Float64Array(count * 4);
    let w = 0;
    for (const v of seen.values()) {
      if (!v) continue;
      out.set(v, w);
      w += 4;
    }
  }
  boundaryCache.set(node, out);
  return out;
}

/** Chain a node's boundary segments into its (largest) closed loop. */
export function boundaryLoop(node: TileNode, family: TileFamilyId = 'spectre'): Pt[] {
  const segs = boundarySegments(node, family);
  const m = segs.length / 4;
  const adj = new Map<number, number[]>();
  for (let s = 0; s < m; s++) {
    const ka = vKey(segs[s * 4], segs[s * 4 + 1]);
    const kb = vKey(segs[s * 4 + 2], segs[s * 4 + 3]);
    (adj.get(ka) ?? adj.set(ka, []).get(ka)!).push(s);
    (adj.get(kb) ?? adj.set(kb, []).get(kb)!).push(s);
  }
  const used = new Uint8Array(m);
  let bestLoop: Pt[] = [];
  let bestArea = -1;
  for (let start = 0; start < m; start++) {
    if (used[start]) continue;
    const loop: Pt[] = [{ x: segs[start * 4], y: segs[start * 4 + 1] }];
    used[start] = 1;
    let curX = segs[start * 4 + 2];
    let curY = segs[start * 4 + 3];
    const startKey = vKey(loop[0].x, loop[0].y);
    let curKey = vKey(curX, curY);
    let guard = m + 2;
    while (curKey !== startKey && guard-- > 0) {
      loop.push({ x: curX, y: curY });
      const candidates = adj.get(curKey) ?? [];
      let next = -1;
      for (const s of candidates) {
        if (!used[s]) {
          next = s;
          break;
        }
      }
      if (next < 0) break; // open chain — should not happen on a closed patch
      used[next] = 1;
      const ka = vKey(segs[next * 4], segs[next * 4 + 1]);
      if (ka === curKey) {
        curX = segs[next * 4 + 2];
        curY = segs[next * 4 + 3];
      } else {
        curX = segs[next * 4];
        curY = segs[next * 4 + 1];
      }
      curKey = vKey(curX, curY);
    }
    const area = Math.abs(polygonArea(loop));
    if (area > bestArea) {
      bestArea = area;
      bestLoop = loop;
    }
  }
  return bestLoop;
}

// ---------------------------------------------------------------------------
// Decimation (Douglas–Peucker on the closed loop)
// ---------------------------------------------------------------------------

function dpChain(pts: readonly Pt[], lo: number, hi: number, tol2: number, keep: Uint8Array): void {
  const stack: number[] = [lo, hi];
  while (stack.length) {
    const j = stack.pop() as number;
    const i = stack.pop() as number;
    if (j - i < 2) continue;
    const a = pts[i];
    const b = pts[j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    let worst = -1;
    let worstD = tol2;
    for (let k = i + 1; k < j; k++) {
      const px = pts[k].x - a.x;
      const py = pts[k].y - a.y;
      const cross = px * dy - py * dx;
      const d2 = (cross * cross) / len2;
      if (d2 > worstD) {
        worstD = d2;
        worst = k;
      }
    }
    if (worst >= 0) {
      keep[worst] = 1;
      stack.push(i, worst, worst, j);
    }
  }
}

/** Decimate a closed loop to at most `maxPoints` vertices. */
export function decimateLoop(loop: readonly Pt[], maxPoints: number = MAX_GLYPH_POINTS): Pt[] {
  const n = loop.length;
  if (n <= maxPoints) return [...loop];
  // Split anchors: the two mutually farthest of (farthest-from-centroid, its opposite).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of loop) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const diag = Math.hypot(maxX - minX, maxY - minY);
  let a0 = 0;
  let best = -1;
  for (let i = 0; i < n; i++) {
    const d = (loop[i].x - loop[0].x) ** 2 + (loop[i].y - loop[0].y) ** 2;
    if (d > best) {
      best = d;
      a0 = i;
    }
  }
  const rot = [...loop.slice(a0), ...loop.slice(0, a0)];
  let a1 = 0;
  best = -1;
  for (let i = 0; i < n; i++) {
    const d = (rot[i].x - rot[0].x) ** 2 + (rot[i].y - rot[0].y) ** 2;
    if (d > best) {
      best = d;
      a1 = i;
    }
  }
  let tol = diag * 0.002;
  for (let iter = 0; iter < 28; iter++) {
    const keep = new Uint8Array(n);
    keep[0] = 1;
    keep[a1] = 1;
    dpChain(rot, 0, a1, tol * tol, keep);
    dpChain(rot, a1, n - 1, tol * tol, keep);
    let count = 0;
    for (let i = 0; i < n; i++) count += keep[i];
    if (count <= maxPoints) {
      const out: Pt[] = [];
      for (let i = 0; i < n; i++) if (keep[i]) out.push(rot[i]);
      if (out.length >= 4) return out;
    }
    tol *= 1.5;
  }
  // Fallback: uniform stride.
  const stride = Math.ceil(n / maxPoints);
  const out: Pt[] = [];
  for (let i = 0; i < n; i += stride) out.push(rot[i]);
  return out;
}

// ---------------------------------------------------------------------------
// Glyph meshes + level-fit similarity
// ---------------------------------------------------------------------------

export interface GlyphMesh {
  /** TILE_NAMES index (the aggregate `type` byte minus AGGREGATE_TYPE_BASE). */
  readonly typeIndex: number;
  readonly type: TileTypeId;
  /** Decimated closed outline, glyph-level local frame (no repeated end). */
  readonly outline: readonly Pt[];
  /** Unrolled fill triangles (x,y × 3 per triangle), same frame. */
  readonly triVerts: Float32Array;
  /** Leaf tiles the glyph stands for (area check / HUD). */
  readonly tileCount: number;
}

const glyphMeshCache = new Map<string, readonly GlyphMesh[]>();

/** Build (once per family) the nine flavour glyph meshes at `level`. */
export function buildGlyphMeshes(
  level: number = GLYPH_LEVEL,
  family: TileFamilyId = 'spectre',
): readonly GlyphMesh[] {
  const key = `${family}:${level}`;
  const hit = glyphMeshCache.get(key);
  if (hit) return hit;
  const sys = buildSystem(family, level);
  const meshes = TILE_NAMES.map((name, typeIndex) => {
    const node = sys[name];
    const outline = decimateLoop(boundaryLoop(node, family));
    const tris = earClip(outline);
    const triVerts = new Float32Array(tris.length * 2);
    for (let i = 0; i < tris.length; i++) {
      triVerts[i * 2] = outline[tris[i]].x;
      triVerts[i * 2 + 1] = outline[tris[i]].y;
    }
    return { typeIndex, type: name, outline, triVerts, tileCount: countTiles(node) };
  });
  glyphMeshCache.set(key, meshes);
  return meshes;
}

/**
 * Per-leaf-type meshes for one family, vertex-pull-table shaped: one row per
 * `leafOrder(family)` entry (= the engine's leaf type byte), fill triangles
 * unrolled and padded to a common length (degenerate repeats of the last
 * vertex — zero raster area), and outlines likewise padded by repeating the
 * last point (zero-length `LINE_LOOP` segments draw nothing).
 *
 * This is what lets one instanced draw call fill ANY mix of leaf types — the
 * hat family's Gamma2 is a turtle, so a single shared mesh stopped being
 * enough the moment families arrived. For spectre/hex every row holds the
 * same polygon and the table degenerates to the old single-mesh behaviour.
 */
export interface LeafAtlas {
  readonly family: TileFamilyId;
  /** Rows (= leaf type bytes = `leafOrder(family).length`). */
  readonly rows: number;
  /** Unrolled fill triangles per row, padded: `fillVerts` x,y pairs each. */
  readonly fill: Float32Array;
  readonly fillVerts: number;
  /** Outline vertices per row, padded: `outlineVerts` x,y pairs each. */
  readonly outline: Float32Array;
  readonly outlineVerts: number;
  /** Outline point count per row BEFORE padding (Canvas2D path building). */
  readonly outlineCounts: readonly number[];
}

const leafAtlasCache = new Map<TileFamilyId, LeafAtlas>();

export function buildLeafAtlas(family: TileFamilyId): LeafAtlas {
  const hit = leafAtlasCache.get(family);
  if (hit) return hit;
  const order = leafOrder(family);
  const outlines = order.map((type) => leafPts(family, type));
  const triLists = outlines.map((pts) => {
    const tris = earClip(pts);
    const verts = new Float32Array(tris.length * 2);
    for (let i = 0; i < tris.length; i++) {
      verts[i * 2] = pts[tris[i]].x;
      verts[i * 2 + 1] = pts[tris[i]].y;
    }
    return verts;
  });
  let fillVerts = 0;
  for (const t of triLists) fillVerts = Math.max(fillVerts, t.length / 2);
  let outlineVerts = 0;
  for (const o of outlines) outlineVerts = Math.max(outlineVerts, o.length);

  const fill = new Float32Array(order.length * fillVerts * 2);
  triLists.forEach((t, row) => {
    const base = row * fillVerts * 2;
    fill.set(t, base);
    const lastX = t[t.length - 2];
    const lastY = t[t.length - 1];
    for (let v = t.length / 2; v < fillVerts; v++) {
      fill[base + v * 2] = lastX;
      fill[base + v * 2 + 1] = lastY;
    }
  });
  const outline = new Float32Array(order.length * outlineVerts * 2);
  outlines.forEach((pts, row) => {
    const base = row * outlineVerts * 2;
    pts.forEach((p, i) => {
      outline[base + i * 2] = p.x;
      outline[base + i * 2 + 1] = p.y;
    });
    const last = pts[pts.length - 1];
    for (let v = pts.length; v < outlineVerts; v++) {
      outline[base + v * 2] = last.x;
      outline[base + v * 2 + 1] = last.y;
    }
  });

  const atlas: LeafAtlas = {
    family,
    rows: order.length,
    fill,
    fillVerts,
    outline,
    outlineVerts,
    outlineCounts: outlines.map((o) => o.length),
  };
  leafAtlasCache.set(family, atlas);
  return atlas;
}

/**
 * Least-squares similarity (rotation+scale+translation, optionally mirrored)
 * mapping `src` onto `dst` — complex regression `w ≈ a·z + b` vs
 * `w ≈ a·conj(z) + b`, whichever fits better.
 */
export function fitSimilarity(src: readonly Pt[], dst: readonly Pt[]): Affine {
  const n = src.length;
  let zx = 0;
  let zy = 0;
  let wx = 0;
  let wy = 0;
  for (let i = 0; i < n; i++) {
    zx += src[i].x;
    zy += src[i].y;
    wx += dst[i].x;
    wy += dst[i].y;
  }
  zx /= n;
  zy /= n;
  wx /= n;
  wy /= n;

  const solve = (mirror: boolean): { M: Affine; res: number } => {
    // z~ optionally conjugated; a = Σ w~·conj(z~) / Σ|z~|²
    let nr = 0;
    let ni = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      const zrx = src[i].x - zx;
      const zry = mirror ? -(src[i].y - zy) : src[i].y - zy;
      const wrx = dst[i].x - wx;
      const wry = dst[i].y - wy;
      nr += wrx * zrx + wry * zry;
      ni += wry * zrx - wrx * zry;
      den += zrx * zrx + zry * zry;
    }
    const p = nr / (den || 1);
    const q = ni / (den || 1);
    // w = (p+qi)(x ± iy) + b
    const M: Affine = mirror
      ? [p, q, 0, q, -p, 0]
      : [p, -q, 0, q, p, 0];
    const bx = wx - (M[0] * zx + M[1] * zy);
    const by = wy - (M[3] * zx + M[4] * zy);
    const F: Affine = [M[0], M[1], bx, M[3], M[4], by];
    let res = 0;
    for (let i = 0; i < n; i++) {
      const ex = F[0] * src[i].x + F[1] * src[i].y + F[2] - dst[i].x;
      const ey = F[3] * src[i].x + F[4] * src[i].y + F[5] - dst[i].y;
      res += ex * ex + ey * ey;
    }
    return { M: F, res };
  };

  const direct = solve(false);
  const mirrored = solve(true);
  return direct.res <= mirrored.res ? direct.M : mirrored.M;
}

const fitCache = new Map<string, Affine>();

/**
 * Similarity mapping the glyph-level local frame into the level-`cutLevel`
 * local frame, fitted on the levels' key-point quads (shared by all nine
 * flavours — `buildSupertiles` computes one superQuad per level). Always a
 * direct similarity (see the module note on mirror parity).
 */
export function glyphFitForCut(
  cutLevel: number,
  glyphLevel: number = GLYPH_LEVEL,
  family: TileFamilyId = 'spectre',
): Affine {
  const c = Math.max(1, Math.round(cutLevel));
  const key = `${family}:${glyphLevel}>${c}`;
  const hit = fitCache.get(key);
  if (hit) return hit;
  const srcQuad = buildSystem(family, glyphLevel)['Delta'].quad;
  const dstQuad = buildSystem(family, c)['Delta'].quad;
  const M = fitSimilarity(srcQuad, dstQuad);
  fitCache.set(key, M);
  return M;
}
