/**
 * Shared helpers for the FASS investigation of selection 1278 (docs/FASS_1278.md).
 *
 * Everything here builds ONLY on web/src/core (read-only, verified library).
 * Run scripts with:  cd web && npx --yes tsx fass-investigation/<script>.ts
 */

import {
  buildSystem,
  flatten,
  leafOrder,
  leafPts,
  localChords,
  weldSegments,
  pointKey,
  comboToMatchingIndices,
  type Pt,
  type Segment,
  type TileFamilyId,
  type TileTypeId,
  type TileInstance,
  type TileNode,
  transPt,
  dist,
} from '../src/core';

export const FAMILY: TileFamilyId = 'spectre';
export const SUBSET_1278: readonly number[] = [1, 2, 7, 8];

/** matchingIndexByType record for a combo string (leafOrder aligned). */
export function matchingRecord(combo: string): Record<string, number> {
  const idxs = comboToMatchingIndices(FAMILY, SUBSET_1278, combo);
  const rec: Record<string, number> = {};
  leafOrder(FAMILY).forEach((t, i) => {
    rec[t] = idxs[i];
  });
  return rec;
}

export interface Patch {
  readonly root: TileNode;
  readonly instances: readonly TileInstance[];
}

export function buildPatch(rootTile: TileTypeId, level: number): Patch {
  const root = buildSystem(FAMILY, level)[rootTile];
  return { root, instances: flatten(root) };
}

/** Segments tagged with their owning instance (parallel arrays after weld). */
export interface TaggedSegments {
  /** Welded world-space segments. */
  readonly segs: readonly Segment[];
  /** instances[instOf[i]] owns segs[i]. */
  readonly instOf: readonly number[];
  readonly instances: readonly TileInstance[];
}

/** collectSegments + weldSegments, but keeping the per-segment tile tag. */
export function collectTagged(
  instances: readonly TileInstance[],
  combo: string,
): TaggedSegments {
  const selected = new Set(SUBSET_1278);
  const rec = matchingRecord(combo);
  const cache = new Map<string, readonly Segment[]>();
  const raw: Segment[] = [];
  const instOf: number[] = [];
  for (let ii = 0; ii < instances.length; ii++) {
    const inst = instances[ii];
    let local = cache.get(inst.type);
    if (!local) {
      local = localChords(FAMILY, inst.type, selected, rec[inst.type] ?? 0);
      cache.set(inst.type, local);
    }
    for (const [a, b] of local) {
      raw.push([transPt(inst.xform, a), transPt(inst.xform, b)]);
      instOf.push(ii);
    }
  }
  // weldSegments returns welded segments ALIGNED WITH INPUT ORDER, so the
  // instOf tags stay valid by index.
  return { segs: weldSegments(raw), instOf, instances };
}

export interface IndexedPath {
  readonly segIdxs: readonly number[];
  /** Welded point keys along the path (closed paths: first key not repeated). */
  readonly keys: readonly string[];
  readonly closed: boolean;
}

export interface IndexedTrace {
  readonly circuits: readonly IndexedPath[];
  readonly tails: readonly IndexedPath[];
  readonly junctionCount: number;
  /** welded point key -> degree */
  readonly degree: ReadonlyMap<string, number>;
  readonly coords: ReadonlyMap<string, Pt>;
}

/**
 * Same algorithm as core tracePaths (junction-safe), but reports which
 * segment indices each path uses, over an arbitrary SUBSET of the segment
 * index space (so a child sub-patch can be traced inside a globally welded
 * segment list).
 */
export function traceIndexed(
  segs: readonly Segment[],
  include?: readonly number[],
): IndexedTrace {
  const idxs = include ?? segs.map((_, i) => i);
  const coords = new Map<string, Pt>();
  const adj = new Map<string, { seg: number; other: string }[]>();
  const usable: { a: string; b: string; orig: number }[] = [];

  for (const i of idxs) {
    const [p1, p2] = segs[i];
    const k1 = pointKey(p1);
    const k2 = pointKey(p2);
    if (k1 === k2) continue;
    coords.set(k1, p1);
    coords.set(k2, p2);
    const si = usable.length;
    usable.push({ a: k1, b: k2, orig: i });
    if (!adj.has(k1)) adj.set(k1, []);
    if (!adj.has(k2)) adj.set(k2, []);
    adj.get(k1)!.push({ seg: si, other: k2 });
    adj.get(k2)!.push({ seg: si, other: k1 });
  }

  const used = new Array<boolean>(usable.length).fill(false);
  const degree = new Map<string, number>();
  let junctionCount = 0;
  for (const [k, inc] of adj) {
    degree.set(k, inc.length);
    if (inc.length >= 3) junctionCount++;
  }

  const circuits: IndexedPath[] = [];
  const tails: IndexedPath[] = [];

  const walkFrom = (startKey: string, startSeg: number): IndexedPath => {
    const keys: string[] = [startKey];
    const segIdxs: number[] = [];
    let cur = startKey;
    let segIdx = startSeg;
    for (;;) {
      used[segIdx] = true;
      segIdxs.push(usable[segIdx].orig);
      const s = usable[segIdx];
      const next = s.a === cur ? s.b : s.a;
      keys.push(next);
      if (next === startKey) break;
      if ((adj.get(next)?.length ?? 0) !== 2) break;
      const cont = adj.get(next)!.find((x) => !used[x.seg]);
      if (!cont) break;
      cur = next;
      segIdx = cont.seg;
    }
    const closed = keys.length > 2 && keys[0] === keys[keys.length - 1];
    return { segIdxs, keys: closed ? keys.slice(0, -1) : keys, closed };
  };

  for (const [key, inc] of adj) {
    if (inc.length === 2) continue;
    for (const x of inc) {
      if (used[x.seg]) continue;
      const p = walkFrom(key, x.seg);
      (p.closed ? circuits : tails).push(p);
    }
  }
  for (let i = 0; i < usable.length; i++) {
    if (used[i]) continue;
    const p = walkFrom(usable[i].a, i);
    (p.closed ? circuits : tails).push(p);
  }

  return { circuits, tails, junctionCount, degree, coords };
}

// ---------------------------------------------------------------------------
// Patch outline (boundary polygon) via edge cancellation
// ---------------------------------------------------------------------------

function vFix(v: number): string {
  const r = v.toFixed(3);
  return r === '-0.000' ? '0.000' : r;
}

function vKey(p: Pt): string {
  // 3 decimals like core pointKey (with a -0.000 -> 0.000 normalization):
  // safe because distinct tile vertices are never closer than ~0.5 world
  // units while fp error is ~1e-9.
  return `${vFix(p.x)},${vFix(p.y)}`;
}

export interface Outline {
  /** Boundary vertices in cyclic order (canonical start + direction). */
  readonly loop: readonly Pt[];
  readonly loopKeys: readonly string[];
  /** Cumulative arc length at each vertex (loop[0] -> 0). */
  readonly cum: readonly number[];
  readonly totalLen: number;
}

/**
 * Boundary of a patch: every physical tile edge appearing exactly once.
 * Asserts a single closed loop (the patches here are simply connected).
 * Canonicalized to start at the outline vertex coinciding with quad[0] and to
 * run so that quad[1] is reached before quad[3] — a chirality-stable rule, so
 * the labelling survives the per-level mirror flip of buildSupertiles.
 */
export function patchOutline(
  instances: readonly TileInstance[],
  quad: readonly Pt[],
): Outline {
  const edgeCount = new Map<string, { a: Pt; b: Pt; n: number }>();
  for (const inst of instances) {
    const pts = leafPts(FAMILY, inst.type);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = transPt(inst.xform, pts[i]);
      const b = transPt(inst.xform, pts[(i + 1) % n]);
      const ka = vKey(a);
      const kb = vKey(b);
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const hit = edgeCount.get(key);
      if (hit) hit.n += 1;
      else edgeCount.set(key, { a, b, n: 1 });
    }
  }
  const boundary = [...edgeCount.values()].filter((e) => e.n === 1);
  for (const e of edgeCount.values()) {
    if (e.n > 2) throw new Error(`edge shared by ${e.n} tiles — not edge-to-edge?`);
  }

  // Chain into a loop.
  const nbr = new Map<string, { key: string; pt: Pt }[]>();
  const coord = new Map<string, Pt>();
  for (const e of boundary) {
    const ka = vKey(e.a);
    const kb = vKey(e.b);
    coord.set(ka, e.a);
    coord.set(kb, e.b);
    if (!nbr.has(ka)) nbr.set(ka, []);
    if (!nbr.has(kb)) nbr.set(kb, []);
    nbr.get(ka)!.push({ key: kb, pt: e.b });
    nbr.get(kb)!.push({ key: ka, pt: e.a });
  }
  for (const [k, list] of nbr) {
    if (list.length !== 2) throw new Error(`boundary vertex ${k} has degree ${list.length}`);
  }

  const startKey = vKey(boundary[0].a);
  const loopKeysRaw: string[] = [startKey];
  let prev = '';
  let cur = startKey;
  for (;;) {
    const nexts = nbr.get(cur)!.filter((x) => x.key !== prev);
    const next = nexts.length ? nexts[0].key : nbr.get(cur)![0].key;
    if (next === startKey) break;
    loopKeysRaw.push(next);
    prev = cur;
    cur = next;
    if (loopKeysRaw.length > boundary.length + 1) throw new Error('outline did not close');
  }
  if (loopKeysRaw.length !== boundary.length) {
    throw new Error(
      `outline loop has ${loopKeysRaw.length} vertices but ${boundary.length} boundary edges — multiple loops?`,
    );
  }

  // Canonicalize: rotate to quad[0], orient so quad[1] precedes quad[3].
  const findAnchor = (q: Pt): number => {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < loopKeysRaw.length; i++) {
      const d = dist(coord.get(loopKeysRaw[i])!, q);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (bestD > 1e-6) {
      throw new Error(`quad anchor not on outline (nearest ${bestD.toFixed(6)})`);
    }
    return best;
  };
  const n = loopKeysRaw.length;
  const i0 = findAnchor(quad[0]);
  const i1 = findAnchor(quad[1]);
  const i3 = findAnchor(quad[3]);
  const fwd1 = (i1 - i0 + n) % n;
  const fwd3 = (i3 - i0 + n) % n;
  const forward = fwd1 < fwd3;

  const loopKeys: string[] = [];
  for (let s = 0; s < n; s++) {
    const idx = forward ? (i0 + s) % n : (i0 - s + n * 2) % n;
    loopKeys.push(loopKeysRaw[idx]);
  }
  const loop = loopKeys.map((k) => coord.get(k)!);
  const cum: number[] = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + dist(loop[i - 1], loop[i]));
  const totalLen = cum[n - 1] + dist(loop[n - 1], loop[0]);
  return { loop, loopKeys, cum, totalLen };
}

/** Distance from p to segment ab. */
export function pointSegDist(p: Pt, a: Pt, b: Pt): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const c1 = vx * wx + vy * wy;
  const c2 = vx * vx + vy * vy;
  const t = c2 > 0 ? Math.max(0, Math.min(1, c1 / c2)) : 0;
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

export interface BoundaryDot {
  /** welded point key */
  readonly key: string;
  readonly pt: Pt;
  /** index of the outline edge the dot lies on */
  readonly edgeIdx: number;
  /** normalized position along the whole outline in [0,1) */
  readonly s: number;
}

/**
 * Locate dots on the outline and return them sorted by canonical outline
 * position. Throws if a dot is farther than tol from every outline edge —
 * i.e. NOT on the patch boundary.
 */
export function locateOnOutline(
  outline: Outline,
  pts: readonly { key: string; pt: Pt }[],
  tol = 1e-6,
): BoundaryDot[] {
  const n = outline.loop.length;
  const dots: BoundaryDot[] = [];
  for (const { key, pt } of pts) {
    let best = -1;
    let bestD = Infinity;
    let bestT = 0;
    for (let i = 0; i < n; i++) {
      const a = outline.loop[i];
      const b = outline.loop[(i + 1) % n];
      const d = pointSegDist(pt, a, b);
      if (d < bestD) {
        bestD = d;
        best = i;
        bestT = dist(a, pt) / Math.max(dist(a, b), 1e-12);
      }
    }
    if (bestD > tol) {
      throw new Error(`dot ${key} is ${bestD.toFixed(6)} from the outline — interior endpoint!`);
    }
    const a = outline.loop[best];
    const b = outline.loop[(best + 1) % n];
    const s = (outline.cum[best] + Math.min(1, Math.max(0, bestT)) * dist(a, b)) / outline.totalLen;
    dots.push({ key, pt, edgeIdx: best, s });
  }
  dots.sort((x, y) => x.s - y.s);
  return dots;
}

/** Tail endpooints (degree-1 welded points) of a trace. */
export function endpointsOf(trace: IndexedTrace): { key: string; pt: Pt }[] {
  const out: { key: string; pt: Pt }[] = [];
  for (const [k, d] of trace.degree) {
    if (d === 1) out.push({ key: k, pt: trace.coords.get(k)! });
  }
  return out;
}

/** Sorted tail lengths (descending), as segment counts. */
export function tailLengths(trace: IndexedTrace): number[] {
  return trace.tails.map((t) => t.segIdxs.length).sort((a, b) => b - a);
}

export function fmtHist(lengths: readonly number[]): string {
  const m = new Map<number, number>();
  for (const l of lengths) m.set(l, (m.get(l) ?? 0) + 1);
  return [...m.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([l, c]) => (c === 1 ? `${l}` : `${l}x${c}`))
    .join(', ');
}
