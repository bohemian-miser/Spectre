/**
 * The dual of the strand graph on a rooted patch.
 *
 * The strands (the lines through the selected edges) cut the patch into
 * regions. The dual has one node per region and one edge per pair of regions
 * that a strand separates — "step over this line and you are in that region".
 * The strands never cross, and every complete strand either closes into a
 * circuit or runs edge to edge across the patch, so each one splits the patch
 * in two: without junctions or dead ends the dual is a TREE, and a region's
 * depth (strands crossed to reach it from the patch edge) is how deeply it is
 * nested inside circuits.
 *
 * How it is built, without any global geometry:
 *  1. Per leaf type, the tile's non-crossing chords cut its polygon into
 *     chords + 1 pieces. Pieces are found combinatorially from the cyclic
 *     order of the chord ends around the tile boundary.
 *  2. Every tile edge is split at the chord ends into sub-segments, each
 *     owned by one piece. Two tiles that share a sub-segment have pieces in
 *     the same region (nothing separates them there), so pieces are unioned
 *     by sub-segment midpoint. A sub-segment seen once is on the patch edge.
 *  3. Each chord has a piece on either side; their regions are the ends of
 *     its dual edge. Chords with the same region on both sides belong to a
 *     strand that dead-ends inside the patch (a tile with an odd count draws
 *     nothing), so they separate nothing and are counted, not drawn.
 */

import type { Segment } from './circuits';
import { leafPts, type TileFamilyId } from './families';
import { transPt, type Pt } from './geom';
import type { TileInstance } from './tiles';

export interface DualInput {
  readonly family: TileFamilyId;
  readonly instances: readonly TileInstance[];
  /** Tile-local chords per leaf type (as `analyze` draws them). */
  readonly chords: Readonly<Record<string, readonly Segment[]>>;
  /** Also return every piece polygon (for filling regions). Default true. */
  readonly withPieces?: boolean;
}

export interface DualEdge {
  readonly a: number;
  readonly b: number;
  /** Strand segments (chords) between the two regions. */
  readonly segments: number;
  /** Midpoint of one of those chords — where the dual edge crosses its strand. */
  readonly x: number;
  readonly y: number;
}

export interface DualGraph {
  /** Region count (dual nodes). */
  readonly nRegions: number;
  /** Per region: a point inside it (the centroid of its most central piece). */
  readonly regionX: Float64Array;
  readonly regionY: Float64Array;
  readonly regionArea: Float64Array;
  /** Per region: pieces (tile fragments) it is made of. */
  readonly regionPieces: Int32Array;
  /** Per region: 1 if it touches the edge of the patch. */
  readonly regionBoundary: Uint8Array;
  /** Per region: strands crossed to reach it from the patch edge. */
  readonly regionDepth: Int32Array;
  readonly edges: readonly DualEdge[];
  readonly maxDepth: number;
  /** Connected with exactly nRegions - 1 edges. */
  readonly isTree: boolean;
  /** Edge count minus (nRegions - 1): independent cycles of the dual. */
  readonly cycleRank: number;
  /** Chords with the same region on both sides (dead-end strands). */
  readonly danglingChords: number;
  /** Tiles whose chords cross, or end off the tile boundary: no planar dual there. */
  readonly badTiles: number;
  /** Piece polygons, flattened: piece p is points pieceStart[p]..pieceStart[p+1]. */
  readonly pieceStart?: Int32Array;
  readonly pieceXY?: Float64Array;
  readonly pieceRegion?: Int32Array;
}

/** Tile-local piece structure of one leaf type under one set of chords. */
interface LocalPieces {
  /** Piece polygons, tile-local. */
  readonly polys: readonly (readonly Pt[])[];
  readonly area: readonly number[];
  readonly cx: readonly number[];
  readonly cy: readonly number[];
  /** Boundary sub-segment midpoints and the piece owning each. */
  readonly subMid: readonly Pt[];
  readonly subPiece: readonly number[];
  /** Per chord: midpoint and the pieces on its two sides. */
  readonly chordMid: readonly Pt[];
  readonly chordSides: readonly (readonly [number, number])[];
  /** Chords crossed or left the boundary: treated as one uncut piece. */
  readonly bad: boolean;
}

const ON_EDGE_EPS = 1e-6;

/** Boundary parameter s = edge index + t of a point on the polygon, or -1. */
function boundaryParam(poly: readonly Pt[], p: Pt): number {
  const n = poly.length;
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0;
    t = Math.min(1, Math.max(0, t));
    const ex = a.x + t * dx - p.x;
    const ey = a.y + t * dy - p.y;
    const d = ex * ex + ey * ey;
    if (d < bestD) {
      bestD = d;
      // A point on a vertex reads as the start of the next edge.
      best = t >= 1 - 1e-12 ? (i + 1) % n : i + t;
    }
  }
  return bestD <= ON_EDGE_EPS ? best : -1;
}

/**
 * Area (signed: positive when wound like the tile, `orient`) and centroid. A
 * chord drawn straight across a reflex corner leaves the tile, and the corner
 * piece it cuts off then winds backwards: its area counts negative, so the
 * pieces still add up to the tile.
 */
function polyAreaCentroid(pts: readonly Pt[], orient = 1): { area: number; cx: number; cy: number } {
  let a2 = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const c = p.x * q.y - q.x * p.y;
    a2 += c;
    sx += (p.x + q.x) * c;
    sy += (p.y + q.y) * c;
  }
  // Thin slivers (a chord hugging the boundary) have next to no area, and
  // their area centroid flies off; fall back to the vertex mean there.
  let mx = 0;
  let my = 0;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    mx += p.x;
    my += p.y;
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  const cx = Math.abs(a2) > 1e-12 ? sx / (3 * a2) : NaN;
  const cy = Math.abs(a2) > 1e-12 ? sy / (3 * a2) : NaN;
  if (!(cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1)) {
    return { area: (orient * a2) / 2, cx: mx / pts.length, cy: my / pts.length };
  }
  return { area: (orient * a2) / 2, cx, cy };
}

function signedArea2(pts: readonly Pt[]): number {
  let a2 = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a2 += p.x * q.y - q.x * p.y;
  }
  return a2;
}

function pointAt(poly: readonly Pt[], s: number): Pt {
  const n = poly.length;
  const i = Math.floor(s) % n;
  const t = s - Math.floor(s);
  const a = poly[i];
  const b = poly[(i + 1) % n];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function wholeTile(poly: readonly Pt[], bad: boolean): LocalPieces {
  const n = poly.length;
  const { area, cx, cy } = polyAreaCentroid(poly, Math.sign(signedArea2(poly)));
  const subMid: Pt[] = [];
  for (let i = 0; i < n; i++) subMid.push(pointAt(poly, i + 0.5));
  return {
    polys: [poly],
    area: [area],
    cx: [cx],
    cy: [cy],
    subMid,
    subPiece: subMid.map(() => 0),
    chordMid: [],
    chordSides: [],
    bad,
  };
}

/** Cut one tile polygon by its chords (exported for tests). */
export function localPieces(poly: readonly Pt[], chords: readonly Segment[]): LocalPieces {
  const n = poly.length;
  if (chords.length === 0) return wholeTile(poly, false);

  // Chord ends on the boundary, in cyclic order.
  const ends: { s: number; chord: number }[] = [];
  for (let c = 0; c < chords.length; c++) {
    for (const p of chords[c]) {
      const s = boundaryParam(poly, p);
      if (s < 0) return wholeTile(poly, true);
      ends.push({ s, chord: c });
    }
  }
  ends.sort((x, y) => x.s - y.s);
  const m = ends.length;
  const posOf: number[][] = chords.map(() => []);
  ends.forEach((e, i) => posOf[e.chord].push(i));

  // Non-crossing check: chord intervals must nest or be disjoint.
  const iv = posOf.map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as const);
  for (let i = 0; i < iv.length; i++) {
    for (let j = i + 1; j < iv.length; j++) {
      const [a1, a2] = iv[i];
      const [b1, b2] = iv[j];
      if ((a1 < b1 && b1 < a2 && a2 < b2) || (b1 < a1 && a1 < b2 && b2 < a2)) {
        return wholeTile(poly, true);
      }
    }
  }

  // Arc i runs from end i to end i+1. Walking a piece's boundary, the arc
  // arriving at a chord end continues, across the chord, with the arc
  // leaving its partner: union(arc a-1, arc b) and union(arc b-1, arc a).
  const parent = Array.from({ length: m }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]];
    return x;
  };
  const partnerPos = new Array<number>(m);
  for (const [a, b] of posOf) {
    partnerPos[a] = b;
    partnerPos[b] = a;
    parent[find((a - 1 + m) % m)] = find(b);
    parent[find((b - 1 + m) % m)] = find(a);
  }
  const pieceOfRoot = new Map<number, number>();
  const arcPiece = new Array<number>(m);
  for (let i = 0; i < m; i++) {
    const r = find(i);
    let p = pieceOfRoot.get(r);
    if (p === undefined) {
      p = pieceOfRoot.size;
      pieceOfRoot.set(r, p);
    }
    arcPiece[i] = p;
  }
  const nPieces = pieceOfRoot.size;

  // Piece polygons: follow an arc, jump its closing chord, repeat.
  const polys: Pt[][] = [];
  const seenArc = new Array<boolean>(m).fill(false);
  const polyOfPiece = new Array<Pt[]>(nPieces);
  for (let start = 0; start < m; start++) {
    if (seenArc[start]) continue;
    const pts: Pt[] = [];
    let arc = start;
    while (!seenArc[arc]) {
      seenArc[arc] = true;
      const s0 = ends[arc].s;
      let s1 = ends[(arc + 1) % m].s;
      if (arc === m - 1) s1 += n; // the last arc wraps past vertex 0
      pts.push(pointAt(poly, s0));
      for (let v = Math.floor(s0) + 1; v < s1; v++) pts.push(poly[v % n]);
      pts.push(pointAt(poly, s1 % n));
      arc = partnerPos[(arc + 1) % m];
    }
    polyOfPiece[arcPiece[start]] = pts;
  }
  for (let p = 0; p < nPieces; p++) polys.push(polyOfPiece[p]);

  const area: number[] = [];
  const cx: number[] = [];
  const cy: number[] = [];
  const orient = Math.sign(signedArea2(poly));
  for (const pts of polys) {
    const r = polyAreaCentroid(pts, orient);
    area.push(r.area);
    cx.push(r.cx);
    cy.push(r.cy);
  }

  // Boundary sub-segments: polygon edges split at the chord ends.
  const breaks: number[] = [];
  for (let v = 0; v < n; v++) breaks.push(v);
  for (const e of ends) if (e.s !== Math.floor(e.s)) breaks.push(e.s);
  breaks.sort((x, y) => x - y);
  const subMid: Pt[] = [];
  const subPiece: number[] = [];
  // The arc holding [s0, s1] is the one leaving the last end at or before
  // s0; before the first end it is the last arc, wrapping past vertex 0.
  let arc = m - 1;
  let next = 0;
  for (let i = 0; i < breaks.length; i++) {
    const s0 = breaks[i];
    const s1 = i + 1 < breaks.length ? breaks[i + 1] : n;
    while (next < m && ends[next].s <= s0) arc = next++;
    if (s1 - s0 < 1e-12) continue;
    subMid.push(pointAt(poly, (s0 + s1) / 2));
    subPiece.push(arcPiece[arc]);
  }

  const chordMid: Pt[] = [];
  const chordSides: [number, number][] = [];
  for (let c = 0; c < chords.length; c++) {
    const [a] = iv[c];
    chordMid.push({
      x: (chords[c][0].x + chords[c][1].x) / 2,
      y: (chords[c][0].y + chords[c][1].y) / 2,
    });
    chordSides.push([arcPiece[a], arcPiece[(a - 1 + m) % m]]);
  }

  return { polys, area, cx, cy, subMid, subPiece, chordMid, chordSides, bad: false };
}

/** Numeric key for a world point on a 1/1000 grid (exact as a double up to ±3e7 per axis). */
function midKey(x: number, y: number): number {
  return (Math.round(x * 1000) + 33554432) * 67108864 + (Math.round(y * 1000) + 33554432);
}

/** Build the dual of the strand graph over a patch of tile instances. */
export function buildDualGraph(input: DualInput): DualGraph {
  const withPieces = input.withPieces ?? true;
  const cache = new Map<string, LocalPieces>();
  const local = (type: string): LocalPieces => {
    let lp = cache.get(type);
    if (!lp) {
      lp = localPieces(leafPts(input.family, type as never), input.chords[type] ?? []);
      cache.set(type, lp);
    }
    return lp;
  };

  const insts = input.instances;
  const pieceOff = new Int32Array(insts.length + 1);
  let badTiles = 0;
  for (let i = 0; i < insts.length; i++) {
    const lp = local(insts[i].type);
    if (lp.bad) badTiles++;
    pieceOff[i + 1] = pieceOff[i] + lp.polys.length;
  }
  const nPieces = pieceOff[insts.length];

  const parent = new Int32Array(nPieces);
  for (let i = 0; i < nPieces; i++) parent[i] = i;
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };

  // Weld pieces across shared sub-segments; count how often each is seen.
  let nSubs = 0;
  for (const inst of insts) nSubs += local(inst.type).subMid.length;
  // One slot per distinct sub-segment: its first piece and how often it is seen.
  const slotOf = new Map<number, number>();
  const slotPiece = new Int32Array(nSubs);
  const slotSeen = new Uint8Array(nSubs);
  for (let i = 0; i < insts.length; i++) {
    const lp = local(insts[i].type);
    const [a, b, c, d, e, f] = insts[i].xform;
    for (let s = 0; s < lp.subMid.length; s++) {
      const p = lp.subMid[s];
      const key = midKey(a * p.x + b * p.y + c, d * p.x + e * p.y + f);
      const g = pieceOff[i] + lp.subPiece[s];
      let slot = slotOf.get(key);
      if (slot === undefined) {
        slot = slotOf.size;
        slotOf.set(key, slot);
        slotPiece[slot] = g;
      } else {
        const ra = find(slotPiece[slot]);
        const rb = find(g);
        if (ra !== rb) parent[ra] = rb;
      }
      if (slotSeen[slot] < 255) slotSeen[slot]++;
    }
  }

  // Regions.
  const regionOfRoot = new Int32Array(nPieces).fill(-1);
  const pieceRegion = new Int32Array(nPieces);
  let nRegions = 0;
  for (let p = 0; p < nPieces; p++) {
    const r = find(p);
    if (regionOfRoot[r] === -1) regionOfRoot[r] = nRegions++;
    pieceRegion[p] = regionOfRoot[r];
  }

  const regionArea = new Float64Array(nRegions);
  const sumW = new Float64Array(nRegions);
  const sumX = new Float64Array(nRegions);
  const sumY = new Float64Array(nRegions);
  const regionPieces = new Int32Array(nRegions);
  const regionBoundary = new Uint8Array(nRegions);
  const pcx = new Float64Array(nPieces);
  const pcy = new Float64Array(nPieces);
  const pArea = new Float64Array(nPieces);
  for (let i = 0; i < insts.length; i++) {
    const lp = local(insts[i].type);
    const xf = insts[i].xform;
    for (let k = 0; k < lp.polys.length; k++) {
      const g = pieceOff[i] + k;
      const r = pieceRegion[g];
      const c = transPt(xf, { x: lp.cx[k], y: lp.cy[k] });
      pcx[g] = c.x;
      pcy[g] = c.y;
      pArea[g] = lp.area[k];
      const w = Math.abs(lp.area[k]);
      regionArea[r] += lp.area[k];
      sumW[r] += w;
      sumX[r] += c.x * w;
      sumY[r] += c.y * w;
      regionPieces[r]++;
    }
  }
  for (let k = 0; k < slotOf.size; k++) {
    if (slotSeen[k] === 1) regionBoundary[pieceRegion[slotPiece[k]]] = 1;
  }

  // A node per region: the piece centroid nearest the region's centroid, so
  // the node sits inside the region even when the region is an annulus.
  // Inverted corner slivers (negative area, outside their tile) only count
  // when a region has nothing else.
  const regionX = new Float64Array(nRegions);
  const regionY = new Float64Array(nRegions);
  const bestD = new Float64Array(nRegions).fill(Infinity);
  const hasReal = new Uint8Array(nRegions);
  for (let g = 0; g < nPieces; g++) if (pArea[g] > 0) hasReal[pieceRegion[g]] = 1;
  for (let g = 0; g < nPieces; g++) {
    const r = pieceRegion[g];
    if (hasReal[r] && !(pArea[g] > 0)) continue;
    const a = sumW[r];
    const mx = a > 0 ? sumX[r] / a : pcx[g];
    const my = a > 0 ? sumY[r] / a : pcy[g];
    const d = (pcx[g] - mx) ** 2 + (pcy[g] - my) ** 2;
    if (d < bestD[r]) {
      bestD[r] = d;
      regionX[r] = pcx[g];
      regionY[r] = pcy[g];
    }
  }

  // Dual edges, one per pair of regions a strand separates.
  const edgeIndex = new Map<number, number>();
  const ea: number[] = [];
  const eb: number[] = [];
  const eSegs: number[] = [];
  const ex: number[] = [];
  const ey: number[] = [];
  let danglingChords = 0;
  for (let i = 0; i < insts.length; i++) {
    const lp = local(insts[i].type);
    for (let c = 0; c < lp.chordSides.length; c++) {
      const [p, q] = lp.chordSides[c];
      let a = pieceRegion[pieceOff[i] + p];
      let b = pieceRegion[pieceOff[i] + q];
      if (a === b) {
        danglingChords++;
        continue;
      }
      if (a > b) [a, b] = [b, a];
      const key = a * nRegions + b;
      const e = edgeIndex.get(key);
      if (e === undefined) {
        const m = transPt(insts[i].xform, lp.chordMid[c]);
        edgeIndex.set(key, ea.length);
        ea.push(a);
        eb.push(b);
        eSegs.push(1);
        ex.push(m.x);
        ey.push(m.y);
      } else {
        eSegs[e]++;
      }
    }
  }
  const edges: DualEdge[] = ea.map((a, i) => ({ a, b: eb[i], segments: eSegs[i], x: ex[i], y: ey[i] }));

  // Depth: multi-source BFS from the regions on the patch edge.
  const adjStart = new Int32Array(nRegions + 1);
  for (const e of edges) {
    adjStart[e.a + 1]++;
    adjStart[e.b + 1]++;
  }
  for (let r = 0; r < nRegions; r++) adjStart[r + 1] += adjStart[r];
  const fill = adjStart.slice(0, nRegions);
  const adj = new Int32Array(adjStart[nRegions]);
  for (const e of edges) {
    adj[fill[e.a]++] = e.b;
    adj[fill[e.b]++] = e.a;
  }
  const regionDepth = new Int32Array(nRegions).fill(-1);
  const queue = new Int32Array(nRegions);
  let qh = 0;
  let qt = 0;
  for (let r = 0; r < nRegions; r++) {
    if (regionBoundary[r]) {
      regionDepth[r] = 0;
      queue[qt++] = r;
    }
  }
  if (qt === 0 && nRegions > 0) {
    regionDepth[0] = 0;
    queue[qt++] = 0;
  }
  let maxDepth = 0;
  for (;;) {
    while (qh < qt) {
      const r = queue[qh++];
      for (let k = adjStart[r]; k < adjStart[r + 1]; k++) {
        const s = adj[k];
        if (regionDepth[s] === -1) {
          regionDepth[s] = regionDepth[r] + 1;
          if (regionDepth[s] > maxDepth) maxDepth = regionDepth[s];
          queue[qt++] = s;
        }
      }
    }
    // Unreached (cannot happen in a connected patch, but never leave -1).
    const r = regionDepth.indexOf(-1);
    if (r === -1) break;
    regionDepth[r] = 0;
    queue[qt++] = r;
  }

  // Components of the dual, for the tree test.
  let components = 0;
  {
    const seenR = new Uint8Array(nRegions);
    for (let r = 0; r < nRegions; r++) {
      if (seenR[r]) continue;
      components++;
      let h = 0;
      let t = 0;
      queue[t++] = r;
      seenR[r] = 1;
      while (h < t) {
        const x = queue[h++];
        for (let k = adjStart[x]; k < adjStart[x + 1]; k++) {
          if (!seenR[adj[k]]) {
            seenR[adj[k]] = 1;
            queue[t++] = adj[k];
          }
        }
      }
    }
  }
  const cycleRank = edges.length - nRegions + components;

  let pieceStart: Int32Array | undefined;
  let pieceXY: Float64Array | undefined;
  if (withPieces) {
    pieceStart = new Int32Array(nPieces + 1);
    let total = 0;
    for (let i = 0; i < insts.length; i++) {
      const lp = local(insts[i].type);
      for (let k = 0; k < lp.polys.length; k++) {
        total += lp.polys[k].length;
        pieceStart[pieceOff[i] + k + 1] = total;
      }
    }
    pieceXY = new Float64Array(total * 2);
    let o = 0;
    for (let i = 0; i < insts.length; i++) {
      const lp = local(insts[i].type);
      for (const poly of lp.polys) {
        for (const p of poly) {
          const w = transPt(insts[i].xform, p);
          pieceXY[o++] = w.x;
          pieceXY[o++] = w.y;
        }
      }
    }
  }

  return {
    nRegions,
    regionX,
    regionY,
    regionArea,
    regionPieces,
    regionBoundary,
    regionDepth,
    edges,
    maxDepth,
    isTree: components === 1 && cycleRank === 0,
    cycleRank,
    danglingChords,
    badTiles,
    pieceStart,
    pieceXY,
    pieceRegion: withPieces ? pieceRegion : undefined,
  };
}
